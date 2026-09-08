import "server-only";

/**
 * DeepL text translation — REST, matching this codebase's established
 * pattern for third-party providers it can't test against a real account
 * yet (lib/payments/*, lib/voice/elevenlabs.ts).
 */

export function deeplConfigured(): boolean {
  return Boolean(process.env.DEEPL_API_KEY?.trim());
}

// DeepL's free-tier keys are suffixed ":fx" and only work against the free
// hostname; a pro key 404s there. This is DeepL's own documented convention
// for telling the two apart without a separate config flag.
function baseUrl(key: string): string {
  return key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
}

export const SUPPORTED_TARGET_LANGUAGES = [
  { code: "EN-US", label: "English (US)" },
  { code: "ES", label: "Spanish" },
  { code: "FR", label: "French" },
  { code: "DE", label: "German" },
  { code: "PT-BR", label: "Portuguese (Brazil)" },
  { code: "IT", label: "Italian" },
  { code: "NL", label: "Dutch" },
  { code: "PL", label: "Polish" },
  { code: "RU", label: "Russian" },
  { code: "JA", label: "Japanese" },
  { code: "ZH", label: "Chinese (simplified)" },
  { code: "AR", label: "Arabic" },
  { code: "HI", label: "Hindi" },
  { code: "TR", label: "Turkish" },
  { code: "KO", label: "Korean" },
] as const;

export type TargetLanguage = (typeof SUPPORTED_TARGET_LANGUAGES)[number]["code"];

/** Translates a batch of strings in one request — DeepL bills per character regardless of how many calls, so batching just saves round trips. */
export async function translateTexts(texts: string[], targetLang: string, sourceLang?: string): Promise<string[]> {
  const key = process.env.DEEPL_API_KEY?.trim();
  if (!key) throw new Error("Translation is not configured on this deployment.");
  if (texts.length === 0) return [];

  const response = await fetch(`${baseUrl(key)}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      target_lang: targetLang,
      ...(sourceLang ? { source_lang: sourceLang } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.message || `DeepL could not translate into ${targetLang}.`);
  }

  const payload = (await response.json()) as { translations: { text: string }[] };
  return payload.translations.map((translation) => translation.text);
}
