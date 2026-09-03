"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { EVENT_LABELS, WEBHOOK_EVENTS } from "@/lib/webhooks/events";

const BASE = "https://loopinglive.com/api/public/v1";

type Endpoint = {
  method: "GET" | "POST" | "PATCH";
  path: string;
  summary: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  response: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/webinars",
    summary: "Lists the webinars belonging to the key's owner.",
    params: [
      { name: "status", type: "string", required: false, description: "draft, published, or all (default)" },
      { name: "page", type: "integer", required: false, description: "1-based page number" },
      { name: "limit", type: "integer", required: false, description: "1–100, default 25" },
    ],
    response: `{
  "webinars": [
    {
      "id": "0f8c…",
      "title": "The 3-Offer Framework",
      "status": "published",
      "video_duration_seconds": 2880,
      "created_at": "2026-08-30T12:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 25
}`,
  },
  {
    method: "GET",
    path: "/webinars/{id}",
    summary: "One webinar, with its recent sessions and registrant count.",
    response: `{
  "webinar": {
    "id": "0f8c…",
    "title": "The 3-Offer Framework",
    "status": "published",
    "registrantCount": 128,
    "sessions": [
      { "id": "a1b2…", "starts_at": "2026-09-04T19:00:00Z", "status": "scheduled" }
    ]
  }
}`,
  },
  {
    method: "GET",
    path: "/webinars/{id}/registrants",
    summary: "Registrants for one webinar.",
    params: [
      { name: "segment", type: "string", required: false, description: "Filter by watch-depth segment" },
      { name: "boughtOnly", type: "boolean", required: false, description: "Only people who bought" },
      { name: "page", type: "integer", required: false, description: "1-based page number" },
      { name: "limit", type: "integer", required: false, description: "1–100, default 25" },
    ],
    response: `{
  "registrants": [
    {
      "id": "9c3d…",
      "full_name": "Sarah Okonkwo",
      "email": "sarah@example.com",
      "attended": true,
      "watch_percentage": 63,
      "bought": false
    }
  ],
  "total": 128,
  "page": 1,
  "limit": 25
}`,
  },
  {
    method: "POST",
    path: "/webinars/{id}/registrants",
    summary: "Registers someone programmatically.",
    params: [
      { name: "full_name", type: "string", required: true, description: "2–100 characters" },
      { name: "email", type: "string", required: true, description: "A valid email address" },
      { name: "phone", type: "string", required: false, description: "Digits, spaces, + ( ) -" },
      { name: "country_code", type: "string", required: false, description: "ISO 3166-1 alpha-2" },
      { name: "session_id", type: "uuid", required: false, description: "Defaults to the next session" },
    ],
    response: `{
  "registrant": { "id": "9c3d…", "email": "sarah@example.com" }
}`,
  },
  {
    method: "GET",
    path: "/sessions",
    summary: "Sessions across every webinar the key can see.",
    params: [
      { name: "webinar_id", type: "uuid", required: false, description: "Restrict to one webinar" },
      { name: "status", type: "string", required: false, description: "scheduled, live, or ended" },
    ],
    response: `{
  "sessions": [
    { "id": "a1b2…", "webinar_id": "0f8c…", "starts_at": "2026-09-04T19:00:00Z", "status": "scheduled" }
  ],
  "total": 12,
  "page": 1,
  "limit": 25
}`,
  },
];

const ERRORS = [
  { code: 400, meaning: "The request was malformed — usually a missing parameter." },
  { code: 401, meaning: "The API key is missing, invalid, revoked or expired." },
  { code: 403, meaning: "The account is suspended." },
  { code: 404, meaning: "No such resource, or it belongs to someone else." },
  { code: 422, meaning: "The body failed validation. The response lists each issue." },
  { code: 429, meaning: "Rate limit exceeded. Retry-After says how long to wait." },
  { code: 500, meaning: "Something went wrong on our side." },
];

