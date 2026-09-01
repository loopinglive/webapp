/**
 * Design tokens for transactional email.
 *
 * These deliberately do not import from the app's Tailwind theme. Email is a
 * different rendering target — no CSS variables, no external fonts, no
 * cascade worth trusting — so the values are duplicated here as plain strings
 * that get inlined into every element.
 */

export const COLOUR = {
  /** The page behind the card. Deeper than the app surface so the card lifts. */
  page: "#07070B",
  card: "#12121A",
  /** Inset panels (the date/time block) sit darker than the card. */
  inset: "#0D0D15",
  hairline: "#23232F",

  accent: "#6C47FF",
  accentHover: "#7C5AFF",
  secondary: "#00D4FF",

  ink: "#F5F5F9",
  body: "#A9A9BA",
  muted: "#6E6E80",
  onAccent: "#FFFFFF",

  success: "#00C851",
} as const;

/**
 * A five-step ramp standing in for the brand's accent→secondary gradient.
 *
 * CSS gradients do not render in Outlook's Word engine, so the bar is built
 * from five solid table cells instead. Every client shows the same thing.
 */
export const ACCENT_RAMP = [
  "#6C47FF",
  "#516AFF",
  "#368DFF",
  "#1BB1FF",
  "#00D4FF",
] as const;

/**
 * Inter is the brand face but cannot be loaded in email — Gmail strips
 * @font-face, and a webfont that half-loads looks worse than none. This is the
 * closest native stack on each platform.
 */
export const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

export const SIZE = {
  card: 600,
  padding: 40,
  paddingMobile: 26,
} as const;
