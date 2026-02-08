type LogLevel = "debug" | "info" | "warn" | "error";

const isDebugEnv =
    (typeof import.meta !== "undefined" && import.meta.env?.DEV) ||
    (typeof process !== "undefined" && process.env?.VITE_DEBUG === "true");

export const DEBUG = Boolean(isDebugEnv);

class Logger {
    private context: string;

    constructor(context = "Superfill") {
        this.context = context;
    }

    private log(level: LogLevel, ...args: unknown[]) {
        if (level === "error" || DEBUG) {
            const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
            const prefix = `[${this.context}][${timestamp}]`;

            console[level](prefix, ...args);
        }
    }

    debug(...args: unknown[]) {
        this.log("debug", ...args);
    }

    info(...args: unknown[]) {
        this.log("info", ...args);
    }

    warn(...args: unknown[]) {
        this.log("warn", ...args);
    }

    error(...args: unknown[]) {
        this.log("error", ...args);
    }

    getLogger(name: string): Logger {
        return new Logger(`${this.context}:${name}`);
    }
}

export const logger = new Logger();

export function createLogger(name: string): Logger {
    return logger.getLogger(name);
}
