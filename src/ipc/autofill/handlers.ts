import { os } from "@orpc/server";
import {
  detectInstalledBrowsers,
  findBrowserExecutable,
  getUserDataDir,
} from "@/lib/autofill/browser-paths";
import {
  type AutofillResult,
  type BrowserLaunchOptions,
  StagehandEngine,
} from "@/lib/autofill/stagehand-engine";
import { createLogger } from "@/lib/logger";
import type { AIProvider } from "@/lib/providers/registry";
import { getKey } from "@/lib/storage/key-vault";
import { getAllMemories } from "@/lib/storage/memories-store";
import {
  getAISettings,
  getBrowserSettings,
} from "@/lib/storage/settings-store";
import type { BrowserType } from "@/types/settings";
import { startAutofillInputSchema } from "./schemas";

const logger = createLogger("ipc:autofill");

let activeEngine: StagehandEngine | null = null;

function resolveBrowserExecutable(
  preferred: BrowserType | "auto",
): string | undefined {
  if (preferred !== "auto") {
    return findBrowserExecutable(preferred);
  }

  const installed = detectInstalledBrowsers();
  if (installed.length > 0) {
    logger.info(`Auto-detected browser: ${installed[0].label}`);
    return installed[0].executablePath;
  }

  return undefined;
}

export const startAutofill = os
  .input(startAutofillInputSchema)
  .handler(async ({ input }): Promise<AutofillResult> => {
    const { url } = input;

    const aiSettings = await getAISettings();
    const provider = aiSettings.selectedProvider;

    if (!provider) {
      return {
        success: false,
        filledFields: [],
        totalFieldsFound: 0,
        error:
          "No AI provider selected. Go to Settings → Providers and configure one first.",
      };
    }

    const apiKey = await getKey(provider as AIProvider);

    if (!apiKey && provider !== "ollama") {
      return {
        success: false,
        filledFields: [],
        totalFieldsFound: 0,
        error: `No API key stored for ${provider}. Go to Settings → Providers to add one.`,
      };
    }

    const modelName =
      aiSettings.selectedModels?.[provider as AIProvider] ?? undefined;
    const memories = await getAllMemories();

    if (memories.length === 0) {
      return {
        success: false,
        filledFields: [],
        totalFieldsFound: 0,
        error:
          "No memories stored yet. Go to Memories and add some personal data first.",
      };
    }

    const browserSettings = await getBrowserSettings();
    const executablePath = resolveBrowserExecutable(
      browserSettings.preferredBrowser,
    );

    const browserOptions: BrowserLaunchOptions = {};

    if (executablePath) {
      browserOptions.executablePath = executablePath;
    }

    if (browserSettings.persistProfile) {
      browserOptions.userDataDir = getUserDataDir();
      browserOptions.preserveUserDataDir = true;
    }

    logger.info(
      `Starting autofill for ${url} with provider=${provider} model=${modelName ?? "default"} browser=${executablePath ?? "bundled-chromium"}`,
    );

    if (activeEngine) {
      try {
        await activeEngine.close();
      } catch {
        /* best effort */
      }
    }

    const engine = new StagehandEngine((progress) => {
      logger.info(`[progress] ${progress.state}: ${progress.message}`);
    });
    activeEngine = engine;

    try {
      await engine.launch(
        provider as AIProvider,
        apiKey ?? "",
        modelName,
        browserOptions,
      );
      const result = await engine.runAutofill(url, memories);
      return result;
    } finally {
      await engine.close();
      activeEngine = null;
    }
  });

export const stopAutofill = os.handler(async () => {
  if (activeEngine) {
    logger.info("Stopping active autofill engine");
    await activeEngine.close();
    activeEngine = null;
    return { stopped: true };
  }
  return { stopped: false };
});
