import { z } from "zod";
import { allowedCategories } from "@/lib/copies";

export const addMemoryInputSchema = z.object({
  question: z.string().optional(),
  answer: z.string(),
  category: z.enum(allowedCategories).default("general"),
  tags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.8),
});

export const updateMemoryInputSchema = z.object({
  id: z.uuid({
    version: "v7",
  }),
  updates: z
    .object({
      question: z.string().optional(),
      answer: z.string().optional(),
      category: z.enum(allowedCategories).optional(),
      tags: z.array(z.string()).optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
    .partial(),
});

export const deleteMemoryInputSchema = z.object({
  id: z.uuid({
    version: "v7",
  }),
});

export const importCsvInputSchema = z.object({
  csv: z.string(),
});
