"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "loopinglive:install-dismissed";

/** A small floating "Install app" prompt, shown once the browser offers it. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDismissed(sessionStorage.getItem(DISMISSED_KEY) === "1");
    }, 0);

    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[150] flex items-center gap-3 rounded-xl border border-[#2A2A3A] bg-[#12121A] px-4 py-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,.7)]">
      <Download className="h-4 w-4 shrink-0 text-[#6C47FF]" />
      <p className="text-[12.5px] text-white">Install Loopinglive for quicker access.</p>
      <button
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
        className="shrink-0 rounded-full bg-[#6C47FF] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#7C5AFF]"
      >
        Install
      </button>
      <button
        onClick={() => {
          sessionStorage.setItem(DISMISSED_KEY, "1");
          setDismissed(true);
        }}
        aria-label="Dismiss"
        className="shrink-0 text-[#6E6E80] hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
