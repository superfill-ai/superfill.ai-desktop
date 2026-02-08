import { STORAGE_FILES } from "@/constants";
import { createLogger } from "@/lib/logger";
import { readFromStore, writeToStore } from "@/lib/storage/file-store";
import type { AISettings, UISettings } from "@/types/settings";
import { Theme } from "@/types/theme";

const logger = createLogger("storage:settings");

const AI_SETTINGS_FALLBACK: AISettings = {
    autoFillEnabled: true,
    autopilotMode: false,
    confidenceThreshold: 0.6,
    contextMenuEnabled: true,
};

const UI_SETTINGS_FALLBACK: UISettings = {
    theme: Theme.DEFAULT,
    onboardingCompleted: false,
    extensionVersion: "0.0.0",
    completedTours: [],
    lastTourCompletedAt: undefined,
    rightClickGuideSnoozedUntil: undefined,
    rightClickGuideDismissed: false,
};

export async function getAISettings(): Promise<AISettings> {
    return readFromStore<AISettings>(
        STORAGE_FILES.AI_SETTINGS,
        AI_SETTINGS_FALLBACK,
    );
}

export async function setAISettings(settings: AISettings): Promise<void> {
    logger.debug("Persisting AI settings", settings);
    await writeToStore(STORAGE_FILES.AI_SETTINGS, settings);
}

export async function getUISettings(): Promise<UISettings> {
    return readFromStore<UISettings>(
        STORAGE_FILES.UI_SETTINGS,
        UI_SETTINGS_FALLBACK,
    );
}

export async function setUISettings(settings: UISettings): Promise<void> {
    logger.debug("Persisting UI settings", settings);
    await writeToStore(STORAGE_FILES.UI_SETTINGS, settings);
}
