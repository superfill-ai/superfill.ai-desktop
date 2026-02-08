import {
  getInstalledBrowsers,
  readAISettings,
  readBrowserSettings,
  readUISettings,
  writeAISettings,
  writeBrowserSettings,
  writeUISettings,
} from "./handlers";

export const settings = {
  readAISettings,
  writeAISettings,
  readUISettings,
  writeUISettings,
  readBrowserSettings,
  writeBrowserSettings,
  getInstalledBrowsers,
};
