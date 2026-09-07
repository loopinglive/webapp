import { CodeBlock } from "@/components/docs/CodeBlock";

/**
 * A small, dependency-free markdown renderer.
 *
 * Documentation content is admin-authored, never end-user input, so the risk
 * a library like next-mdx-remote guards against does not apply here — this
 * builds React elements directly rather than parsing to HTML, so there is no
 * dangerouslySetInnerHTML and nothing to sanitise. Supports the subset real
 * docs actually use: headings, paragraphs, lists, fenced code, links,
 * bold/italic/inline code, and a `> ` blockquote as a callout.
 */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function headingsOf(markdown: string): Array<{ id: string; text: string; level: number }> {
  const headings: Array<{ id: string; text: string; level: number }> = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^(#{1,3})\s+(.*)$/);
    if (match) {
      const text = match[2].trim();
      headings.push({ id: slugify(text), text, level: match[1].length });
    }
  }
  return headings;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/;
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let index = 0;

  while (remaining) {
    const match = remaining.match(pattern);
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }
    if (match.index > 0) parts.push(remaining.slice(0, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;

    if (token.startsWith("`")) {
      parts.push(
        <code key={key} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] text-cyan">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      parts.push(
        <strong key={key} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*")) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a key={key} href={linkMatch[2]} className="text-accent underline-offset-2 hover:text-accent-soft hover:underline">
            {linkMatch[1]}
          </a>
        );
      }
    }
    remaining = remaining.slice(match.index + token.length);
  }

  return parts;
}

export function renderMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const HEADING_TAG = { 1: "h2", 2: "h3", 3: "h4" } as const;
  const HEADING_CLASS = {
    1: "mt-10 scroll-mt-24 text-[22px] font-semibold tracking-[-0.02em] text-ink",
    2: "mt-8 scroll-mt-24 text-[17px] font-semibold text-ink",
    3: "mt-6 scroll-mt-24 text-[14.5px] font-semibold text-ink",
  } as const;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      nodes.push(<CodeBlock key={key++} language={lang} code={codeLines.join("\n")} />);
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      const text = headingMatch[2].trim();
      const Tag = HEADING_TAG[level];
      nodes.push(
        <Tag key={key++} id={slugify(text)} className={HEADING_CLASS[level]}>
          {renderInline(text, `h${key}`)}
        </Tag>
      );
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      const calloutLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        calloutLines.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <div
          key={key++}
          className="mt-4 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3 text-[13.5px] leading-relaxed text-ink-muted"
        >
          {calloutLines.map((calloutLine, index) => (
            <p key={index}>{renderInline(calloutLine, `c${key}-${index}`)}</p>
          ))}
        </div>
      );
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ""));
        i++;
      }
      nodes.push(
        <ul key={key++} className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-ink-muted">
          {items.map((item, index) => (
            <li key={index}>{renderInline(item, `ul${key}-${index}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      nodes.push(
        <ol key={key++} className="mt-3 list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-ink-muted">
          {items.map((item, index) => (
            <li key={index}>{renderInline(item, `ol${key}-${index}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !lines[i].startsWith("```") &&
      !/^[-*]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !lines[i].startsWith("> ")
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    nodes.push(
      <p key={key++} className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
        {renderInline(paraLines.join(" "), `p${key}`)}
      </p>
    );
  }

  return nodes;
}
