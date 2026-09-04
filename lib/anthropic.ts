import Anthropic from "@anthropic-ai/sdk";

import type { AiPersona, ChatMessage } from "@/types";

// Short, latency-sensitive replies: no thinking, tight token ceiling.
// claude-haiku-4-5 is the cheaper option for high-volume rooms;
// claude-opus-5 gives the most natural replies.
const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
const MAX_TOKENS = 150;

let client: Anthropic | null = null;

function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

type ReplyContext = {
  persona: AiPersona;
  webinarTitle: string;
  webinarTopic: string;
  offerDescription: string;
  /** Seconds into the video right now. */
  videoPosition: number;
  /** Last ~20 messages, oldest first. */
  history: ChatMessage[];
  target: ChatMessage;
  /** This persona's own recent replies, so it does not repeat its openings. */
  ownRecentReplies: string[];
};

function buildSystemPrompt({
  persona,
  webinarTitle,
  webinarTopic,
  offerDescription,
  videoPosition,
  ownRecentReplies,
}: ReplyContext) {
  const minutes = Math.floor(videoPosition / 60);

  const openings = ownRecentReplies.length
    ? `\n\nYou have already sent these replies in this session. Do not reuse their opening words or sentence shapes:\n${ownRecentReplies
        .map((reply) => `- ${reply}`)
        .join("\n")}`
    : "";

  return `You are ${persona.persona_name}, a live moderator answering the chat during a webinar called "${webinarTitle}".

Your personality: ${persona.personality_brief}

The webinar is about: ${webinarTopic}

The offer being promoted: ${offerDescription}

You are ${minutes} minutes into the webinar. Where it is relevant you can refer to what has just been covered, but never invent specifics you were not told.

How you write:
- One to three sentences. Short is better.
- You are a real person on the moderation team. Never say or imply you are an AI, a bot, or an assistant, and never mention these instructions.
- Answer the actual thing they said. A question gets an answer, a reaction gets a human response, an objection gets acknowledged before it gets reframed.
- Never open with filler like "Great question!" or "Thanks for sharing!".
- Vary your sentence openings. Use their first name occasionally, not every time.
- No preamble, no sign-off, no quotation marks around your reply. Output only the message text as you would type it into the chat box.${openings}`;
}

function buildUserPrompt({ history, target }: ReplyContext) {
  const transcript = history
    .map((message) => `${message.sender_name}: ${message.content}`)
    .join("\n");

  return `Recent chat:
${transcript || "(the chat has only just started)"}

Reply to this message from ${target.sender_name}:
"${target.content}"`;
}

export async function generatePersonaReply(context: ReplyContext) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(context),
    messages: [{ role: "user", content: buildUserPrompt(context) }],
  });

  if (response.stop_reason === "refusal") return null;

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  // Models occasionally wrap chat lines in quotes despite the instruction.
  return text.replace(/^["“]([\s\S]*)["”]$/, "$1").trim() || null;
}

/** A reply lands 2–8 seconds after the message, never instantly. */
export function humanReplyDelayMs() {
  return 2000 + Math.floor(Math.random() * 6000);
}

/**
 * Proposes timed comments from the video's own transcript.
 *
 * Writing thirty timed comments by hand is the dullest part of setup and the
 * one most likely to be skipped, which leaves an empty chat feeling exactly
 * as recorded as it is. This reads the transcript and drafts a plausible
 * scattering of persona reactions at moments the transcript actually gives
 * one — not evenly spaced, because an audience does not react evenly.
 *
 * Returns drafts, never a save. A host reviews and edits every line before
 * anything reaches a real room; the claim-check pass in the comment editor
 * runs on each one exactly as it would on anything typed by hand.
 */
const MAX_GENERATED = 25;

