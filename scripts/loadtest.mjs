/**
 * What actually happens with a room full of people.
 *
 *   node scripts/loadtest.mjs --viewers 200 --seconds 60
 *   node scripts/loadtest.mjs --url https://www.loopinglive.com --viewers 500
 *
 * Nothing here has ever run with more than a handful of viewers, and the
 * limits that matter are not in this codebase — they are Supabase Realtime's
 * connection and message rates, and the per-request ceilings of whatever this
 * is deployed on. Guessing at them is worthless; the point of this file is to
 * turn the guess into a number.
 *
 * What it does NOT do, deliberately:
 *
 *   • It does not open Realtime sockets. Each viewer polls the chat endpoint
 *     instead. That measures the HTTP and database side honestly and leaves
 *     the socket ceiling to Supabase's own dashboard, which reports it
 *     directly. A socket test written here would mostly measure this script.
 *
 *   • It does not write. No registrations, no chat messages, no attendance —
 *     run it against production and it costs reads, not rows. The write path
 *     has its own rate limits and testing those means testing the limiter.
 *
 * Read it before running it against anything you care about.
 */

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
}

const BASE = (args.get("url") ?? "http://localhost:3000").replace(/\/$/, "");
const VIEWERS = Number(args.get("viewers") ?? 100);
const SECONDS = Number(args.get("seconds") ?? 30);
const WEBINAR = args.get("webinar") ?? null;

/** What a real viewer's browser does, and how often. */
const POLLS = [
  { name: "session", path: (w) => `/api/webinar/${w}/session`, everyMs: 30_000 },
  { name: "chat", path: (w, s) => `/api/webinar/${w}/chat?sessionId=${s}`, everyMs: 5_000 },
  { name: "viewers", path: (w, s) => `/api/webinar/${w}/attendance?sessionId=${s}`, everyMs: 10_000 },
];

const stats = new Map();

function record(name, ms, ok, status) {
  let s = stats.get(name);
  if (!s) {
    s = { n: 0, fail: 0, times: [], statuses: new Map() };
    stats.set(name, s);
  }
  s.n += 1;
  if (!ok) s.fail += 1;
  s.times.push(ms);
  s.statuses.set(status, (s.statuses.get(status) ?? 0) + 1);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

async function timed(name, url) {
  const started = Date.now();
  try {
    const response = await fetch(url, { cache: "no-store" });
    // Drain the body: leaving it unread makes latency look better than it is.
    await response.arrayBuffer();
    record(name, Date.now() - started, response.ok, response.status);
  } catch (error) {
    record(name, Date.now() - started, false, error.name ?? "network");
  }
}

async function discoverWebinar() {
  if (WEBINAR) return { webinarId: WEBINAR };

  console.error(
    "No --webinar given. Pass the id of a published webinar; this script does\n" +
      "not create one, because a test that leaves rows behind is not a test you\n" +
      "can run twice.\n"
  );
  process.exit(1);
}

async function main() {
  const { webinarId } = await discoverWebinar();

  // One real request first, to fail fast and loudly rather than reporting a
  // hundred identical 404s as a latency profile.
  const probe = await fetch(`${BASE}/api/webinar/${webinarId}/session`, {
    cache: "no-store",
  });
  if (!probe.ok) {
    console.error(
      `The webinar did not load (${probe.status}). Check --url and --webinar.`
    );
    process.exit(1);
  }
  const payload = await probe.json();
  const sessionId = payload?.session?.id;

  if (!sessionId) {
    console.error(
      "That webinar has no session on the books, so there is nothing for a\n" +
        "viewer to poll. Schedule one, or start a test run, and try again."
    );
    process.exit(1);
  }

  console.log(
    `${VIEWERS} viewers against ${BASE} for ${SECONDS}s\n` +
      `webinar ${webinarId}  session ${sessionId}\n`
  );

  const until = Date.now() + SECONDS * 1000;
  const runners = [];

  for (let viewer = 0; viewer < VIEWERS; viewer += 1) {
    runners.push(
      (async () => {
        /*
         * Stagger the start.
         *
         * Real viewers arrive over a minute or two. Firing every request in
         * the same millisecond measures a thundering herd, which is a real
         * failure mode but not this one, and it hides the steady-state
         * behaviour underneath it.
         */
        await new Promise((r) => setTimeout(r, Math.random() * 5000));

        const next = POLLS.map((poll) => Date.now() + Math.random() * poll.everyMs);

        while (Date.now() < until) {
          for (let i = 0; i < POLLS.length; i += 1) {
            if (Date.now() < next[i]) continue;
            const poll = POLLS[i];
            next[i] = Date.now() + poll.everyMs;
            await timed(poll.name, `${BASE}${poll.path(webinarId, sessionId)}`);
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      })()
    );
  }

  const progress = setInterval(() => {
    const total = [...stats.values()].reduce((sum, s) => sum + s.n, 0);
    const left = Math.max(0, Math.round((until - Date.now()) / 1000));
    process.stdout.write(`\r${total} requests, ${left}s left   `);
  }, 1000);

  await Promise.all(runners);
  clearInterval(progress);

  console.log("\n");
  console.log(
    "endpoint    requests   fail   p50     p95     p99     max".padEnd(64)
  );
  console.log("-".repeat(64));

  let anyFailures = false;

  for (const [name, s] of stats) {
    const sorted = [...s.times].sort((a, b) => a - b);
    if (s.fail > 0) anyFailures = true;
    console.log(
      name.padEnd(12) +
        String(s.n).padEnd(11) +
        String(s.fail).padEnd(7) +
        `${percentile(sorted, 50)}ms`.padEnd(8) +
        `${percentile(sorted, 95)}ms`.padEnd(8) +
        `${percentile(sorted, 99)}ms`.padEnd(8) +
        `${sorted[sorted.length - 1]}ms`
    );
  }

  console.log("\nstatus codes");
  for (const [name, s] of stats) {
    const codes = [...s.statuses.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => `${code}×${count}`)
      .join("  ");
    console.log(`  ${name.padEnd(10)} ${codes}`);
  }

  /*
   * The number that matters is p95, not the mean.
   *
   * A mean of 200ms with a p95 of four seconds is a room where one viewer in
   * twenty sees the chat freeze, and they are the ones who will say the
   * webinar was broken.
   */
  const chat = stats.get("chat");
  if (chat) {
    const sorted = [...chat.times].sort((a, b) => a - b);
    const p95 = percentile(sorted, 95);
    console.log(
      `\nchat p95 ${p95}ms — ${
        p95 < 500
          ? "fine"
          : p95 < 1500
            ? "acceptable; watch it at double this load"
            : "too slow. One viewer in twenty sees the chat stall."
      }`
    );
  }

  if (anyFailures) {
    console.log(
      "\nThere were failures. A 429 is the rate limiter working; a 500 or a\n" +
        "timeout is not, and is worth chasing before raising the viewer count."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
