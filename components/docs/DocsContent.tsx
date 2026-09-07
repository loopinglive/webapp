import { renderMarkdown } from "@/lib/docs/markdown";

export function DocsContent({ content }: { content: string }) {
  return <div className="max-w-[68ch]">{renderMarkdown(content)}</div>;
}
