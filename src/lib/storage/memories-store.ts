import { v7 as uuidv7 } from "uuid";
import { STORAGE_FILES } from "@/constants";
import { isAllowedCategory } from "@/lib/copies";
import { parseCSV, stringifyToCSV } from "@/lib/csv";
import { createLogger } from "@/lib/logger";
import {
  readFromStore,
  updateStore,
  writeToStore,
} from "@/lib/storage/file-store";
import type { MemoryEntry } from "@/types/memory";

const logger = createLogger("storage:memories");

export type CreateMemoryEntry = Omit<MemoryEntry, "id" | "metadata">;
export type UpdateMemoryEntry = Partial<Omit<MemoryEntry, "id" | "metadata">>;

const FALLBACK_MEMORIES: MemoryEntry[] = [];

export function getAllMemories(): Promise<MemoryEntry[]> {
  return readFromStore<MemoryEntry[]>(
    STORAGE_FILES.MEMORIES,
    FALLBACK_MEMORIES
  );
}

export async function addMemory(
  entry: CreateMemoryEntry
): Promise<MemoryEntry> {
  const newEntry: MemoryEntry = {
    ...entry,
    id: uuidv7(),
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "manual",
    },
  };

  await updateStore<MemoryEntry[]>(
    STORAGE_FILES.MEMORIES,
    (current) => [...current, newEntry],
    FALLBACK_MEMORIES
  );

  return newEntry;
}

export async function addMemories(
  entries: CreateMemoryEntry[]
): Promise<MemoryEntry[]> {
  const newEntries: MemoryEntry[] = entries.map((entry) => ({
    ...entry,
    id: uuidv7(),
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "manual",
    },
  }));

  await updateStore<MemoryEntry[]>(
    STORAGE_FILES.MEMORIES,
    (current) => [...current, ...newEntries],
    FALLBACK_MEMORIES
  );

  return newEntries;
}

export async function updateMemory(
  id: string,
  updates: UpdateMemoryEntry
): Promise<MemoryEntry> {
  let updatedEntry: MemoryEntry | undefined;

  await updateStore<MemoryEntry[]>(
    STORAGE_FILES.MEMORIES,
    (current) => {
      return current.map((entry) => {
        if (entry.id !== id) {
          return entry;
        }
        updatedEntry = {
          ...entry,
          ...updates,
          metadata: {
            ...entry.metadata,
            updatedAt: new Date().toISOString(),
          },
        };
        return updatedEntry;
      });
    },
    FALLBACK_MEMORIES
  );

  if (!updatedEntry) {
    throw new Error(`Entry with id ${id} not found`);
  }

  return updatedEntry;
}

export async function deleteMemory(id: string): Promise<void> {
  await updateStore<MemoryEntry[]>(
    STORAGE_FILES.MEMORIES,
    (current) => current.filter((entry) => entry.id !== id),
    FALLBACK_MEMORIES
  );
}

export async function getMemoryById(
  id: string
): Promise<MemoryEntry | undefined> {
  const entries = await getAllMemories();
  return entries.find((entry) => entry.id === id);
}

export async function exportMemoriesToCSV(): Promise<string> {
  const entries = await getAllMemories();

  const headers: Array<
    | "question"
    | "answer"
    | "category"
    | "tags"
    | "confidence"
    | "createdAt"
    | "updatedAt"
  > = [
      "question",
      "answer",
      "category",
      "tags",
      "confidence",
      "createdAt",
      "updatedAt",
    ];

  const rows = entries.map((entry) => ({
    question: entry.question || "",
    answer: entry.answer,
    category: entry.category,
    tags: entry.tags,
    confidence: entry.confidence,
    createdAt: entry.metadata.createdAt,
    updatedAt: entry.metadata.updatedAt,
  }));

  return stringifyToCSV(rows, headers);
}

export async function importMemoriesFromCSV(
  csvContent: string
): Promise<number> {
  try {
    const rows = parseCSV<{
      question: string;
      answer: string;
      category: string;
      tags: string | string[];
      confidence: string;
      createdAt: string;
      updatedAt: string;
    }>(csvContent);

    if (rows.length === 0) {
      throw new Error("CSV file is empty or invalid");
    }

    const importedEntries: MemoryEntry[] = rows.map((row) => {
      const tags = Array.isArray(row.tags)
        ? row.tags
        : row.tags
          .split(";")
          .map((t) => t.trim())
          .filter(Boolean);

      const category = isAllowedCategory(row.category)
        ? row.category
        : "general";

      const confidence = Math.max(
        0,
        Math.min(1, Number.parseFloat(row.confidence) || 0.8)
      );

      const createdAt = row.createdAt || new Date().toISOString();
      const updatedAt = row.updatedAt || new Date().toISOString();

      return {
        id: uuidv7(),
        question: row.question || undefined,
        answer: row.answer,
        category,
        tags,
        confidence,
        metadata: {
          createdAt,
          updatedAt,
          source: "import" as const,
        },
      } satisfies MemoryEntry;
    });

    await updateStore<MemoryEntry[]>(
      STORAGE_FILES.MEMORIES,
      (current) => [...current, ...importedEntries],
      FALLBACK_MEMORIES
    );

    return importedEntries.length;
  } catch (error) {
    logger.error("Failed to import CSV:", error);
    throw error;
  }
}

export async function resetMemories(): Promise<void> {
  await writeToStore(STORAGE_FILES.MEMORIES, FALLBACK_MEMORIES);
}
