import { redirect } from "next/navigation";

/**
 * This page never had a working webinar list or a working "create" button —
 * both were static UI with nowhere to go. The real webinar list and the real
 * creation form live under /admin, which is where anything that links here
 * now points directly; this redirect is only a safety net for old links or
 * anyone with this URL bookmarked.
 */
export default function WebinarsRedirect() {
  redirect("/admin/dashboard");
}
