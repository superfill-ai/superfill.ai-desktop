import { os } from "@orpc/server";
import { getAISettings, getUISettings, setAISettings, setUISettings } from "@/lib/storage/settings-store";
import type { AISettings, UISettings } from "@/types/settings";
import { setAISettingsInputSchema, setUISettingsInputSchema } from "./schemas";

export const readAISettings = os.handler(async (): Promise<AISettings> => {
    return getAISettings();
});

export const writeAISettings = os
    .input(setAISettingsInputSchema)
    .handler(async ({ input }) => {
        await setAISettings(input.settings as AISettings);
        return getAISettings();
    });

export const readUISettings = os.handler(async (): Promise<UISettings> => {
    return getUISettings();
});

export const writeUISettings = os
    .input(setUISettingsInputSchema)
    .handler(async ({ input }) => {
        await setUISettings(input.settings as UISettings);
        return getUISettings();
    });
