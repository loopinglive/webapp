"use client";

import { VARIABLE_GROUPS } from "@/lib/messaging/templates";

/**
 * The merge fields, as clickable chips.
 *
 * Only shows what this template can actually resolve — offering {{replay_link}}
 * on a reminder that fires before the session would insert a placeholder that
 * silently renders as nothing.
 */
export function VariableHelper({
  allowed,
  onInsert,
}: {
  allowed: string[];
  onInsert: (variable: string) => void;
}) {
  const groups = VARIABLE_GROUPS.map((group) => ({
    ...group,
    variables: group.variables.filter((variable) => allowed.includes(variable.key)),
  })).filter((group) => group.variables.length);

  if (!groups.length) return null;

  return (
    <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
        Insert a variable
      </p>

      <div className="mt-3 space-y-3">
        {groups.map((group) => (
          <div key={group.group}>
            <p className="text-[10.5px] text-[#A0A0B0]/70">{group.group}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {group.variables.map((variable) => (
                <button
                  key={variable.key}
                  type="button"
                  title={variable.description}
                  onClick={() => onInsert(`{{${variable.key}}}`)}
                  className="rounded-full bg-[#2A2A3A] px-2.5 py-1 font-mono text-[11px] text-[#6C47FF] transition-colors hover:bg-[#6C47FF]/20 hover:text-white"
                >
                  {`{{${variable.key}}}`}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
