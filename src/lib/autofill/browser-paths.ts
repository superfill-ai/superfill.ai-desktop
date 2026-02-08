import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import { createLogger } from "@/lib/logger";

const logger = createLogger("browser-paths");

export type BrowserType = "chrome" | "edge" | "brave" | "chromium";

interface BrowserPathEntry {
  label: string;
  paths: Partial<Record<NodeJS.Platform, string[]>>;
}

const BROWSER_PATHS: Record<BrowserType, BrowserPathEntry> = {
  chrome: {
    label: "Google Chrome",
    paths: {
      darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
      win32: [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
      ],
      linux: [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/local/bin/google-chrome",
        "/snap/bin/chromium",
      ],
    },
  },
  edge: {
    label: "Microsoft Edge",
    paths: {
      darwin: [
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      ],
      win32: [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        `${process.env.LOCALAPPDATA ?? ""}\\Microsoft\\Edge\\Application\\msedge.exe`,
      ],
      linux: ["/usr/bin/microsoft-edge", "/usr/bin/microsoft-edge-stable"],
    },
  },
  brave: {
    label: "Brave",
    paths: {
      darwin: ["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"],
      win32: [
        `${process.env.LOCALAPPDATA ?? ""}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
        "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      ],
      linux: ["/usr/bin/brave-browser", "/usr/bin/brave-browser-stable"],
    },
  },
  chromium: {
    label: "Chromium",
    paths: {
      darwin: ["/Applications/Chromium.app/Contents/MacOS/Chromium"],
      win32: [
        `${process.env.LOCALAPPDATA ?? ""}\\Chromium\\Application\\chrome.exe`,
      ],
      linux: [
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
      ],
    },
  },
};

export function findBrowserExecutable(
  browser: BrowserType,
): string | undefined {
  const entry = BROWSER_PATHS[browser];
  const candidates = entry.paths[process.platform] ?? [];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      logger.info(`Found ${entry.label} at ${candidate}`);
      return candidate;
    }
  }

  logger.debug(`${entry.label} not found on this system`);
  return undefined;
}

export function detectInstalledBrowsers(): {
  type: BrowserType;
  label: string;
  executablePath: string;
}[] {
  const results: {
    type: BrowserType;
    label: string;
    executablePath: string;
  }[] = [];

  for (const [type, entry] of Object.entries(BROWSER_PATHS)) {
    const exe = findBrowserExecutable(type as BrowserType);
    if (exe) {
      results.push({
        type: type as BrowserType,
        label: entry.label,
        executablePath: exe,
      });
    }
  }

  return results;
}

export function getUserDataDir(): string {
  const userDataDir = join(
    app.getPath("userData"),
    "superfill-browser-profile",
  );

  if (!existsSync(userDataDir)) {
    try {
      mkdirSync(userDataDir, { recursive: true });
      logger.info(`Created browser profile directory: ${userDataDir}`);
    } catch (error) {
      logger.error(`Failed to create browser profile directory: ${error}`);
      throw error;
    }
  }

  return userDataDir;
}
