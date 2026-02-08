import { z } from "zod";

export const addMemoryInputSchema = z.object({
    question: z.string().optional(),
    answer: z.string(),
    category: z.string().default("general"),
    tags: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(1).default(0.8),
});

export const updateMemoryInputSchema = z.object({
    id: z.string().uuid(),
    updates: z
        .object({
            question: z.string().optional(),
            answer: z.string().optional(),
            category: z.string().optional(),
            tags: z.array(z.string()).optional(),
            confidence: z.number().min(0).max(1).optional(),
        })
        .partial(),
});

export const deleteMemoryInputSchema = z.object({
    id: z.string().uuid(),
});

export const importCsvInputSchema = z.object({
    csv: z.string(),
});
