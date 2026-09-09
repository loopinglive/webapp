"use client";

import { Fragment, useState } from "react";
import { ChevronDown, Loader2, Pause, Play, Plus, Square, Trash2 } from "lucide-react";

import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { AbTestResults } from "@/components/intelligence/AbTestResults";
import {
  AB_TEST_TYPES,
  useAbTests,
  type AbTest,
  type AbTestResults as Results,
  type AbTestType,
} from "@/hooks/useAbTests";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<AbTest["status"], string> = {
  draft: "bg-surface-3 text-ink-muted",
  running: "bg-[#00C851]/15 text-[#00C851]",
  paused: "bg-[#FF9500]/15 text-[#FF9500]",
  completed: "bg-accent/15 text-accent",
};

export function AbTesting({ webinarId }: { webinarId: string }) {
  const { tests, loading, creating, error, createTest, setStatus, remove, fetchResults } =
    useAbTests(webinarId);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <>
      <SectionHeader
        title="A/B Tests"
        description="Test the copy a registrant sees after signing up — confirmations, reminders, follow-ups — against a real conversion outcome."
        action={
          <AdminButton onClick={() => setFormOpen((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            New test
          </AdminButton>
        }
      />

      <div className="px-6 py-6 lg:px-8">
        {formOpen && (
          <CreateTestForm
            creating={creating}
            onCancel={() => setFormOpen(false)}
            onCreate={async (input) => {
              const ok = await createTest(input);
              if (ok) setFormOpen(false);
            }}
          />
        )}

        {error && <p className="mb-4 text-[12.5px] text-[#FF3B3B]">{error}</p>}

        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : !tests || tests.length === 0 ? (
          <div className="grid h-40 place-items-center rounded-xl border border-dashed border-hairline text-[13px] text-ink-faint">
            No tests yet. Start one to compare two versions of your post-registration copy.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tests.map((test) => (
              <TestRow
                key={test.id}
                test={test}
                onSetStatus={setStatus}
                onRemove={remove}
                onFetchResults={fetchResults}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function TestRow({
  test,
  onSetStatus,
  onRemove,
  onFetchResults,
}: {
  test: AbTest;
  onSetStatus: (id: string, status: "running" | "paused" | "completed") => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onFetchResults: (id: string) => Promise<Results | null>;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const typeLabel = AB_TEST_TYPES.find((t) => t.id === test.test_type)?.label ?? test.test_type;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !results) {
      setLoadingResults(true);
      setResults(await onFetchResults(test.id));
      setLoadingResults(false);
    }
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface">
      <div
        onClick={() => void toggle()}
        className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3.5"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-ink">{test.name}</p>
          <p className="text-[11.5px] text-ink-faint">{typeLabel}</p>
        </div>

        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]",
            STATUS_STYLE[test.status]
          )}
        >
          {test.status}
        </span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {test.status !== "running" && test.status !== "completed" && (
            <IconButton title="Start" onClick={() => void onSetStatus(test.id, "running")}>
              <Play className="h-3.5 w-3.5" />
            </IconButton>
          )}
          {test.status === "running" && (
            <IconButton title="Pause" onClick={() => void onSetStatus(test.id, "paused")}>
              <Pause className="h-3.5 w-3.5" />
            </IconButton>
          )}
          {(test.status === "running" || test.status === "paused") && (
            <IconButton title="Complete" onClick={() => void onSetStatus(test.id, "completed")}>
              <Square className="h-3.5 w-3.5" />
            </IconButton>
          )}
          <IconButton title="Delete" onClick={() => void onRemove(test.id)} danger>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
          <ChevronDown className={cn("h-4 w-4 text-ink-faint transition-transform", open && "rotate-180")} />
        </div>
      </div>

      {open && (
        <div className="border-t border-hairline px-4 py-4">
          {loadingResults ? (
            <div className="grid h-24 place-items-center">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
            </div>
          ) : results ? (
            <AbTestResults test={test} results={results} />
          ) : (
            <p className="text-[12.5px] text-ink-faint">Could not load results.</p>
          )}
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-full p-1.5 transition-colors",
        danger
          ? "text-ink-faint hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]"
          : "text-ink-faint hover:bg-surface-2 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

function CreateTestForm({
  creating,
  onCancel,
  onCreate,
}: {
  creating: boolean;
  onCancel: () => void;
  onCreate: (input: {
    name: string;
    description: string;
    testType: AbTestType;
    variantAText: string;
    variantBText: string;
    trafficSplit: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [testType, setTestType] = useState<AbTestType>("confirmation_message");
  const [variantAText, setVariantAText] = useState("");
  const [variantBText, setVariantBText] = useState("");
  const [trafficSplit, setTrafficSplit] = useState(50);

  const valid = name.trim().length > 0 && variantAText.trim().length > 0 && variantBText.trim().length > 0;

  return (
    <Fragment>
      <div className="mb-6 rounded-xl border border-hairline bg-surface p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Test name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Shorter confirmation copy" />
          </Field>
          <Field label="What's being tested">
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as AbTestType)}
              className="h-11 w-full rounded-lg border border-surface-3 bg-surface-2 px-3.5 text-[13.5px] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              {AB_TEST_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description" className="mt-4" hint="Optional">
          <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Variant A" required>
            <TextArea rows={3} value={variantAText} onChange={(e) => setVariantAText(e.target.value)} />
          </Field>
          <Field label="Variant B" required>
            <TextArea rows={3} value={variantBText} onChange={(e) => setVariantBText(e.target.value)} />
          </Field>
        </div>

        <Field label="Traffic to variant A" hint={`${trafficSplit}% / ${100 - trafficSplit}%`} className="mt-4 max-w-sm">
          <input
            type="range"
            min={10}
            max={90}
            value={trafficSplit}
            onChange={(e) => setTrafficSplit(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </Field>

        <div className="mt-5 flex items-center gap-2">
          <AdminButton
            disabled={!valid || creating}
            onClick={() =>
              void onCreate({ name, description, testType, variantAText, variantBText, trafficSplit })
            }
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create test
          </AdminButton>
          <AdminButton variant="ghost" onClick={onCancel}>
            Cancel
          </AdminButton>
        </div>
      </div>
    </Fragment>
  );
}
