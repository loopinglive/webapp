import type { SetupChecklist } from "@/types";

// Client-safe half of the setup rules. Kept apart from lib/admin-setup.ts so
// the sidebar can import the step list without dragging the service-role
// Supabase client into the browser bundle.

/** Engagement items are optional; everything else gates publishing. */
export const REQUIRED_STEPS: (keyof SetupChecklist)[] = [
  "video",
  "schedule",
  "personas",
  "comments",
  "offer",
  "ai",
];

export const MIN_COMMENTS = 5;

export const STEP_LABELS: Record<keyof SetupChecklist, string> = {
  video: "Upload a video",
  schedule: "Add a schedule",
  personas: "Create a persona",
  comments: `Add at least ${MIN_COMMENTS} timed comments`,
  engagement: "Add engagement items",
  offer: "Configure the offer",
  ai: "Configure the AI moderators",
};

export function isPublishable(checklist: SetupChecklist) {
  return REQUIRED_STEPS.every((step) => checklist[step]);
}

export function missingSteps(checklist: SetupChecklist) {
  return REQUIRED_STEPS.filter((step) => !checklist[step]).map(
    (step) => STEP_LABELS[step]
  );
}
