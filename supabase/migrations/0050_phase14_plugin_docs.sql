-- Phase 14: documentation for the plugin ecosystem shipped this phase.
-- Run after 0049_phase14_plugins_seed.sql.

insert into documentation_pages (slug, title, category, subcategory, position, content) values
('installing-plugins', 'Installing Plugins', 'Plugins', null, 1, $doc$
# Installing Plugins

Plugins add functionality to your webinars without touching any code —
confetti when your offer is clicked, a chat message when attendance hits a
milestone, and more.

## Installing one

From *Plugins* in your dashboard, browse the marketplace and open any
listing. Before installing, you'll see exactly what the plugin can do —
read the browser's chat, send chat messages, show an overlay on the video —
listed plainly, not buried in fine print. Nothing is granted beyond what's
shown there.

## Where an install applies

Install a plugin against one specific webinar, or leave it unscoped to
apply to every webinar on your account. Manage both from the *Installed*
tab, including per-plugin settings where a plugin defines any.

## Removing one

Uninstalling is immediate and reversible — your data isn't affected, and
you can reinstall the same plugin later with a clean settings slate.
$doc$),

('plugin-developer-guide', 'Plugin Developer Guide', 'Plugins', null, 2, $doc$
# Plugin Developer Guide

A plugin is a single HTML page, hosted anywhere over HTTPS, that runs inside
a sandboxed iframe on Loopinglive. It never gets access to the parent page —
everything it can see or do crosses a PostMessage bridge, checked against
the permissions you declare.

## The manifest

Every plugin has a manifest describing what it is and what it needs:

\`\`\`json
{
  "name": "Confetti Celebration",
  "slug": "confetti-celebration",
  "version": "1.0.0",
  "description": "Fires confetti when the offer is clicked.",
  "category": "engagement",
  "permissions": ["webinar:events:read", "ui:overlay:show"],
  "hooks": [{ "event": "offer.clicked", "handler": "onOfferClicked" }],
  "settings_schema": {
    "duration": { "type": "number", "label": "Duration (seconds)", "default": 3 }
  }
}
\`\`\`

`permissions` gates what your plugin is actually allowed to do — declaring a
hook for an event without `webinar:events:read` will be rejected at
submission. `settings_schema` describes any per-installation configuration a
host can adjust, rendered as a form automatically — you never build your own
settings UI.

## The bridge

Your plugin receives two message shapes from the host, and can send two
back. Every message is namespaced so you can filter out anything else that
might land in your iframe's message listener:

\`\`\`js
window.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || msg.ns !== "loopinglive-plugin") return;

  if (msg.type === "init") {
    // msg.permissions, msg.settings, msg.webinarId
  }
  if (msg.type === "event") {
    // msg.event (e.g. "offer.clicked"), msg.payload
  }
});

parent.postMessage({ ns: "loopinglive-plugin", type: "ready" }, "*");
\`\`\`

To act, send an action — only ones matching a permission you declared are
honoured:

\`\`\`js
parent.postMessage({
  ns: "loopinglive-plugin",
  type: "action",
  action: "overlay:show",
  payload: { html: "<div>🎉</div>", durationMs: 3000 }
}, "*");
\`\`\`

Available actions: `chat:send` (needs `chat:messages:write`), `overlay:show`
and `overlay:hide` (need `ui:overlay:show`).

## Events you can hook

`session.started`, `session.ended`, `registrant.joined`, `registrant.left`,
`chat.message.sent`, `offer.clicked`, `offer.purchased`, `poll.started`,
`poll.ended`, `video.milestone`.

## Testing before you submit

The [developer portal](/plugins/develop) includes a real sandbox — your
plugin runs in the exact same sandboxed iframe and speaks the exact same
bridge it will in production, with simulated events you trigger by hand and
a console showing every message it sends.

## Submitting for review

Submit your manifest and a `bundleUrl` from the developer portal. Review
takes up to 5 business days. Re-submitting the same slug replaces the
previous version and resets review — a changed bundle is a changed plugin.
$doc$),

('plugin-api-reference', 'Plugin API Reference', 'Plugins', null, 3, $doc$
# Plugin API Reference

## Permissions

| Permission | Grants |
|---|---|
| `webinar:events:read` | Receive `event` messages at all |
| `chat:messages:write` | The `chat:send` action |
| `ui:overlay:show` | The `overlay:show` / `overlay:hide` actions |
| `registration:fields:read` | Registration form field data in event payloads |
| `analytics:read` | Analytics data in event payloads |

## Host → plugin messages

**`init`** — sent once, right after your plugin sends `ready`.
\`\`\`ts
{ ns: "loopinglive-plugin", type: "init", webinarId: string, permissions: string[], settings: Record<string, unknown> }
\`\`\`

**`event`** — sent whenever a subscribed webinar event fires.
\`\`\`ts
{ ns: "loopinglive-plugin", type: "event", event: string, payload: unknown }
\`\`\`

## Plugin → host messages

**`ready`** — send this first, always. Nothing else is delivered until the host sees it.
\`\`\`ts
{ ns: "loopinglive-plugin", type: "ready" }
\`\`\`

**`action`**
\`\`\`ts
{ ns: "loopinglive-plugin", type: "action", action: "chat:send", payload: { message: string } }
{ ns: "loopinglive-plugin", type: "action", action: "overlay:show", payload: { html: string, durationMs?: number } }
{ ns: "loopinglive-plugin", type: "action", action: "overlay:hide" }
\`\`\`

**`log`** — shown in the sandbox's console during testing; ignored in production.
\`\`\`ts
{ ns: "loopinglive-plugin", type: "log", level: "info" | "warn" | "error", message: string }
\`\`\`

## Sandbox constraints

Your plugin's iframe is `sandbox="allow-scripts"` with no `allow-same-origin`
— it runs as an opaque origin with no access to cookies, localStorage, or
the parent window under any circumstance, regardless of what your code
attempts. `overlay:show` content itself renders in a second, separately
sandboxed iframe on the host side, for the same reason.
$doc$)

on conflict (slug) do nothing;
