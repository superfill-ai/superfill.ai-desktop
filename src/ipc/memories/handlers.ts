import { os } from "@orpc/server";
import {
  addMemories,
  addMemory,
  deleteMemory,
  exportMemoriesToCSV,
  getAllMemories,
  importMemoriesFromCSV,
  updateMemory,
} from "@/lib/storage/memories-store";
import type { MemoryEntry } from "@/types/memory";
import {
  addMemoryInputSchema,
  deleteMemoryInputSchema,
  importCsvInputSchema,
  updateMemoryInputSchema,
} from "./schemas";

export const listMemories = os.handler((): Promise<MemoryEntry[]> => {
  return getAllMemories();
});

export const createMemory = os
  .input(addMemoryInputSchema)
  .handler(({ input }) => {
    return addMemory({
      question: input.question,
      answer: input.answer,
      category: input.category,
      tags: input.tags,
      confidence: input.confidence,
    });
  });

export const bulkCreateMemories = os
  .input(addMemoryInputSchema.array())
  .handler(({ input }) => {
    return addMemories(
      input.map((entry) => ({
        ...entry,
      })),
    );
  });

export const editMemory = os
  .input(updateMemoryInputSchema)
  .handler(({ input }) => {
    return updateMemory(input.id, input.updates);
  });

export const removeMemory = os
  .input(deleteMemoryInputSchema)
  .handler(async ({ input }) => {
    await deleteMemory(input.id);
  });

export const exportMemories = os.handler(() => {
  return exportMemoriesToCSV();
});

export const importMemories = os
  .input(importCsvInputSchema)
  .handler(({ input }) => {
    return importMemoriesFromCSV(input.csv);
  });
