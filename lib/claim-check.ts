/**
 * Spotting a fabricated testimonial before it is scheduled.
 *
 * A persona is a scripted character. When one says "I made $10k with this",
 * that is a made-up customer testimonial with a specific earnings claim
 * attached — a clearer and more expensive legal problem than the live/recorded
 * question, and a different one: the format is arguable, an invented
 * testimonial is not.
 *
 * This warns, and never blocks. A host writing "the last cohort averaged 3x"
 * may have the receipts, and software that refused to let them say so would be
 * wrong about their business. What it can do is make sure nobody schedules one
 * without noticing what they wrote.
 */

export type ClaimFlag = {
  kind: "earnings" | "testimonial" | "guarantee" | "medical" | "urgency";
  matched: string;
  note: string;
};

type Rule = {
  kind: ClaimFlag["kind"];
  pattern: RegExp;
  note: string;
};

const RULES: Rule[] = [
  {
    kind: "earnings",
    // A currency amount, or a multiple, in the mouth of an invented person.
    pattern:
      /(?:^|\s)(?:[$£€]\s?\d[\d,.]*\s?(?:k|m|million|thousand)?|\d[\d,.]*\s?(?:k|m)\s?(?:\+|dollars|pounds|euros)|\d+\s?x\s?(?:my|the|their)?\s?(?:roi|return|revenue|income|money|investment))/i,
    note: "An amount of money in a persona's mouth reads as an earnings claim from a customer who does not exist.",
  },
  {
    kind: "testimonial",
    pattern:
      /\b(?:i|we)\s+(?:made|earned|got|made back|doubled|tripled|scaled|grew|hit|closed|banked|pulled in)\b/i,
    note: "This is written as a first-person result. From a persona, that is a testimonial from someone who is not real.",
  },
  {
    kind: "guarantee",
    pattern:
      /\b(?:guarantee[ds]?|guaranteed results|risk[- ]free|no risk|100%\s*(?:sure|certain|guaranteed)|cannot lose|can'?t lose|foolproof)\b/i,
    note: "A guarantee stated in chat is a promise your terms may not make.",
  },
  {
    kind: "medical",
    pattern:
      /\b(?:cure[sd]?|heal[s]?|treat(?:s|ment)?\s+(?:your|the)|diagnos(?:e|is)|clinically proven|FDA[- ]approved|(?:lost|lose|losing|dropped|shed)\s+\d+\s?(?:lbs?|pounds|kgs?|kilos?|stone))\b/i,
    note: "Health claims are regulated separately and more strictly than marketing claims.",
  },
  {
    kind: "urgency",
    pattern:
      /\b(?:only \d+ (?:spots?|seats?|left)|last chance|final warning|closing forever|never again|\d+ spots? (?:left|remaining))\b/i,
    note: "Scarcity a persona asserts should be scarcity that is real — the offer's own countdown is checkable, this is not.",
  },
];

/**
 * Flags in a line of persona dialogue.
 *
 * Returns every rule that matched rather than the first, because a single
 * sentence can be two problems at once and fixing one would leave the other.
 */
export function checkClaims(content: string): ClaimFlag[] {
  const text = content.trim();
  if (!text) return [];

  const flags: ClaimFlag[] = [];

  for (const rule of RULES) {
    const match = rule.pattern.exec(text);
    if (match) {
      flags.push({
        kind: rule.kind,
        matched: match[0].trim(),
        note: rule.note,
      });
    }
  }

  return flags;
}

/** One line of guidance for the strongest flag, for a compact warning. */
export function claimSummary(flags: ClaimFlag[]): string | null {
  if (flags.length === 0) return null;

  // Ordered by how expensive the claim is to get wrong, not by how likely it
  // is to be a false positive.
  const order: ClaimFlag["kind"][] = [
    "medical",
    "earnings",
    "testimonial",
    "guarantee",
    "urgency",
  ];

  for (const kind of order) {
    const flag = flags.find((candidate) => candidate.kind === kind);
    if (flag) return flag.note;
  }

  return flags[0]?.note ?? null;
}
