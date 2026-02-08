import { Stagehand, type LogLine } from "@browserbasehq/stagehand";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { getAIModel } from "@/lib/ai/model-factory";
import type { AIProvider } from "@/lib/providers/registry";
import type {
  AutofillProgress,
  AutofillResult,
  CompressedFieldData,
  CompressedMemoryData,
  FieldMapping,
  FieldPurpose,
  FieldType,
  SelectOptionSnapshot,
} from "@/types/autofill";
import type { WebsiteContext, WebsiteType } from "@/types/context";
import type { MemoryEntry } from "@/types/memory";
import { AIMatcher } from "./ai-matcher";
import { FallbackMatcher } from "./fallback-matcher";
import { MAX_FIELDS_PER_PAGE, MAX_MEMORIES_FOR_MATCHING, MIN_MATCH_CONFIDENCE } from "./constants";

const logger = createLogger("stagehand-engine");

const ExtractedFieldSchema = z.object({
  selector: z.string().describe("A unique CSS selector for this form field"),
  type: z
    .enum([
      "text",
      "email",
      "tel",
      "url",
      "textarea",
      "select",
      "checkbox",
      "date",
      "number",
      "password",
    ])
    .describe("The input type"),
  label: z.string().nullable().describe("The visible label text for this field"),
  placeholder: z
    .string()
    .nullable()
    .describe("The placeholder text if any"),
  name: z.string().nullable().describe("The name attribute"),
  id: z.string().nullable().describe("The id attribute"),
  required: z.boolean().describe("Whether the field is required"),
  ariaLabel: z
    .string()
    .nullable()
    .describe("The aria-label or aria-labelledby text"),
  helperText: z
    .string()
    .nullable()
    .describe("Any helper/description text near the field"),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string().nullable(),
      }),
    )
    .nullable()
    .describe("For select fields, the list of option values and labels"),
  currentValue: z
    .string()
    .describe("The current value of the field (empty string if blank)"),
});

const ExtractedFormSchema = z.object({
  pageTitle: z.string().describe("The page title"),
  pageUrl: z.string().describe("The current page URL"),
  formPurpose: z
    .string()
    .describe(
      "A short description of what this form is for (e.g. 'job application', 'signup', 'contact form')",
    ),
  websiteType: z
    .enum([
      "job_portal",
      "social",
      "e-commerce",
      "blog",
      "forum",
      "news",
      "corporate",
      "portfolio",
      "dating",
      "rental",
      "survey",
      "unknown",
    ])
    .describe("The type of website"),
  fields: z
    .array(ExtractedFieldSchema)
    .describe("All visible, interactive form fields on the page"),
});

type ExtractedForm = z.infer<typeof ExtractedFormSchema>;
type ExtractedField = z.infer<typeof ExtractedFieldSchema>;

export type ProgressCallback = (progress: AutofillProgress) => void;

export class StagehandEngine {
  private stagehand: InstanceType<typeof Stagehand> | null = null;
  private onProgress: ProgressCallback;

  constructor(onProgress?: ProgressCallback) {
    this.onProgress = onProgress ?? (() => { });
  }

