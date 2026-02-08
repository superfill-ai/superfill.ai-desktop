import { ipc } from "@/ipc/manager";

export function getPlatform() {
  return ipc.client.app.currentPlatform();
}

export function getAppVersion() {
  return ipc.client.app.appVersion();
}