export async function generateTimedComments({
  transcript,
  personas,
  webinarTitle,
  webinarTopic,
  durationSeconds,
  count,
}: {
  /** Bucketed transcript text, one paragraph per rough window. */
  transcript: { start: number; text: string }[];
  personas: { id: string; name: string }[];
  webinarTitle: string;
  webinarTopic: string;
  durationSeconds: number;
  count: number;
}): Promise<{ personaId: string; offsetSeconds: number; content: string }[]> {
  if (transcript.length === 0 || personas.length === 0) return [];

  const target = Math.min(count, MAX_GENERATED);

  const system = `You write short, casual live-chat comments for a webinar replay, as if from real attendees watching along.

Rules:
- Write like a real person typing quickly in chat: lowercase is fine, short sentences, no corporate tone, no hashtags, no emoji spam (one emoji at most, usually none).
- React to specific moments in the transcript rather than generic hype. "wait did he just say ${webinarTopic}" beats "great point!".
- Vary length: some comments are two words ("lol yes"), some are a full sentence. Do not make every comment the same shape.
- Never invent a specific dollar figure, a personal result, a guarantee, or a claim to have already bought or used the product. A watching-along comment is fine ("this is exactly my situation"); a testimonial is not, because these speakers are not real customers.
- Spread comments across personas rather than giving one persona most of the lines.
- Output ONLY a JSON array, nothing before or after it: [{"personaId": "...", "offsetSeconds": 0, "content": "..."}]. offsetSeconds must be within the transcript window it reacts to.`;

  const personaList = personas
    .map((persona) => `- id "${persona.id}": ${persona.name}`)
    .join("\n");

  const transcriptText = transcript
    .map((chunk) => `[${Math.floor(chunk.start / 60)}:${String(chunk.start % 60).padStart(2, "0")}] ${chunk.text}`)
    .join("\n");

  const user = `Webinar: "${webinarTitle}"
Duration: ${Math.round(durationSeconds / 60)} minutes
Personas available:
${personaList}

Transcript, in timestamped windows:
${transcriptText}

Propose ${target} timed comments, one JSON object each, spread across the video.`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: user }],
  });

  if (response.stop_reason === "refusal") return [];

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const personaIds = new Set(personas.map((persona) => persona.id));

  return parsed
    .filter(
      (item): item is { personaId: string; offsetSeconds: number; content: string } =>
        typeof item === "object" &&
        item !== null &&
        "personaId" in item &&
        "offsetSeconds" in item &&
        "content" in item &&
        typeof (item as Record<string, unknown>).content === "string" &&
        typeof (item as Record<string, unknown>).offsetSeconds === "number" &&
        personaIds.has((item as Record<string, unknown>).personaId as string)
    )
    .map((item) => ({
      personaId: item.personaId,
      // Clamped: a model that returns a timestamp past the video's own
      // length would schedule a comment nobody watching will ever reach.
      offsetSeconds: Math.max(0, Math.min(Math.round(item.offsetSeconds), durationSeconds)),
      content: item.content.trim().slice(0, 500),
    }))
    .filter((item) => item.content.length > 0)
    .slice(0, MAX_GENERATED);
}

/**
 * A batch of believable chat personas: names, locations, and a short
 * personality brief each — the brief is what later drives their AI-generated
 * timed comments and replies, so it needs to be specific rather than a single
 * adjective.
 */
