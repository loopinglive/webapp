import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description:
    "Loopinglive's commitment to WCAG 2.1 AA, what's in place today, and how to report a barrier.",
};

const UPDATED = "31 August 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "commitment",
    heading: "Our commitment",
    body: (
      <p>
        Loopinglive aims to meet the Web Content Accessibility Guidelines (WCAG)
        2.1 at Level AA across the registration page, the waiting room, the watch
        room, and the dashboard our hosts use every day. This is an ongoing
        effort, not a one-time badge — the sections below describe what is in
        place today and where we know we still have work to do.
      </p>
    ),
  },
  {
    id: "standards",
    heading: "Standards and technologies",
    body: (
      <ul>
        <li>Semantic HTML5, with ARIA roles and states used to fill gaps native elements don&rsquo;t cover.</li>
        <li>A visible, high-contrast focus indicator on every interactive element (WCAG 2.4.7).</li>
        <li>A skip-to-content link at the start of every page (WCAG 2.4.1).</li>
        <li>ARIA live regions for dynamic content — new chat messages, save confirmations, errors.</li>
        <li>Colour is never the only signal — status is always paired with text or an icon.</li>
      </ul>
    ),
  },
  {
    id: "controls",
    heading: "Accessibility controls",
    body: (
      <>
        <p>
          The accessibility icon in the bottom-right corner of every page opens a
          panel with:
        </p>
        <ul>
          <li><strong>Reduce motion</strong> — turns off animations and transitions entirely.</li>
          <li><strong>High contrast</strong> — raises text and border contrast beyond the WCAG AA minimum.</li>
          <li><strong>Large text</strong> — increases the base text size across the interface.</li>
          <li><strong>Captions</strong> — controls whether webinar video captions are shown.</li>
          <li><strong>Keyboard hints</strong> and <strong>screen reader mode</strong> — more verbose labelling for complex UI.</li>
        </ul>
        <p>
          Signed-in hosts have these preferences saved to their account, so they
          follow them to a new device. Attendees who aren&rsquo;t signed in keep
          their choice for that browser.
        </p>
      </>
    ),
  },
  {
    id: "known-limitations",
    heading: "Known limitations",
    body: (
      <p>
        Some parts of the platform — particularly the live webinar room&rsquo;s
        real-time video and chat, and richer charts in analytics — are still
        being audited against WCAG 2.1 AA in full. Where we know of a specific
        barrier, we prioritise fixing it over documenting a workaround. If
        something is not usable for you, please tell us — see below.
      </p>
    ),
  },
  {
    id: "feedback",
    heading: "Feedback",
    body: (
      <p>
        If you hit a barrier anywhere on Loopinglive, email{" "}
        <a href="mailto:accessibility@loopinglive.com">accessibility@loopinglive.com</a>{" "}
        with the page and what happened. We treat these as bugs and aim to
        respond within five business days.
      </p>
    ),
  },
];

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility Statement"
      updated={UPDATED}
      intro={
        <p>
          What we aim for, what is in place today, and how to reach us if
          something doesn&rsquo;t work for you.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
