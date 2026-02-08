import { os } from "@orpc/server";
import type { AIProvider } from "@/lib/providers/registry";
import { deleteKey, getKey, hasKey, storeKey } from "@/lib/storage/key-vault";
import { deleteKeyInputSchema, getKeyInputSchema, storeKeyInputSchema } from "./schemas";

export const saveProviderKey = os
    .input(storeKeyInputSchema)
    .handler(async ({ input }) => {
        await storeKey(input.provider as AIProvider, input.apiKey);
        return true;
    });

export const readProviderKey = os
    .input(getKeyInputSchema)
    .handler(async ({ input }) => {
        return getKey(input.provider as AIProvider);
    });

export const removeProviderKey = os
    .input(deleteKeyInputSchema)
    .handler(async ({ input }) => {
        await deleteKey(input.provider as AIProvider);
        return true;
    });

export const checkProviderKey = os
    .input(getKeyInputSchema)
    .handler(async ({ input }) => {
        return hasKey(input.provider as AIProvider);
    });