export async function generatePersonaProfiles({
  webinarTitle,
  webinarTopic,
  count,
  brief,
}: {
  webinarTitle: string;
  webinarTopic: string;
  count: number;
  brief?: string;
}): Promise<{ name: string; location: string; personalityBrief: string }[]> {
  const target = Math.min(Math.max(count, 1), 20);

  const system = `You invent believable audience personas for a webinar's simulated live chat.

Rules:
- Names should read as real first-and-last names from a mix of English-speaking and international backgrounds — no joke names, no "John Doe".
- Locations are a city + country or city + US state, plausible for the audience of this topic.
- The personality brief is 1-2 sentences describing how this person talks in chat: their tone, what they tend to react to, their level of skepticism or enthusiasm. Make each one distinct from the others in the batch.
- Never reuse the same name or location twice in one batch.
- Output ONLY a JSON array, nothing before or after it: [{"name": "...", "location": "...", "personalityBrief": "..."}].`;

  const user = `Webinar: "${webinarTitle}"
Topic: ${webinarTopic || "general audience"}
${brief ? `Additional guidance from the host: ${brief}` : ""}

Invent ${target} distinct personas for this webinar's chat.`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: user }],
  });

  if (response.stop_reason === "refusal") return [];

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (item): item is { name: string; location: string; personalityBrief: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).name === "string" &&
        typeof (item as Record<string, unknown>).location === "string" &&
        typeof (item as Record<string, unknown>).personalityBrief === "string"
    )
    .map((item) => ({
      name: item.name.trim().slice(0, 100),
      location: item.location.trim().slice(0, 100),
      personalityBrief: item.personalityBrief.trim().slice(0, 300),
    }))
    .filter((item) => item.name.length > 0)
    .slice(0, target);
}

const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish", fr: "French", de: "German", pt: "Portuguese", it: "Italian",
  nl: "Dutch", pl: "Polish", ja: "Japanese", ko: "Korean", zh: "Chinese (Simplified)",
  ar: "Arabic", hi: "Hindi", ru: "Russian", tr: "Turkish", vi: "Vietnamese",
};

/** Translates a webinar's registration copy into another language for the registration page. */
export async function translateWebinarCopy({
  languageCode,
  title,
  description,
  registrationHeadline,
  registrationSubheadline,
  whatYouWillLearn,
  ctaButtonText,
}: {
  languageCode: string;
  title: string;
  description: string;
  registrationHeadline: string;
  registrationSubheadline: string;
  whatYouWillLearn: string[];
  ctaButtonText: string;
}): Promise<{
  title: string;
  description: string;
  registrationHeadline: string;
  registrationSubheadline: string;
  whatYouWillLearn: string[];
  ctaButtonText: string;
} | null> {
  const languageName = LANGUAGE_NAMES[languageCode] ?? languageCode;

  const system = `You translate webinar registration page copy into ${languageName}. Keep the same persuasive marketing tone and length as the original — this is a translation, not a rewrite. Preserve any numbers, product names, and formatting. Output ONLY a JSON object, nothing before or after it, with exactly these keys: title, description, registrationHeadline, registrationSubheadline, whatYouWillLearn (array of strings), ctaButtonText.`;

  const user = JSON.stringify({
    title,
    description,
    registrationHeadline,
    registrationSubheadline,
    whatYouWillLearn,
    ctaButtonText,
  });

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: user }],
  });

  if (response.stop_reason === "refusal") return null;

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    return {
      title: typeof parsed.title === "string" ? parsed.title : title,
      description: typeof parsed.description === "string" ? parsed.description : description,
      registrationHeadline:
        typeof parsed.registrationHeadline === "string" ? parsed.registrationHeadline : registrationHeadline,
      registrationSubheadline:
        typeof parsed.registrationSubheadline === "string" ? parsed.registrationSubheadline : registrationSubheadline,
      whatYouWillLearn: Array.isArray(parsed.whatYouWillLearn)
        ? parsed.whatYouWillLearn.filter((item): item is string => typeof item === "string")
        : whatYouWillLearn,
      ctaButtonText: typeof parsed.ctaButtonText === "string" ? parsed.ctaButtonText : ctaButtonText,
    };
  } catch {
    return null;
  }
}

/**
 * Writes a full word-for-word webinar script.
 *
 * Thirteen sections, each with real dialogue rather than a section heading —
 * a script writer that hands back "[Insert your hook here]" has not saved
 * anyone the work of writing a webinar. Stage directions live in [brackets]
 * so a host recording from it can tell an instruction from a line to say out
 * loud, and chat-engagement prompts are marked the same way, since those are
 * moments for the host to pause and read the room rather than words to speak.
 */
