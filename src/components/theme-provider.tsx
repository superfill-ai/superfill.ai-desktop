import { createContext, useContext, useEffect, useState } from "react";
import { ipc } from "@/ipc/manager";
import { Theme } from "@/types/theme";

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: Theme;
  toggleTheme: () => Promise<void>;
};

const initialState: ThemeProviderState = {
  theme: Theme.DEFAULT,
  toggleTheme: () => Promise.resolve(),
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(Theme.DEFAULT);

  const toggleTheme = async () => {
    const newTheme =
      theme === Theme.LIGHT
        ? Theme.DARK
        : theme === Theme.DARK
          ? Theme.DEFAULT
          : Theme.LIGHT;

    const currentSettings = await ipc.client.settings.readUISettings();
    await ipc.client.settings.writeUISettings({
      settings: {
        ...currentSettings,
        theme: newTheme,
      },
    });
  };

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === Theme.DEFAULT) {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? Theme.DARK
        : Theme.LIGHT;

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const fetchTheme = async () => {
      const ui = await ipc.client.settings.readUISettings();
      setTheme(ui.theme || Theme.DEFAULT);
    };

    fetchTheme();
  }, []);

  const value = {
    theme,
    toggleTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
