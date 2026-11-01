/** Client-safe helpers for a campaign's ready-made prompts and tool link. */

import type { PromptPackItem } from "./types";

export type { PromptPackItem };

/** In a campaign `toolUrl`, replaced by the URL-encoded prompt. */
export const PROMPT_PLACEHOLDER = "{prompt}";

export const MAX_PROMPT_PACK_ITEMS = 12;
export const MAX_PROMPT_TITLE_LENGTH = 80;
export const MAX_PROMPT_LENGTH = 1000;

/**
 * Only https links are allowed, since the value ends up in an `href`.
 * `{prompt}` may appear anywhere, typically as a query value.
 */
export function isValidToolUrl(raw: string): boolean {
  try {
    const url = new URL(raw.split(PROMPT_PLACEHOLDER).join("x"));
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** The link to open for a prompt, or null if the campaign has no valid link. */
export function buildToolUrl(
  toolUrl: string | null | undefined,
  prompt?: string,
): string | null {
  if (!toolUrl || !isValidToolUrl(toolUrl)) return null;
  return toolUrl
    .split(PROMPT_PLACEHOLDER)
    .join(prompt ? encodeURIComponent(prompt) : "");
}

/** True when the link can carry the prompt itself, so no copy-paste is needed. */
export function toolUrlAcceptsPrompt(toolUrl: string | null | undefined) {
  return Boolean(toolUrl?.includes(PROMPT_PLACEHOLDER));
}
