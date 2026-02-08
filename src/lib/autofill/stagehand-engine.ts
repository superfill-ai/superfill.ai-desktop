import { type LogLine, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import type { AIProvider } from "@/lib/providers/registry";
import type { MemoryEntry } from "@/types/memory";

const logger = createLogger("stagehand-engine");

const STAGEHAND_ENV_KEYS: Partial<Record<AIProvider, string>> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GOOGLE_API_KEY",
  groq: "GROQ_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  ollama: "OLLAMA_BASE_URL",
};

const STAGEHAND_PROVIDER_PREFIX: Record<AIProvider, string> = {
  openai: "openai",
  anthropic: "anthropic",
  gemini: "google",
  groq: "groq",
  deepseek: "deepseek",
  ollama: "ollama",
};

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
  gemini: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
  deepseek: "deepseek-chat",
  ollama: "llama3.1",
};

function resolveStagehandModel(
  provider: AIProvider,
  modelName?: string,
): string {
  const prefix = STAGEHAND_PROVIDER_PREFIX[provider];

  if (modelName) {
    if (modelName.includes("/")) {
      return modelName;
    }
    return `${prefix}/${modelName}`;
  }

  const defaultModel = DEFAULT_MODELS[provider];
  return `${prefix}/${defaultModel}`;
}

function setProviderEnvKey(provider: AIProvider, apiKey: string): void {
  const envVar = STAGEHAND_ENV_KEYS[provider];
  if (envVar && apiKey) {
    process.env[envVar] = apiKey;
  }
}

export interface FilledField {
  label: string;
  value: string;
  fieldType?: string;
}

export interface AutofillResult {
  success: boolean;
  filledFields: FilledField[];
  totalFieldsFound: number;
  message?: string;
  error?: string;
  processingTime?: number;
}

export type AutofillProgressState =
  | "idle"
  | "launching"
  | "navigating"
  | "observing"
  | "filling"
  | "extracting"
  | "completed"
  | "failed";

export interface AutofillProgress {
  state: AutofillProgressState;
  message: string;
}

export type ProgressCallback = (progress: AutofillProgress) => void;

