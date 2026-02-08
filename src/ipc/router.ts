import { app } from "./app";
import { autofill } from "./autofill";
import { memories } from "./memories";
import { security } from "./security";
import { settings } from "./settings";
import { shell } from "./shell";
import { theme } from "./theme";
import { window } from "./window";

export const router = {
  theme,
  window,
  app,
  shell,
  memories,
  settings,
  security,
  autofill,
};
