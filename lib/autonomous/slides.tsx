import "server-only";

import { ImageResponse } from "next/og";
import Anthropic from "@anthropic-ai/sdk";

import type { ScriptSection } from "@/lib/anthropic";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export type Slide = {
  sectionKey: string;
  title: string;
  bullets: string[];
  layout: "title" | "bullets" | "quote" | "offer";
};

export type SlideTheme = "dark_professional" | "light_corporate" | "bold_colourful" | "minimal_clean";

const THEMES: Record<SlideTheme, { bg: string; fg: string; accent: string; muted: string }> = {
  dark_professional: { bg: "#0A0A0F", fg: "#F4F4F8", accent: "#6C47FF", muted: "#A1A1B5" },
  light_corporate: { bg: "#FFFFFF", fg: "#0F172A", accent: "#1E3A8A", muted: "#64748B" },
  bold_colourful: { bg: "#1A0B2E", fg: "#FFFFFF", accent: "#FF6B9D", muted: "#C4A7E7" },
  minimal_clean: { bg: "#FAFAFA", fg: "#18181B", accent: "#18181B", muted: "#71717A" },
};

/** One slide (title + bullets) per script section, plus a title slide and an offer slide. */
export async function generateSlideContent(
  sections: ScriptSection[],
  topic: string,
  offer: string
): Promise<Slide[]> {
  const system = `You turn a webinar script into slide content. For each section, extract the single most important idea as a short slide title (under 8 words) and 2-4 punchy bullet points (under 12 words each) a presenter would show on screen — not the full script text, just the visual anchor for what's being said. Output ONLY a JSON array, nothing before or after: [{"sectionKey": "...", "title": "...", "bullets": ["...", "..."]}]. One object per section given, same sectionKey values, same order.`;

  const user = `Webinar topic: ${topic}\n\nSections:\n${sections
    .map((section) => `[${section.key}] ${section.title}: ${section.content.slice(0, 600)}`)
    .join("\n\n")}`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 3000,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const match = text.match(/\[[\s\S]*\]/);
  const parsed = match ? (JSON.parse(match[0]) as Array<{ sectionKey: string; title: string; bullets: string[] }>) : [];

  const bySection = new Map(parsed.map((item) => [item.sectionKey, item]));

  const slides: Slide[] = [
    { sectionKey: "_title", title: topic, bullets: [], layout: "title" },
    ...sections.map((section) => {
      const generated = bySection.get(section.key);
      return {
        sectionKey: section.key,
        title: generated?.title ?? section.title,
        bullets: (generated?.bullets ?? []).slice(0, 4),
        layout: "bullets" as const,
      };
    }),
    { sectionKey: "_offer", title: offer, bullets: [], layout: "offer" },
  ];

  return slides;
}

/** Renders one slide to a PNG using next/og's Satori-based ImageResponse — the same serverless-safe renderer this app already uses for certificate images. No headless browser involved. */
export async function renderSlideImage(slide: Slide, theme: SlideTheme): Promise<ArrayBuffer> {
  const colours = THEMES[theme];

  const body =
    slide.layout === "title" ? (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          background: colours.bg,
          padding: 80,
        }}
      >
        <div style={{ display: "flex", width: 6, height: 60, background: colours.accent, marginBottom: 40 }} />
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: colours.fg, textAlign: "center", lineHeight: 1.2 }}>
          {slide.title}
        </div>
      </div>
    ) : slide.layout === "offer" ? (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          background: colours.accent,
          padding: 80,
        }}
      >
        <div style={{ display: "flex", fontSize: 32, color: colours.bg, marginBottom: 24, fontWeight: 600 }}>
          THE OFFER
        </div>
        <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: colours.bg, textAlign: "center" }}>
          {slide.title}
        </div>
      </div>
    ) : (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          background: colours.bg,
          padding: 80,
        }}
      >
        <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: colours.fg, marginBottom: 48 }}>
          {slide.title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {slide.bullets.map((bullet, index) => (
            <div key={index} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ display: "flex", width: 12, height: 12, borderRadius: 6, background: colours.accent }} />
              <div style={{ display: "flex", fontSize: 34, color: colours.muted }}>{bullet}</div>
            </div>
          ))}
        </div>
      </div>
    );

  const response = new ImageResponse(body, { width: 1920, height: 1080 });
  return response.arrayBuffer();
}
