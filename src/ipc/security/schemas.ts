import { z } from "zod";

const providerEnum = z.enum([
    "openai",
    "anthropic",
    "groq",
    "deepseek",
    "gemini",
    "ollama",
]);

export const storeKeyInputSchema = z.object({
    provider: providerEnum,
    apiKey: z.string(),
});

export const getKeyInputSchema = z.object({
    provider: providerEnum,
});

export const deleteKeyInputSchema = z.object({
    provider: providerEnum,
});
