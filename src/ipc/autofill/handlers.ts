import { os } from "@orpc/server";
import { StagehandEngine } from "@/lib/autofill/stagehand-engine";
import { getKey } from "@/lib/storage/key-vault";
import { getAllMemories } from "@/lib/storage/memories-store";
import { getAISettings } from "@/lib/storage/settings-store";
import { createLogger } from "@/lib/logger";
import type { AIProvider } from "@/lib/providers/registry";
import type { AutofillResult } from "@/types/autofill";
import { startAutofillInputSchema } from "./schemas";

const logger = createLogger("ipc:autofill");

let activeEngine: StagehandEngine | null = null;

export const startAutofill = os
  .input(startAutofillInputSchema)
  .handler(async ({ input }): Promise<AutofillResult> => {
    const { url } = input;

    const aiSettings = await getAISettings();
    const provider = aiSettings.selectedProvider;

    if (!provider) {
      return {
        success: false,
        mappings: [],
        error:
          "No AI provider selected. Go to Settings → Providers and configure one first.",
      };
    }

    const apiKey = await getKey(provider as AIProvider);

    if (!apiKey && provider !== "ollama") {
      return {
        success: false,
        mappings: [],
        error: `No API key stored for ${provider}. Go to Settings → Providers to add one.`,
      };
    }

    const modelName =
      aiSettings.selectedModels?.[provider as AIProvider] ?? undefined;
    const memories = await getAllMemories();

    if (memories.length === 0) {
      return {
        success: false,
        mappings: [],
        error:
          "No memories stored yet. Go to Memories and add some personal data first.",
      };
    }

    logger.info(
      `Starting autofill for ${url} with provider=${provider} model=${modelName ?? "default"}`,
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
      const result = await engine.runAutofill(
        url,
        memories,
        provider as AIProvider,
        apiKey ?? "",
        modelName,
      );
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
