import { promises as fs } from "node:fs";
import path from "node:path";
import { app } from "electron";
import { createLogger } from "@/lib/logger";

const logger = createLogger("file-store");

function getStoreDir(): string {
    return path.join(app.getPath("userData"), "superfill");
}

async function ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
}

async function writeFile<T>(filePath: string, data: T): Promise<void> {
    const serialized = JSON.stringify(data, null, 2);
    const tmpPath = `${filePath}.tmp`;
    await fs.writeFile(tmpPath, serialized, "utf-8");
    await fs.rename(tmpPath, filePath);
}

export async function readFromStore<T>(
    filename: string,
    fallback: T,
): Promise<T> {
    const dir = getStoreDir();
    await ensureDir(dir);
    const filePath = path.join(dir, filename);

    try {
        const raw = await fs.readFile(filePath, "utf-8");
        return JSON.parse(raw) as T;
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") {
            logger.info(`Initializing ${filename} with fallback data`);
            await writeFile(filePath, fallback);
            return fallback;
        }

        logger.error(`Failed to read ${filename}`, error);
        throw error;
    }
}

export async function writeToStore<T>(
    filename: string,
    data: T,
): Promise<void> {
    const dir = getStoreDir();
    await ensureDir(dir);
    const filePath = path.join(dir, filename);
    await writeFile(filePath, data);
}

export async function updateStore<T>(
    filename: string,
    updater: (current: T) => T,
    fallback: T,
): Promise<T> {
    const current = await readFromStore<T>(filename, fallback);
    const updated = updater(current);
    await writeToStore(filename, updated);
    return updated;
}

export function getStorePath(filename?: string): string {
    const dir = getStoreDir();
    return filename ? path.join(dir, filename) : dir;
}
