import { createHash } from "node:crypto";
import { app } from "electron";
import { STORAGE_FILES } from "@/constants";
import { createLogger } from "@/lib/logger";
import type { AIProvider } from "@/lib/providers/registry";
import { decrypt, encrypt, generateSalt } from "@/lib/security/encryption";
import { readFromStore, writeToStore } from "@/lib/storage/file-store";
import type { EncryptedKey } from "@/types/settings";

const logger = createLogger("storage:key-vault");

interface KeyStoreEntry extends EncryptedKey {}

type KeyStore = Partial<Record<AIProvider, KeyStoreEntry>>;

const KEYSTORE_FALLBACK: KeyStore = {};

function getDeviceSecret(): string {
  const userData = app.getPath("userData");
  return createHash("sha256")
    .update(userData || "superfill-desktop")
    .digest("hex");
}

export function getStoredKeys(): Promise<KeyStore> {
  return readFromStore<KeyStore>(STORAGE_FILES.API_KEYS, KEYSTORE_FALLBACK);
}

export async function storeKey(
  provider: AIProvider,
  apiKey: string,
): Promise<void> {
  const salt = await generateSalt();
  const encrypted = await encrypt(apiKey, getDeviceSecret(), salt);
  const next: KeyStore = await getStoredKeys();

  next[provider] = { encrypted, salt } satisfies EncryptedKey;
  await writeToStore(STORAGE_FILES.API_KEYS, next);
}

export async function getKey(
  provider: AIProvider,
): Promise<string | undefined> {
  const store = await getStoredKeys();
  const entry = store[provider];
  if (!entry) {
    return undefined;
  }
  try {
    return await decrypt(entry.encrypted, getDeviceSecret(), entry.salt);
  } catch (error) {
    logger.error("Failed to decrypt key", error);
    return undefined;
  }
}

export async function deleteKey(provider: AIProvider): Promise<void> {
  const store = await getStoredKeys();
  delete store[provider];
  await writeToStore(STORAGE_FILES.API_KEYS, store);
}

export async function hasKey(provider: AIProvider): Promise<boolean> {
  const store = await getStoredKeys();
  return Boolean(store[provider]);
}
