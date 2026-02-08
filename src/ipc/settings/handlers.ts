import { os } from "@orpc/server";
import { detectInstalledBrowsers } from "@/lib/autofill/browser-paths";
import {
  getAISettings,
  getBrowserSettings,
  getUISettings,
  setAISettings,
  setBrowserSettings,
  setUISettings,
} from "@/lib/storage/settings-store";
import type { AISettings, BrowserSettings, UISettings } from "@/types/settings";
import {
  setAISettingsInputSchema,
  setBrowserSettingsInputSchema,
  setUISettingsInputSchema,
} from "./schemas";

export const readAISettings = os.handler((): Promise<AISettings> => {
  return getAISettings();
});

export const writeAISettings = os
  .input(setAISettingsInputSchema)
  .handler(async ({ input }) => {
    await setAISettings(input.settings as AISettings);
    return getAISettings();
  });

export const readUISettings = os.handler((): Promise<UISettings> => {
  return getUISettings();
});

export const writeUISettings = os
  .input(setUISettingsInputSchema)
  .handler(async ({ input }) => {
    await setUISettings(input.settings as UISettings);
    return getUISettings();
  });

export const readBrowserSettings = os.handler((): Promise<BrowserSettings> => {
  return getBrowserSettings();
});

export const writeBrowserSettings = os
  .input(setBrowserSettingsInputSchema)
  .handler(async ({ input }) => {
    await setBrowserSettings(input.settings as BrowserSettings);
    return getBrowserSettings();
  });

export const getInstalledBrowsers = os.handler(() => {
  return detectInstalledBrowsers();
});
