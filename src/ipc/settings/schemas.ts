import { z } from "zod";

export const setAISettingsInputSchema = z.object({
  settings: z.object({
    selectedProvider: z.string().optional(),
    selectedModels: z.record(z.string(), z.string()).optional(),
    autoFillEnabled: z.boolean(),
    autopilotMode: z.boolean(),
    confidenceThreshold: z.number().min(0).max(1),
    contextMenuEnabled: z.boolean(),
  }),
});

export const setUISettingsInputSchema = z.object({
  settings: z.object({
    theme: z.string(),
    onboardingCompleted: z.boolean(),
    extensionVersion: z.string().optional(),
    completedTours: z.array(z.string()).optional(),
    lastTourCompletedAt: z.string().optional(),
    rightClickGuideSnoozedUntil: z.string().optional(),
    rightClickGuideDismissed: z.boolean().optional(),
  }),
});

export const setBrowserSettingsInputSchema = z.object({
  settings: z.object({
    preferredBrowser: z.enum(["auto", "chrome", "edge", "brave", "chromium"]),
    persistProfile: z.boolean(),
  }),
});