  async launch(): Promise<void> {
    logger.info("Launching Stagehand (LOCAL headed browser)");
    this.emitProgress("detecting", "Launching browser…");

    this.stagehand = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: {
        headless: false,
        viewport: { width: 1440, height: 900 },
      },
      verbose: 1,
      disablePino: true,
      logger: (line: LogLine) => {
        if (line.level === 0) logger.error(line.message);
        else if (line.level === 1) logger.info(line.message);
        else logger.debug(line.message);
      },
    });

    await this.stagehand.init();
    logger.info("Stagehand browser launched");
  }

  async close(): Promise<void> {
    if (this.stagehand) {
      try {
        await this.stagehand.close();
      } catch (err) {
        logger.warn("Error closing Stagehand:", err);
      }
      this.stagehand = null;
    }
  }

  async runAutofill(
    url: string,
    memories: MemoryEntry[],
    provider: AIProvider,
    apiKey: string,
    modelName?: string,
  ): Promise<AutofillResult> {
    const startTime = performance.now();

    try {
      await this.launch();

      this.emitProgress("detecting", `Navigating to ${url}…`);
      const extracted = await this.navigateAndExtract(url);

      if (extracted.fields.length === 0) {
        this.emitProgress("failed", "No form fields found on this page.");
        return {
          success: false,
          mappings: [],
          error: "No form fields detected on the page",
          processingTime: performance.now() - startTime,
        };
      }

      logger.info(
        `Extracted ${extracted.fields.length} fields from ${extracted.pageUrl}`,
      );
      this.emitProgress(
        "analyzing",
        `Found ${extracted.fields.length} form fields. Analyzing…`,
      );

      const compressedFields = this.compressFields(extracted.fields);
      const compressedMemories = this.compressMemories(memories);
      const websiteContext = this.buildWebsiteContext(extracted);

      this.emitProgress(
        "matching",
        `Matching ${compressedFields.length} fields to ${compressedMemories.length} memories…`,
      );

      const mappings = await this.matchFields(
        compressedFields,
        compressedMemories,
        websiteContext,
        provider,
        apiKey,
        modelName,
      );

      const fillable = mappings.filter(
        (m) => m.value !== null && m.confidence >= MIN_MATCH_CONFIDENCE,
      );
      logger.info(
        `Matched ${fillable.length}/${mappings.length} fields above threshold`,
      );

      if (fillable.length > 0) {
        this.emitProgress(
          "filling",
          `Filling ${fillable.length} fields…`,
        );
        await this.fillFields(fillable, extracted.fields);
      }

      const processingTime = performance.now() - startTime;
      this.emitProgress(
        "completed",
        `Done — filled ${fillable.length}/${mappings.length} fields in ${(processingTime / 1000).toFixed(1)}s`,
      );

      return {
        success: true,
        mappings,
        processingTime,
      };
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Autofill pipeline failed:", error);
      this.emitProgress("failed", `Error: ${msg}`);
      return {
        success: false,
        mappings: [],
        error: msg,
        processingTime: performance.now() - startTime,
      };
    }
  }

  private async navigateAndExtract(url: string): Promise<ExtractedForm> {
    const sh = this.requireStagehand();
    const page = sh.context.pages()[0];

    if (!page) {
      throw new Error("No page available in Stagehand context");
    }

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    logger.info("Extracting form fields via Stagehand…");

    const result = await sh.extract(
      "Extract all visible, interactive form fields on this page. Include text inputs, email inputs, phone inputs, textareas, selects/dropdowns, checkboxes, date pickers, and number inputs. Exclude hidden fields, submit buttons, and password fields. For select/dropdown fields, include all available options.",
      ExtractedFormSchema,
    );

    return result;
  }

  private compressFields(fields: ExtractedField[]): CompressedFieldData[] {
    return fields
      .slice(0, MAX_FIELDS_PER_PAGE)
      .filter((f) => f.type !== "password")
      .map((field, index) => {
        const labels: string[] = [];
        if (field.label) labels.push(field.label);
        if (field.ariaLabel) labels.push(field.ariaLabel);
        if (field.placeholder) labels.push(field.placeholder);

        const contextParts: string[] = [];
        if (field.name) contextParts.push(`name=${field.name}`);
        if (field.id) contextParts.push(`id=${field.id}`);
        if (field.helperText) contextParts.push(field.helperText);

        return {
          opid: field.selector,
          highlightIndex: index,
          type: field.type as FieldType,
          purpose: this.inferPurpose(field),
          labels,
          context: contextParts.join(" | "),
          options: field.options as SelectOptionSnapshot[] | undefined,
        } satisfies CompressedFieldData;
      });
  }

  private compressMemories(
    memories: MemoryEntry[],
  ): CompressedMemoryData[] {
    return memories.slice(0, MAX_MEMORIES_FOR_MATCHING).map((m) => ({
      id: m.id,
      question: m.question ?? "",
      answer: m.answer,
      category: m.category,
    }));
  }

  private buildWebsiteContext(extracted: ExtractedForm): WebsiteContext {
    return {
      metadata: {
        title: extracted.pageTitle,
        description: null,
        keywords: null,
        ogTitle: null,
        ogDescription: null,
        ogSiteName: null,
        ogType: null,
        url: extracted.pageUrl,
      },
      websiteType: extracted.websiteType as WebsiteType,
      formPurpose: extracted.formPurpose,
    };
  }

  private inferPurpose(field: ExtractedField): FieldPurpose {
    const text = [field.label, field.name, field.id, field.placeholder, field.ariaLabel]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (field.type === "email" || /email|e-mail/.test(text)) return "email";
    if (field.type === "tel" || /phone|tel|mobile|cell/.test(text)) return "phone";
    if (/company|org|employer|business/.test(text)) return "company";
    if (/title|position|role|job/.test(text)) return "title";
    if (/city|town/.test(text)) return "city";
    if (/state|province|region/.test(text)) return "state";
    if (/zip|postal|postcode/.test(text)) return "zip";
    if (/country|nation/.test(text)) return "country";
    if (/address|street|addr/.test(text)) return "address";
    if (/name|fullname|first|last|given|family/.test(text)) return "name";

    return "unknown";
  }

  private async matchFields(
    fields: CompressedFieldData[],
    memories: CompressedMemoryData[],
    websiteContext: WebsiteContext,
    provider: AIProvider,
    apiKey: string,
    modelName?: string,
  ): Promise<FieldMapping[]> {
    try {
      const aiMatcher = new AIMatcher();
      return await aiMatcher.matchFields(
        fields,
        memories,
        websiteContext,
        provider,
        apiKey,
        modelName,
      );
    } catch (error) {
      logger.warn("AI matching failed, trying fallback:", error);
      const fallback = new FallbackMatcher();
      return await fallback.matchFields(fields, memories);
    }
  }

  private async fillFields(
    mappings: FieldMapping[],
    extractedFields: ExtractedField[],
  ): Promise<void> {
    const sh = this.requireStagehand();
    const fieldBySelector = new Map(
      extractedFields.map((f) => [f.selector, f]),
    );

    let filled = 0;

    for (const mapping of mappings) {
      if (!mapping.value) continue;

      const field = fieldBySelector.get(mapping.fieldOpid);

      if (!field) {
        logger.warn(`No extracted field for selector: ${mapping.fieldOpid}`);
        continue;
      }

      try {
        const selector = mapping.fieldOpid;
        const value = mapping.value;

        if (field.type === "select") {
          await sh.act(
            `Select the option "${value}" in the dropdown/select field with selector "${selector}"`,
          );
        } else if (field.type === "checkbox") {
          const shouldCheck = ["true", "yes", "1", "on"].includes(
            value.toLowerCase(),
          );
          await sh.act(
            `${shouldCheck ? "Check" : "Uncheck"} the checkbox with selector "${selector}"`,
          );
        } else {
          await sh.act(
            `Clear and type "${value}" into the input field with selector "${selector}"`,
          );
        }

        filled++;
        logger.debug(
          `Filled field [${selector}] with value (confidence: ${mapping.confidence})`,
        );
      } catch (err) {
        logger.warn(
          `Failed to fill field [${mapping.fieldOpid}]:`,
          err,
        );
      }
    }

    logger.info(`Successfully filled ${filled}/${mappings.length} fields`);
  }

  private requireStagehand(): InstanceType<typeof Stagehand> {
    if (!this.stagehand) {
      throw new Error("Stagehand not launched. Call launch() first.");
    }
    return this.stagehand;
  }

  private emitProgress(
    state: AutofillProgress["state"],
    message: string,
    extra?: Partial<AutofillProgress>,
  ): void {
    const progress: AutofillProgress = { state, message, ...extra };
    this.onProgress(progress);
    logger.info(`[${state}] ${message}`);
  }
}
