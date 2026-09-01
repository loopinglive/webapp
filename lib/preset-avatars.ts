/**
 * Fifty preset avatars, generated rather than shipped as files.
 *
 * They are data URIs built at module load, so the picker needs no network, no
 * asset pipeline, and no third-party avatar service that would leak who the
 * host's personas are. Each is a distinct two-tone geometric mark.
 */

const PALETTES: [string, string][] = [
  ["#6C47FF", "#00D4FF"],
  ["#FF6B6B", "#FFD93D"],
  ["#00C851", "#00D4FF"],
  ["#FF9500", "#FF3B3B"],
  ["#C77DFF", "#6C47FF"],
  ["#4CC9F0", "#4361EE"],
  ["#F72585", "#7209B7"],
  ["#06D6A0", "#118AB2"],
  ["#EF476F", "#FFD166"],
  ["#2EC4B6", "#011627"],
];

/** Five marks × ten palettes = fifty. */
const SHAPES = [
  // Circle over a band
  (a: string, b: string) =>
    `<rect width="120" height="120" fill="${a}"/><circle cx="60" cy="46" r="26" fill="${b}"/><rect y="82" width="120" height="38" fill="${b}" opacity="0.55"/>`,
  // Diagonal split
  (a: string, b: string) =>
    `<rect width="120" height="120" fill="${a}"/><path d="M0 120L120 0v120z" fill="${b}"/>`,
  // Concentric rings
  (a: string, b: string) =>
    `<rect width="120" height="120" fill="${a}"/><circle cx="60" cy="60" r="40" fill="none" stroke="${b}" stroke-width="14"/><circle cx="60" cy="60" r="12" fill="${b}"/>`,
  // Quarter arcs
  (a: string, b: string) =>
    `<rect width="120" height="120" fill="${a}"/><path d="M0 120a120 120 0 0 1 120-120v120z" fill="${b}" opacity="0.85"/><circle cx="34" cy="34" r="14" fill="${b}"/>`,
  // Stacked bars
  (a: string, b: string) =>
    `<rect width="120" height="120" fill="${a}"/><rect x="18" y="26" width="84" height="16" rx="8" fill="${b}"/><rect x="18" y="52" width="58" height="16" rx="8" fill="${b}" opacity="0.75"/><rect x="18" y="78" width="72" height="16" rx="8" fill="${b}" opacity="0.5"/>`,
];

function toDataUri(svg: string) {
  // encodeURIComponent rather than base64: smaller, and readable in devtools.
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">${svg}</svg>`
  )}`;
}

export const PRESET_AVATARS: string[] = PALETTES.flatMap(([a, b]) =>
  SHAPES.map((shape) => toDataUri(shape(a, b)))
);
