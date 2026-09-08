"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";

import { ACTION_PERMISSION, BRIDGE_NAMESPACE, isPluginToHostMessage, type HostToPluginMessage } from "@/lib/plugins/bridge";
import { PLUGIN_EVENTS, type PluginEventType, type PluginManifest, type PluginPermission } from "@/lib/plugins/manifest";

type LogLine = { level: "info" | "warn" | "error" | "action"; message: string; at: number };

/**
 * Loads a plugin's bundle in a sandboxed iframe and drives it with simulated
 * events — the actual PostMessage bridge, running for real, just without a
 * live webinar session behind it. A plugin never gets the parent `window`;
 * everything it can do arrives as one of the two message shapes in
 * lib/plugins/bridge.ts, checked against its own declared permissions before
 * this component acts on it.
 */
export function PluginSandbox({
  bundleUrl,
  manifest,
}: {
  bundleUrl: string;
  manifest: PluginManifest;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [overlay, setOverlay] = useState<string | null>(null);

  const log = (level: LogLine["level"], message: string) =>
    setLogs((current) => [...current.slice(-49), { level, message, at: Date.now() }]);

  const post = useCallback((message: HostToPluginMessage) => {
    iframeRef.current?.contentWindow?.postMessage(message, "*");
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!isPluginToHostMessage(event.data)) return;

      const message = event.data;

      if (message.type === "ready") {
        setReady(true);
        log("info", "Plugin signalled ready.");
        post({
          ns: BRIDGE_NAMESPACE,
          type: "init",
          webinarId: "sandbox",
          permissions: manifest.permissions as PluginPermission[],
          settings: Object.fromEntries(
            Object.entries(manifest.settings_schema).map(([key, field]) => [key, field.default])
          ),
        });
        return;
      }

      if (message.type === "log") {
        log(message.level, message.message);
        return;
      }

      if (message.type === "action") {
        const required = ACTION_PERMISSION[message.action];
        if (required && !manifest.permissions.includes(required)) {
          log("error", `Blocked "${message.action}" — plugin did not declare ${required}.`);
          return;
        }

        if (message.action === "chat:send") {
          log("action", `chat:send → "${message.payload.message}"`);
        } else if (message.action === "overlay:show") {
          log("action", `overlay:show`);
          setOverlay(message.payload.html);
          if (message.payload.durationMs) {
            setTimeout(() => setOverlay(null), message.payload.durationMs);
          }
        } else if (message.action === "overlay:hide") {
          log("action", "overlay:hide");
          setOverlay(null);
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [manifest, post]);

  function simulate(eventType: PluginEventType) {
    log("info", `Simulating ${eventType}`);
    post({ ns: BRIDGE_NAMESPACE, type: "event", event: eventType, payload: { simulated: true, at: new Date().toISOString() } });
  }

  const hookedEvents = new Set(manifest.hooks.map((hook) => hook.event));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="relative overflow-hidden rounded-2xl border border-hairline bg-black" style={{ aspectRatio: "16/9" }}>
        <iframe
          ref={iframeRef}
          src={bundleUrl}
          sandbox="allow-scripts"
          title="Plugin sandbox"
          className="h-full w-full"
        />
        {overlay && (
          // A plugin's overlay HTML is untrusted content from an already
          // sandboxed source — it never touches the parent DOM. Rendering it
          // via dangerouslySetInnerHTML here would hand a plugin a direct
          // script-injection path into the actual host page, which is
          // exactly what the outer iframe sandbox exists to prevent. A
          // second nested sandboxed iframe (srcdoc, allow-scripts only, no
          // allow-same-origin) keeps it just as isolated as the plugin
          // itself.
          <iframe
            title="Plugin overlay"
            srcDoc={overlay}
            sandbox="allow-scripts"
            className="pointer-events-none absolute inset-0 h-full w-full border-0"
          />
        )}
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-hairline bg-surface p-4">
          <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
            Simulate an event
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PLUGIN_EVENTS.map((eventType) => (
              <button
                key={eventType}
                onClick={() => simulate(eventType)}
                disabled={!ready}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors disabled:opacity-40 ${
                  hookedEvents.has(eventType)
                    ? "border-accent/40 text-accent-soft hover:bg-accent/10"
                    : "border-hairline text-ink-faint hover:text-ink"
                }`}
              >
                <Play className="h-2.5 w-2.5" />
                {eventType}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl border border-hairline bg-void p-3 font-mono text-[11.5px]">
          {logs.length === 0 ? (
            <p className="text-ink-faint">Console output appears here.</p>
          ) : (
            logs.map((line, index) => (
              <p
                key={index}
                className={
                  line.level === "error"
                    ? "text-[#FF6B6B]"
                    : line.level === "warn"
                      ? "text-[#FFB020]"
                      : line.level === "action"
                        ? "text-accent-soft"
                        : "text-ink-muted"
                }
              >
                {line.message}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