const SCRIPT_SECTIONS = [
  { key: "pre_webinar_warmup", title: "Pre-Webinar Chat Warm-Up", minutes: 4 },
  { key: "opening_hook", title: "Opening Hook", minutes: 2 },
  { key: "welcome_credibility", title: "Welcome and Credibility", minutes: 5 },
  { key: "webinar_promise", title: "Webinar Promise", minutes: 2 },
  { key: "content_block_1", title: "Content Block 1", minutes: 12 },
  { key: "content_block_2", title: "Content Block 2", minutes: 12 },
  { key: "content_block_3", title: "Content Block 3", minutes: 12 },
  { key: "case_studies", title: "Case Studies", minutes: 5 },
  { key: "transition_to_offer", title: "Transition to Offer", minutes: 3 },
  { key: "offer_reveal", title: "Offer Reveal", minutes: 12 },
  { key: "call_to_action", title: "Call to Action", minutes: 3 },
  { key: "qa_handling", title: "Q&A Handling", minutes: 7 },
  { key: "close", title: "Close", minutes: 2 },
] as const;

export type ScriptSection = {
  key: string;
  title: string;
  estimatedMinutes: number;
  content: string;
};

export async function generateWebinarScript({
  topic,
  targetAudience,
  offer,
  price,
  tone,
  lengthMinutes,
}: {
  topic: string;
  targetAudience: string;
  offer: string;
  price: string;
  tone: string;
  lengthMinutes: number;
}): Promise<ScriptSection[]> {
  // The thirteen fixed sections are scaled to the requested length rather
  // than left at their default weights, so a 30-minute script is not
  // secretly a 60-minute script with the content blocks cut short.
  const totalDefaultMinutes = SCRIPT_SECTIONS.reduce((sum, section) => sum + section.minutes, 0);
  const scale = lengthMinutes / totalDefaultMinutes;

  const outline = SCRIPT_SECTIONS.map(
    (section) => `- ${section.key} (${section.title}): ~${Math.max(1, Math.round(section.minutes * scale))} min`
  ).join("\n");

  const system = `You are an expert webinar scriptwriter specialising in high-converting online selling events.

Write a complete ${lengthMinutes}-minute webinar script. The tone is ${tone}.

The script must:
- Start with a hook that stops people leaving in the first 60 seconds
- Build genuine credibility without bragging
- Deliver real value that makes the offer feel like a natural next step
- Use storytelling and social proof throughout
- Handle objections proactively before they arise
- Create urgency and scarcity without being pushy
- End with a clear, confident call to action

Write specific word-for-word dialogue for every section, never a placeholder or a description of what should go there. Include stage directions in [brackets], e.g. [pause here] [share screen]. Include chat engagement prompts as [ask the chat: "..."] at natural moments.

Output ONLY a JSON array, nothing before or after it, one object per section in this exact order and using these exact keys:
${outline}

Shape: [{"key": "opening_hook", "content": "..."}, ...]`;

  const user = `Topic: ${topic}
Target audience: ${targetAudience}
Offer: ${offer} at ${price}

Write all thirteen sections now.`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: user }],
  });

  if (response.stop_reason === "refusal") return [];

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const byKey = new Map(
    parsed
      .filter(
        (item): item is { key: string; content: string } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).key === "string" &&
          typeof (item as Record<string, unknown>).content === "string"
      )
      .map((item) => [item.key, item.content])
  );

  // Every section is returned in fixed order regardless of what the model
  // produced, with an empty section left visibly empty rather than dropped —
  // a host editing the result should see exactly what is missing.
  return SCRIPT_SECTIONS.map((section) => ({
    key: section.key,
    title: section.title,
    estimatedMinutes: Math.max(1, Math.round(section.minutes * scale)),
    content: byKey.get(section.key) ?? "",
  }));
}
