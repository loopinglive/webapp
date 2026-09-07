/**
 * An ARIA live region for announcing dynamic content to screen readers —
 * a new chat message, a completed upload, a saved form — without moving focus.
 */
export function LiveRegion({
  message,
  politeness = "polite",
}: {
  message: string;
  politeness?: "polite" | "assertive";
}) {
  return (
    <div role="status" aria-live={politeness} aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
