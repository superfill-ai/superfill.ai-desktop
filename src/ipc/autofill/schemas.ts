import { z } from "zod";

export const startAutofillInputSchema = z.object({
  url: z.url("Please enter a valid URL"),
});

export const filledFieldSchema = z.object({
  label: z.string(),
  value: z.string(),
  fieldType: z.string().optional(),
});

export const autofillResultSchema = z.object({
  success: z.boolean(),
  filledFields: z.array(filledFieldSchema),
  totalFieldsFound: z.number(),
  message: z.string().optional(),
  error: z.string().optional(),
  processingTime: z.number().optional(),
});
