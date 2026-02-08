export const icons = {
  icon16: new URL("./icons/icon-16.png", import.meta.url).href,
  icon32: new URL("./icons/icon-32.png", import.meta.url).href,
  icon48: new URL("./icons/icon-48.png", import.meta.url).href,
  icon128: new URL("./icons/icon-128.png", import.meta.url).href,
  icon256: new URL("./icons/icon-256.png", import.meta.url).href,
  icon512: new URL("./icons/icon-512.png", import.meta.url).href,
  faviconSvg: new URL("./icons/favicon.svg", import.meta.url).href,
  faviconIco: new URL("./icons/favicon.ico", import.meta.url).href,
  appleTouchIcon: new URL("./icons/apple-touch-icon.png", import.meta.url).href,
} as const;

export const images = {
  heroBanner: new URL("./images/hero_banner.webp", import.meta.url).href,
  dashboard: new URL("./images/dashboard.webp", import.meta.url).href,
  intelligentFieldMatching: new URL(
    "./images/intelligent_field_matching.webp",
    import.meta.url,
  ).href,
  smartMemorySystem: new URL(
    "./images/smart_memory_system.webp",
    import.meta.url,
  ).href,
  secureData: new URL("./images/secure_data.webp", import.meta.url).href,
  workAnywhereFull: new URL("./images/work_anywhere_full.webp", import.meta.url)
    .href,
} as const;

export type IconKey = keyof typeof icons;
export type ImageKey = keyof typeof images;

export function getIcon(key: IconKey): string {
  return icons[key];
}

export function getImage(key: ImageKey): string {
  return images[key];
}
