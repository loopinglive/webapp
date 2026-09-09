import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The brand mark.
 *
 * Three shapes, each doing a job: a loop that does not quite close (an
 * evergreen webinar coming round again), a play triangle inside it (it is a
 * recording), and a dot sitting in the loop's gap (it runs live). The dot is
 * the mark this replaces — the app has always used a small accent dot beside
 * the wordmark — so the identity carries over rather than starting again.
 *
 * The loop is drawn as a dashed circle rather than an arc path: the gap is
 * then a single number to tune, and round caps land correctly at both ends
 * without hand-computed endpoints.
 *
 * Geometry lives on a 32x32 grid so it scales cleanly to a 16px favicon and
 * a 180px touch icon from the same source.
 */

// 2πr for r=12. The dash is the drawn portion, the gap the opening — 310°/50°.
const CIRCUMFERENCE = 75.4;
const GAP = 10.5;

export function LogoMark({
  size = 28,
  className,
  /** Renders in a single flat colour instead of the gradient — for a favicon tile, or anywhere on a coloured ground. */
  mono,
  title,
}: {
  size?: number;
  className?: string;
  mono?: boolean;
  title?: string;
}) {
  // Deliberately a fixed id, not a generated one. Two marks on a page will
  // both define it, which is invalid-but-harmless HTML because the definition
  // is identical either way — whereas a random id differs between the server
  // render and hydration, which React reports as a mismatch.
  const gradientId = "ll-mark-gradient";
  const stroke = mono ? "currentColor" : `url(#${gradientId})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {!mono && (
        <defs>
          <linearGradient id={gradientId} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6C47FF" />
            <stop offset="1" stopColor="#00D4FF" />
          </linearGradient>
        </defs>
      )}

      {/* The loop. Starts at 3 o'clock and runs clockwise, so the gap falls
          in the upper right where the live dot sits. */}
      <circle
        cx="16"
        cy="16"
        r="12"
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={`${CIRCUMFERENCE - GAP} ${GAP}`}
      />

      {/* The recording. */}
      <path d="M13.6 11.1 L21.8 16 L13.6 20.9 Z" fill={stroke} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />

      {/* Live, in the gap. */}
      <circle cx="26.9" cy="10.9" r="3.1" fill={mono ? "currentColor" : "#00D4FF"} />
    </svg>
  );
}

/** Mark plus wordmark, for a nav or sidebar. */
export function Logo({
  size = 28,
  className,
  showWordmark = true,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} title={SITE.name} />
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{SITE.name}</span>
      )}
    </span>
  );
}
