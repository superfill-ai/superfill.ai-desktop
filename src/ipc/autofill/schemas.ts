import { z } from "zod";

export const startAutofillInputSchema = z.object({
  url: z.url("Please enter a valid URL"),
});

export const autofillProgressSchema = z.object({
  state: z.enum([
    "idle",
    "detecting",
    "analyzing",
    "matching",
    "showing-preview",
    "filling",
    "completed",
    "failed",
  ]),
  message: z.string(),
  fieldsDetected: z.number().optional(),
  fieldsMatched: z.number().optional(),
  error: z.string().optional(),
});

export const autofillResultSchema = z.object({
  success: z.boolean(),
  mappings: z.array(
    z.object({
      fieldOpid: z.string(),
      value: z.string().nullable(),
      confidence: z.number(),
      reasoning: z.string(),
    }),
  ),
  error: z.string().optional(),
  processingTime: z.number().optional(),
});
