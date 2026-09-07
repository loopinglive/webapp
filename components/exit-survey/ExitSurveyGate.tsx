"use client";

import { useEffect, useState } from "react";

import { readRegistrant } from "@/lib/registrant-storage";
import { ExitSurveyModal } from "@/components/exit-survey/ExitSurveyModal";

type Question = {
  id: string;
  type: "multiple_choice" | "rating" | "text" | "yes_no" | "nps";
  label: string;
  options?: string[];
};

/**
 * Sits on the "webinar has ended" page. Reads the registrant this browser
 * left behind, checks whether the webinar has an active exit survey, and
 * shows it once — dismissing for good (per browser) once answered or skipped.
 */
export function ExitSurveyGate({ webinarId }: { webinarId: string }) {
  const [survey, setSurvey] = useState<{ id: string; title: string; questions: Question[] } | null>(
    null
  );
  const [registrantId, setRegistrantId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const seenKey = `loopinglive:exit-survey-seen:${webinarId}`;
      if (sessionStorage.getItem(seenKey)) return;

      const registrant = readRegistrant(webinarId);
      if (!registrant) return;
      setRegistrantId(registrant.id);

      fetch(`/api/webinar/${webinarId}/exit-survey`, { cache: "no-store" })
        .then((res) => res.json())
        .then((payload) => {
          if (payload.survey?.questions?.length) setSurvey(payload.survey);
        })
        .catch(() => {});
    }, 0);

    return () => clearTimeout(timer);
  }, [webinarId]);

  function close() {
    sessionStorage.setItem(`loopinglive:exit-survey-seen:${webinarId}`, "1");
    setDismissed(true);
  }

  if (!survey || !registrantId || dismissed) return null;

  return (
    <ExitSurveyModal
      webinarId={webinarId}
      registrantId={registrantId}
      sessionId={null}
      title={survey.title}
      questions={survey.questions}
      onDone={close}
    />
  );
}
