import { headingsOf } from "@/lib/docs/markdown";
import { cn } from "@/lib/utils";

export function DocsTableOfContents({ content }: { content: string }) {
  const headings = headingsOf(content).filter((heading) => heading.level <= 2);
  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="hidden w-56 shrink-0 xl:block">
      <div className="sticky top-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          On this page
        </p>
        <ul className="mt-3 space-y-1.5 border-l border-hairline pl-3">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={cn(
                  "block text-[12.5px] text-ink-muted transition-colors hover:text-ink",
                  heading.level === 2 && "pl-3"
                )}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
