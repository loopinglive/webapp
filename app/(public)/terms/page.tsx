import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms you agree to when you use Loopinglive.",
};

const UPDATED = "3 September 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "service",
    heading: "What Loopinglive is",
    body: (
      <>
        <p>
          Loopinglive is software for running automated webinars. You upload a
          recording, set a schedule, and we play it to attendees at those times inside
          a live-styled room with a chat, simulated participants, and a timed offer.
        </p>
        <p>
          <strong>The video is pre-recorded and plays on a schedule.</strong> Some
          chat participants are personas you create, and some replies may be generated
          by AI. This is how the product works and you are agreeing to use it that way.
        </p>
      </>
    ),
  },
  {
    id: "account",
    heading: "Your account",
    body: (
      <>
        <p>
          You must be at least 18 and provide accurate details. You are responsible
          for what happens under your account, including keeping your password safe
          and anything done by people you give access to.
        </p>
        <p>
          One person or organisation per account. Tell us promptly if you think
          someone else has got in.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    heading: "Acceptable use",
    body: (
      <>
        <p>
          Loopinglive presents recorded content as a scheduled live event. That is
          the product. What it is not licence to do is deceive people in ways that
          cause them harm.
        </p>
        <p>You may not use Loopinglive to:</p>
        <ul>
          <li>
            Make claims you know to be false about earnings, health, or investment
            outcomes.
          </li>
          <li>
            Impersonate another person, business or organisation, or present someone
            else&rsquo;s content as yours.
          </li>
          <li>
            Sell anything illegal where you or your attendees are, or anything you are
            not permitted to sell.
          </li>
          <li>
            Upload content you do not hold the rights to, or that is unlawful,
            harassing, or sexually exploitative.
          </li>
          <li>
            Import contacts who did not give you permission to email or message them.
          </li>
          <li>
            Attempt to break, overload, or gain unauthorised access to the service or
            another customer&rsquo;s data.
          </li>
        </ul>
        <p>
          You are responsible for complying with the consumer, advertising and
          distance-selling laws that apply to you and to the people you sell to.
        </p>
      </>
    ),
  },
  {
    id: "content",
    heading: "Your content",
    body: (
      <>
        <p>
          Your videos, copy, personas and attendee lists remain yours. You give us
          only the permission needed to host, process and deliver them — storing your
          video, transcoding it, and playing it to your attendees.
        </p>
        <p>
          We do not sell your content, and we do not use your attendee data to market
          to your attendees ourselves.
        </p>
      </>
    ),
  },
  {
    id: "payment",
    heading: "Payment and refunds",
    body: (
      <>
        <p>
          The Free plan lets you build a webinar but not publish or run one. Paid
          plans are billed in advance: Monthly renews each month, Yearly each year,
          and Lifetime is a single payment.
        </p>
        <p>
          <strong>30-day money-back guarantee.</strong> Ask within 30 days of your
          first payment and we refund it in full, no questions. Email{" "}
          <a href="mailto:support@loopinglive.com">support@loopinglive.com</a>.
        </p>
        <p>
          Cancel any time from your billing settings. You keep access to the end of
          the period you have paid for. We do not pro-rate part-months on
          cancellation.
        </p>
        <p>
          If a payment fails we will retry and let you know. If it stays unpaid your
          scheduled sessions pause — your data is not deleted, and everything resumes
          when payment clears.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    heading: "Availability",
    body: (
      <>
        <p>
          We work to keep Loopinglive running but do not promise uninterrupted
          service. We rely on third parties — hosting, video delivery, email, SMS and
          payments — and their outages can become ours.
        </p>
        <p>
          We may change or remove features. Where a change materially reduces what
          you are paying for, we will tell you in advance.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    heading: "Ending the agreement",
    body: (
      <>
        <p>
          You can close your account at any time. We can suspend or close an account
          that breaches these terms, particularly the acceptable use section, and will
          tell you why unless doing so is unlawful.
        </p>
        <p>
          On closure your webinars stop running. We keep your data for 30 days so a
          closure by mistake can be undone, then delete it.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    heading: "Liability",
    body: (
      <>
        <p>
          Loopinglive is provided as is. We do not promise it will produce any
          particular result, and we are not liable for lost profits, lost revenue, or
          lost data.
        </p>
        <p>
          Where liability cannot be excluded, ours is limited to what you paid us in
          the twelve months before the claim.
        </p>
        <p>
          Nothing here limits liability for death, personal injury, or fraud, and
          nothing affects statutory rights you have as a consumer.
        </p>
      </>
    ),
  },
  {
    id: "law",
    heading: "Governing law",
    body: (
      <p>
        These terms are governed by the law of England and Wales, and its courts have
        exclusive jurisdiction. If you are a consumer elsewhere, you keep the
        protections of your own country&rsquo;s law.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    body: (
      <p>
        We may update these terms. For material changes we will email you at least 14
        days before they take effect. Continuing to use Loopinglive after that means
        you accept them.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={UPDATED}
      intro={
        <p>
          These terms cover your use of Loopinglive. They are written to be read, not
          to be impenetrable — if anything here is unclear, ask us and we will explain
          it plainly.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