export function ApiDocs() {
  return (
    <div className="mx-auto max-w-[1080px] px-6 py-12">
      <h1 className="text-[36px] font-semibold tracking-[-0.03em] text-white">
        API documentation
      </h1>
      <p className="mt-3 max-w-[65ch] text-[15.5px] leading-relaxed text-[#A0A0B0]">
        A REST API over your own Loopinglive data. Everything is JSON, everything is
        authenticated with a bearer token, and every list is paginated.
      </p>

      <Section title="Base URL">
        <Code language="text" code={BASE} />
      </Section>

      <Section title="Authentication">
        <p className="mb-4 max-w-[65ch] text-[14px] leading-relaxed text-[#A0A0B0]">
          Send your key in the <Mono>Authorization</Mono> header. Create one under{" "}
          <a href="/settings/api-keys" className="text-[#6C47FF] hover:text-[#8A6BFF]">
            Settings → API keys
          </a>
          . Keys are shown once at creation — we store only a hash, so a lost key has
          to be revoked and replaced.
        </p>
        <Code
          language="bash"
          code={`curl ${BASE}/webinars \\
  -H "Authorization: Bearer ll_live_your_key_here"`}
        />
      </Section>

      <Section title="Rate limits">
        <p className="max-w-[65ch] text-[14px] leading-relaxed text-[#A0A0B0]">
          100 requests per minute per key. Every response carries{" "}
          <Mono>X-RateLimit-Limit</Mono>, <Mono>X-RateLimit-Remaining</Mono> and{" "}
          <Mono>X-RateLimit-Reset</Mono>. Exceeding the limit returns{" "}
          <Mono>429</Mono> with a <Mono>Retry-After</Mono> header.
        </p>
      </Section>

      <Section title="Endpoints">
        <div className="space-y-8">
          {ENDPOINTS.map((endpoint) => (
            <EndpointBlock key={`${endpoint.method}${endpoint.path}`} endpoint={endpoint} />
          ))}
        </div>
      </Section>

      <Section title="Errors">
        <div className="overflow-hidden rounded-xl border border-[#1E1E2E]">
          <table className="w-full">
            <tbody className="divide-y divide-[#1E1E2E]">
              {ERRORS.map((row) => (
                <tr key={row.code}>
                  <td className="w-20 px-4 py-2.5 font-mono text-[13px] text-[#FF9F43]">
                    {row.code}
                  </td>
                  <td className="px-4 py-2.5 text-[13.5px] text-[#A0A0B0]">
                    {row.meaning}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Webhooks">
        <p className="mb-4 max-w-[65ch] text-[14px] leading-relaxed text-[#A0A0B0]">
          Loopinglive can POST to a URL of yours whenever something happens. Configure
          endpoints under{" "}
          <a href="/settings/webhooks" className="text-[#6C47FF] hover:text-[#8A6BFF]">
            Settings → Webhooks
          </a>
          . Failed deliveries retry five times with increasing backoff — 5 minutes, 30
          minutes, 2 hours, then 8 hours.
        </p>

        <div className="mb-6 overflow-hidden rounded-xl border border-[#1E1E2E]">
          <table className="w-full">
            <tbody className="divide-y divide-[#1E1E2E]">
              {WEBHOOK_EVENTS.map((event) => (
                <tr key={event}>
                  <td className="px-4 py-2.5 font-mono text-[12.5px] text-[#00D4FF]">
                    {event}
                  </td>
                  <td className="px-4 py-2.5 text-[13.5px] text-[#A0A0B0]">
                    {EVENT_LABELS[event]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 text-[15px] font-semibold text-white">Payload</h3>
        <Code
          language="json"
          code={`{
  "event": "registrant.created",
  "timestamp": "2026-09-03T09:14:22.000Z",
  "data": {
    "registrantId": "9c3d…",
    "name": "Sarah Okonkwo",
    "email": "sarah@example.com",
    "webinarTitle": "The 3-Offer Framework",
    "registeredAt": "2026-09-03T09:14:21.880Z"
  }
}`}
        />

        <h3 className="mb-2 mt-6 text-[15px] font-semibold text-white">
          Verifying the signature
        </h3>
        <p className="mb-4 max-w-[65ch] text-[14px] leading-relaxed text-[#A0A0B0]">
          Every request carries <Mono>X-Loopinglive-Signature</Mono>: an HMAC-SHA256 of
          the <em>raw request body</em>, keyed with your endpoint&rsquo;s signing secret.
          Hash the bytes you received — re-serialising the parsed JSON can reorder keys
          and produce a different digest.
        </p>
        <Code
          language="javascript"
          code={`import { createHmac, timingSafeEqual } from "node:crypto";

export function verify(rawBody, signatureHeader, secret) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}`}
        />
      </Section>

      <Section title="SDKs">
        <p className="text-[14px] text-[#6E6E80]">
          None yet. The API is plain REST with bearer auth, so any HTTP client works.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 border-t border-[#1E1E2E] pt-10">
      <h2 className="mb-5 text-[22px] font-semibold tracking-[-0.02em] text-white">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-[#12121A] px-1.5 py-0.5 font-mono text-[0.88em] text-[#00D4FF]">
      {children}
    </code>
  );
}

const METHOD_COLOUR: Record<string, string> = {
  GET: "#00C851",
  POST: "#6C47FF",
  PATCH: "#FFB020",
};

function EndpointBlock({ endpoint }: { endpoint: Endpoint }) {
  const [tab, setTab] = useState<"curl" | "javascript" | "python">("curl");

  const url = `${BASE}${endpoint.path}`;
  const samples = {
    curl: `curl ${endpoint.method === "GET" ? "" : `-X ${endpoint.method} `}${url} \\
  -H "Authorization: Bearer ll_live_your_key_here"`,
    javascript: `const response = await fetch("${url}", {
  ${endpoint.method === "GET" ? "" : `method: "${endpoint.method}",\n  `}headers: { Authorization: "Bearer ll_live_your_key_here" },
});
const data = await response.json();`,
    python: `import requests

response = requests.${endpoint.method.toLowerCase()}(
    "${url}",
    headers={"Authorization": "Bearer ll_live_your_key_here"},
)
data = response.json()`,
  };

  return (
    <div className="rounded-2xl border border-[#1E1E2E] bg-[#0F0F17] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded-md px-2 py-1 font-mono text-[11px] font-semibold"
          style={{
            color: METHOD_COLOUR[endpoint.method],
            background: "rgba(255,255,255,.05)",
          }}
        >
          {endpoint.method}
        </span>
        <code className="font-mono text-[13.5px] text-white">{endpoint.path}</code>
      </div>

      <p className="mt-2.5 text-[13.5px] text-[#A0A0B0]">{endpoint.summary}</p>

      {endpoint.params && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-[#1E1E2E]">
          <table className="w-full min-w-[520px]">
            <thead className="bg-[#12121A]">
              <tr>
                {["Parameter", "Type", "Required", "Description"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E6E80]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E2E]">
              {endpoint.params.map((param) => (
                <tr key={param.name}>
                  <td className="px-3 py-2 font-mono text-[12px] text-[#00D4FF]">
                    {param.name}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-[#6E6E80]">{param.type}</td>
                  <td className="px-3 py-2 text-[12px] text-[#6E6E80]">
                    {param.required ? "yes" : "no"}
                  </td>
                  <td className="px-3 py-2 text-[12.5px] text-[#A0A0B0]">
                    {param.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex gap-1">
        {(["curl", "javascript", "python"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setTab(option)}
            className={
              tab === option
                ? "rounded-md bg-[#6C47FF]/15 px-2.5 py-1 text-[12px] text-[#8A6BFF]"
                : "rounded-md px-2.5 py-1 text-[12px] text-[#6E6E80] hover:text-white"
            }
          >
            {option === "curl" ? "cURL" : option === "javascript" ? "JavaScript" : "Python"}
          </button>
        ))}
      </div>

      <div className="mt-2">
        <Code language={tab} code={samples[tab]} />
      </div>

      <p className="mb-2 mt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6E6E80]">
        Response
      </p>
      <Code language="json" code={endpoint.response} />
    </div>
  );
}

function Code({ code }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-xl border border-[#1E1E2E] bg-[#0B0B12] p-4 font-mono text-[12.5px] leading-relaxed text-[#D4D4DE]">
        <code>{code}</code>
      </pre>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        aria-label="Copy code"
        className="absolute right-2.5 top-2.5 rounded-lg border border-[#2A2A3A] bg-[#12121A] p-1.5 text-[#6E6E80] opacity-0 transition-opacity hover:text-white focus:opacity-100 group-hover:opacity-100"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-[#00C851]" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
