/**
 * Platform-aware fetch wrapper — routes web requests through a CORS proxy
 * for APIs that lack CORS headers (MetaForge, ardb.app).
 * Native platforms pass through directly.
 */

import { Platform } from "react-native";

const CORS_PROXY = "https://corsproxy.io/?url=";

export function crossFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const finalUrl =
    Platform.OS === "web" ? `${CORS_PROXY}${encodeURIComponent(url)}` : url;
  return fetch(finalUrl, init);
}
