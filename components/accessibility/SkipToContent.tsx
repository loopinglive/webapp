/** First focusable element on every page — invisible until a keyboard user tabs to it. */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-[13px] focus:font-medium focus:text-white"
    >
      Skip to main content
    </a>
  );
}
