import { generateObject } from "ai";
import { z } from "zod";
import { getAIModel } from "@/lib/ai/model-factory";
import { createLogger } from "@/lib/logger";
import type { AIProvider } from "@/lib/providers/registry";
import type {
  CompressedFieldData,
  CompressedMemoryData,
  FieldMapping,
} from "@/types/autofill";
import type { WebsiteContext } from "@/types/context";
import { FallbackMatcher } from "./fallback-matcher";
import { createEmptyMapping, roundConfidence } from "./mapping-utils";

const logger = createLogger("ai-matcher");

const AIMatchSchema = z.object({
  highlightIndex: z
    .number()
    .describe("The highlight index [N] of the field being matched"),
  value: z
    .string()
    .nullable()
    .describe(
      "The answer to fill into the field. This can be from a memory, combined from multiple memories, or rephrased. Null if no suitable answer is found. For select fields, MUST be an exact option value.",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score for this match (0-1)"),
  reasoning: z
    .string()
    .describe("Explanation of why this memory was selected or rejected"),
});

const AIBatchMatchSchema = z.object({
  matches: z.array(AIMatchSchema).describe("Array of field-to-memory matches"),
  reasoning: z
    .string()
    .optional()
    .describe("Overall reasoning about the matching strategy used"),
});

type AIBatchMatchResult = z.infer<typeof AIBatchMatchSchema>;

export class AIMatcher {
  private fallbackMatcher: FallbackMatcher;

  constructor() {
    this.fallbackMatcher = new FallbackMatcher();
  }

  async matchFields(
    fields: CompressedFieldData[],
    memories: CompressedMemoryData[],
    websiteContext: WebsiteContext,
    provider: AIProvider,
    apiKey: string,
    modelName?: string,
  ): Promise<FieldMapping[]> {
    if (fields.length === 0) {
      logger.info("No fields to match");
      return [];
    }

    if (memories.length === 0) {
      logger.info("No memories available for matching");
      return fields.map((field) =>
        createEmptyMapping<CompressedFieldData, FieldMapping>(
          field,
          "No memories available",
        ),
      );
    }

    try {
      const startTime = performance.now();
      const aiResults = await this.performAIMatching(
        fields,
        memories,
        websiteContext,
        provider,
        apiKey,
        modelName,
      );
      const mappings = this.convertAIResultsToMappings(aiResults, fields);

      const elapsed = performance.now() - startTime;
      logger.info(
        `AI matching completed in ${elapsed.toFixed(2)}ms for ${fields.length} fields`,
      );

      return mappings;
    } catch (error) {
      logger.error("AI matching failed, falling back to rule-based:", error);
      return await this.fallbackMatcher.matchFields(fields, memories);
    }
  }

  private async performAIMatching(
    fields: CompressedFieldData[],
    memories: CompressedMemoryData[],
    websiteContext: WebsiteContext,
    provider: AIProvider,
    apiKey: string,
    modelName?: string,
  ): Promise<AIBatchMatchResult> {
    const model = getAIModel(provider, apiKey, modelName);

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      fields,
      memories,
      websiteContext,
    );

    logger.info(`AI matching with ${provider} for ${fields.length} fields`);

    const result = await generateObject({
      model,
      schema: AIBatchMatchSchema,
      schemaName: "FieldMemoryMatches",
      schemaDescription:
        "Mapping of form fields to stored memory entries based on semantic similarity",
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
    });

    return result.object;
  }

  buildSystemPrompt(): string {
    return `You are an expert form-filling assistant that matches form fields to stored user memories.
Your task is to analyze form fields and determine which stored memory entry (or entries) best matches each field.

Matching Criteria:
1. **Semantic Similarity**: The field's purpose should align with the memory's content
2. **Context Alignment**: Field labels, placeholders, and helper text should relate to the memory's question/category
3. **Type Compatibility**: Email fields need email memories, phone fields need phone memories, etc.
4. **Confidence Scoring**: Only suggest matches you're confident about (0.5+ confidence)
5. **Website Context is KING**: The website's type and purpose heavily influence the meaning of a field.

## SELECT FIELDS (Dropdowns)
For select/dropdown fields, you MUST:
- Return a value that EXACTLY matches one of the provided options
- Match the user's memory to the closest option semantically
- If no option matches well, set the value to null

Important Rules:
1. **ALWAYS USE MEMORIES**: If a user has stored a memory that matches the field, USE IT. The whole point is to fill forms with user's stored data.
2. **DERIVE FROM MEMORIES**: You can extract parts from stored memories (e.g., first name from full name, city from full address).
3. **Matching**: Set 'value' to null ONLY if no memory matches AND the data cannot be derived from existing memories.
4. **NEVER** match password fields
5. **Handle Compound Data - SPLITTING**: For data like names or addresses, analyze the field's purpose. If the original answer is a full name and the field asks for a specific part, extract only that part.
6. **Handle Compound Data - COMBINING**: For compound fields (e.g., 'Full Name', 'Complete Address'), combine multiple related memories intelligently.
7. **EXACT OPTION MATCHING**: For select fields, ALWAYS return an exact option value from the provided options list.

### When NO relevant memory exists:
Do NOT invent data - return null instead. Never fabricate personal information, dates, numbers, or unique identifiers.
BUT if a memory exists that contains this information (even partially), USE IT or DERIVE from it.

Output Format:
- Return an array of matches, one per field
- Include confidence scores (0-1) for match quality
- Explain your reasoning concisely
- For select fields, ALWAYS return exact option values`;
  }

  private buildUserPrompt(
    fields: CompressedFieldData[],
    memories: CompressedMemoryData[],
    websiteContext: WebsiteContext,
  ): string {
    const fieldsMarkdown = fields
      .filter((f) => f.highlightIndex !== null)
      .map((f) => {
        const parts = [
          `**[${f.highlightIndex}]**`,
          `- type: ${f.type}`,
          `- purpose: ${f.purpose}`,
          `- labels: ${f.labels.length > 0 ? f.labels.join(", ") : "none"}`,
          `- context: ${f.context || "none"}`,
        ];

        if (f.options && f.options.length > 0) {
          const optionsList = f.options
            .map(
              (opt) =>
                `"${opt.value}"${opt.label ? ` (${opt.label})` : ""}`,
            )
            .join(", ");
          parts.push(`- options: [${optionsList}]`);
        }

        return parts.join("\n          ");
      })
      .join("\n");

    const memoriesMarkdown = memories
      .map(
        (m, idx) =>
          `**Memory ${idx + 1}**
          - question: ${m.question || "none"}
          - answer: ${m.answer}
          - category: ${m.category}`,
      )
      .join("\n");

    const contextMarkdown = `
**Website Type**: ${websiteContext.websiteType}
**Inferred Form Purpose**: ${websiteContext.formPurpose}
**Page Title**: ${websiteContext.metadata.title}`;

    return `Based on the following website context, match the form fields to the best stored memories.

## Website Context
${contextMarkdown}

## Form Fields
${fieldsMarkdown}

## Available Memories
${memoriesMarkdown}

For each field, determine:
1. Which memory (if any) is the best match
2. Your confidence in that match (0-1)
3. Why you chose that memory (or why no memory fits)
4. The answer in the 'value' field

**CRITICAL for select fields**: Return EXACT option values from the provided lists, or null if no suitable option is found.`;
  }

  private convertAIResultsToMappings(
    aiResults: AIBatchMatchResult,
    fields: CompressedFieldData[],
  ): FieldMapping[] {
    const fieldByIndex = new Map(
      fields
        .filter((f) => f.highlightIndex !== null)
        .map((f) => [f.highlightIndex as number, f]),
    );

    return aiResults.matches.map((aiMatch) => {
      const field = fieldByIndex.get(aiMatch.highlightIndex);
      if (!field) {
        logger.warn(
          `AI returned match for unknown highlight index: [${aiMatch.highlightIndex}]`,
        );
        return createEmptyMapping<{ opid: string }, FieldMapping>(
          { opid: `__${aiMatch.highlightIndex}` },
          "Field not found",
        );
      }

      const confidence = roundConfidence(aiMatch.confidence);
      const value = aiMatch.value;

      return {
        fieldOpid: field.opid,
        value,
        confidence,
        reasoning:
          aiMatch.reasoning ||
          "AI-powered semantic match and value generation.",
      };
    });
  }
}
