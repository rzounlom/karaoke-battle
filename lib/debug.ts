/**
 * Debug utility for conditional logging
 * Only logs when running locally (localhost or http)
 */

export function debugLog(...args: unknown[]) {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.protocol === "http:")
  ) {
    console.log(...args);
  }
}

export function debugWarn(...args: unknown[]) {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.protocol === "http:")
  ) {
    console.warn(...args);
  }
}

export function debugError(...args: unknown[]) {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.protocol === "http:")
  ) {
    console.error(...args);
  }
}