function formatMemoriesForPrompt(memories: MemoryEntry[]): string {
  const grouped = new Map<string, MemoryEntry[]>();
  for (const m of memories) {
    const cat = m.category;
    if (!grouped.has(cat)) {
      grouped.set(cat, []);
    }

    const arr = grouped.get(cat);

    if (arr) {
      arr.push(m);
    }
  }

  const lines: string[] = ["## User's Personal Data\n"];
  for (const [category, entries] of grouped) {
    lines.push(`### ${category}`);
    for (const entry of entries) {
      if (entry.question) {
        lines.push(`- ${entry.question}: ${entry.answer}`);
      } else {
        lines.push(`- ${entry.answer}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

const FilledFieldsSchema = z.object({
  fields: z.array(
    z.object({
      label: z
        .string()
        .describe("The visible label or description of the field"),
      value: z.string().describe("The current value entered in the field"),
      fieldType: z
        .string()
        .optional()
        .describe("The type of field (text, email, select, etc.)"),
    }),
  ),
});

export interface BrowserLaunchOptions {
  executablePath?: string;
  userDataDir?: string;
  preserveUserDataDir?: boolean;
}

export class StagehandEngine {
  private stagehand: InstanceType<typeof Stagehand> | null = null;
  private readonly onProgress: ProgressCallback;
  private aborted = false;

  constructor(onProgress?: ProgressCallback) {
    this.onProgress =
      onProgress ??
      (() => {
        /* noop */
      });
  }

  async launch(
    provider: AIProvider,
    apiKey: string,
    modelName?: string,
    browserOptions?: BrowserLaunchOptions,
  ): Promise<void> {
    try {
      logger.info("Launching Stagehand (LOCAL headed browser)");
      this.emitProgress("launching", "Launching browser…");

      setProviderEnvKey(provider, apiKey);
      const model = resolveStagehandModel(provider, modelName);

      logger.info(`Using provider: ${provider}, model: ${model}`);

      const localBrowserLaunchOptions: Record<string, unknown> = {
        headless: false,
        viewport: { width: 1440, height: 900 },
      };

      if (browserOptions?.executablePath) {
        localBrowserLaunchOptions.executablePath =
          browserOptions.executablePath;
        logger.info(
          `Using browser executable: ${browserOptions.executablePath}`,
        );
      }

      if (browserOptions?.userDataDir) {
        localBrowserLaunchOptions.userDataDir = browserOptions.userDataDir;
        localBrowserLaunchOptions.preserveUserDataDir =
          browserOptions.preserveUserDataDir ?? true;
        logger.info(`Using user data dir: ${browserOptions.userDataDir}`);
      }

      logger.info("Creating Stagehand instance...");
      this.stagehand = new Stagehand({
        env: "LOCAL",
        model,
        localBrowserLaunchOptions,
        selfHeal: true,
        disablePino: true,
        logger: (line: LogLine) => {
          if (line.level === 0) {
            logger.error(line.message);
          } else if (line.level === 1) {
            logger.info(line.message);
          } else {
            logger.debug(line.message);
          }
        },
      });

      try {
        logger.info("Initializing Stagehand...");
        await this.stagehand.init();
        logger.info(`Stagehand launched with model: ${model}`);
      } catch (error) {
        logger.error("Failed to initialize Stagehand:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to initialize Stagehand: ${errorMessage}`);
      }
    } catch (error) {
      logger.error("Failed to launch Stagehand:", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    this.aborted = true;
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
  ): Promise<AutofillResult> {
    const startTime = performance.now();

    try {
      const sh = this.requireStagehand();

      this.emitProgress("navigating", `Navigating to ${url}…`);
      const page = sh.context.pages()[0];
      if (!page) {
        throw new Error("No page available in Stagehand context");
      }
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await new Promise((r) => setTimeout(r, 2000));
      if (this.aborted) {
        return this.abortedResult(startTime);
      }

      this.emitProgress("observing", "Discovering form fields…");
      const observedFields = await sh.observe(
        "Find all visible, interactive form fields on this page including text inputs, email inputs, phone inputs, textareas, dropdowns/selects, checkboxes, date pickers, and radio buttons. Exclude hidden fields and submit/cancel buttons.",
      );
      const totalFields = observedFields.length;
      logger.info(`Observed ${totalFields} form fields`);

      if (totalFields === 0) {
        this.emitProgress("failed", "No form fields found on this page.");
        return {
          success: false,
          filledFields: [],
          totalFieldsFound: 0,
          error: "No form fields detected on the page",
          processingTime: performance.now() - startTime,
        };
      }
      if (this.aborted) {
        return this.abortedResult(startTime);
      }

      this.emitProgress(
        "filling",
        `Filling ${totalFields} form fields with your data…`,
      );
      const memoryContext = formatMemoriesForPrompt(memories);

      let filledFields: FilledField[];
      try {
        filledFields = await this.fillWithAgent(memoryContext);
      } catch (agentErr) {
        logger.warn(
          "Agent strategy failed, trying observe+act fallback:",
          agentErr,
        );
        filledFields = await this.fillWithObserveAct(memories);
      }
      if (this.aborted) {
        return this.abortedResult(startTime);
      }

      if (filledFields.length === 0) {
        this.emitProgress("extracting", "Verifying filled fields…");
        filledFields = await this.extractFilledFields();
      }

      const elapsed = performance.now() - startTime;
      this.emitProgress(
        "completed",
        `Done — filled ${filledFields.length} of ${totalFields} fields in ${(elapsed / 1000).toFixed(1)}s`,
      );

      return {
        success: true,
        filledFields,
        totalFieldsFound: totalFields,
        processingTime: elapsed,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Autofill pipeline failed:", error);
      this.emitProgress("failed", `Error: ${msg}`);
      return {
        success: false,
        filledFields: [],
        totalFieldsFound: 0,
        error: msg,
        processingTime: performance.now() - startTime,
      };
    }
  }

  private async fillWithAgent(memoryContext: string): Promise<FilledField[]> {
    const sh = this.requireStagehand();

    const systemPrompt = `You are an expert form-filling assistant. Use the following personal data to fill out forms accurately.

${memoryContext}

Rules:
- Only fill fields where you have matching personal data
- Do NOT fabricate or invent any information
- Do NOT fill password fields
- For dropdowns/selects, choose the closest matching option
- For checkboxes, check them only if clearly appropriate
- If a field asks for part of compound data (e.g. "First Name" from a full name), extract just that part
- If multiple memories could match, pick the most relevant one
- If no data matches a field, leave it empty
- Do NOT submit the form`;

    const agent = sh.agent({
      systemPrompt,
    });

    const result = await agent.execute(
      "Fill out all the form fields on this page using the personal data provided. Fill every field where you have matching data. Do not submit the form.",
    );

    logger.info("Agent completed:", JSON.stringify(result));

    return await this.extractFilledFields();
  }

  private async fillWithObserveAct(
    memories: MemoryEntry[],
  ): Promise<FilledField[]> {
    const sh = this.requireStagehand();
    const filled: FilledField[] = [];

    for (const memory of memories) {
      if (this.aborted) {
        break;
      }

      const label = memory.question || memory.category;

      try {
        const result = await sh.act(
          `Find a form field that asks for "${label}" and type %value% into it. If no matching field exists, do nothing.`,
          { variables: { value: memory.answer } },
        );

        if (result.success) {
          filled.push({ label, value: memory.answer });
        }
      } catch {
        logger.debug(`No matching field for memory: ${label}`);
      }
    }

    return filled.length > 0 ? await this.extractFilledFields() : filled;
  }

  private async extractFilledFields(): Promise<FilledField[]> {
    const sh = this.requireStagehand();
    try {
      const result = await sh.extract(
        "Extract all form fields that currently have a non-empty value. For each, give the visible label and the current value.",
        FilledFieldsSchema,
      );
      return result.fields;
    } catch (err) {
      logger.warn("Failed to extract filled fields:", err);
      return [];
    }
  }

  private requireStagehand(): InstanceType<typeof Stagehand> {
    if (!this.stagehand) {
      throw new Error("Stagehand not launched. Call launch() first.");
    }
    return this.stagehand;
  }

  private emitProgress(state: AutofillProgressState, message: string): void {
    this.onProgress({ state, message });
    logger.info(`[${state}] ${message}`);
  }

  private abortedResult(startTime: number): AutofillResult {
    return {
      success: false,
      filledFields: [],
      totalFieldsFound: 0,
      error: "Autofill was stopped",
      processingTime: performance.now() - startTime,
    };
  }
}
