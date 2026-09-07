"use client";

import { useState } from "react";
import { Download, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { useSmartSegments, type SegmentMember, type SmartSegment } from "@/hooks/useSmartSegments";
import type { Condition, ConditionField, ConditionOperator } from "@/lib/intelligence/personalisation";

const FIELDS: { id: ConditionField; label: string }[] = [
  { id: "deviceType", label: "Device type" },
  { id: "countryCode", label: "Country code" },
  { id: "returningAttendee", label: "Returning attendee" },
  { id: "watchPercentage", label: "Watch percentage" },
  { id: "clickedOffer", label: "Clicked the offer" },
  { id: "utmSource", label: "UTM source" },
];

const OPERATORS: { id: ConditionOperator; label: string }[] = [
  { id: "equals", label: "equals" },
  { id: "not_equals", label: "does not equal" },
  { id: "greater_than", label: "is greater than" },
  { id: "less_than", label: "is less than" },
  { id: "contains", label: "contains" },
];

function fieldLabel(field: ConditionField) {
  return FIELDS.find((f) => f.id === field)?.label ?? field;
}

export function SmartSegments({ webinarId }: { webinarId: string }) {
  const { segments, loading, creating, error, createSegment, refresh, remove, fetchMembers } =
    useSmartSegments(webinarId);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <>
      <SectionHeader
        title="Smart Segments"
        description="Named, saved audiences built from the same condition language as Personalisation — view, recalculate, or export their members."
        action={
          <AdminButton onClick={() => setFormOpen((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            New segment
          </AdminButton>
        }
      />

      <div className="px-6 py-6 lg:px-8">
        {formOpen && (
          <SegmentForm
            creating={creating}
            onCancel={() => setFormOpen(false)}
            onCreate={async (input) => {
              const ok = await createSegment(input);
              if (ok) setFormOpen(false);
            }}
          />
        )}

        {error && <p className="mb-4 text-[12.5px] text-[#FF3B3B]">{error}</p>}

        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
          </div>
        ) : !segments || segments.length === 0 ? (
          <div className="grid h-32 place-items-center rounded-xl border border-dashed border-[#1E1E2E] text-[13px] text-[#6A6A80]">
            No segments yet. Build one to see who fits it right now.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {segments.map((segment) => (
              <SegmentRow
                key={segment.id}
                segment={segment}
                onRefresh={refresh}
                onRemove={remove}
                onFetchMembers={fetchMembers}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function downloadCsv(name: string, members: SegmentMember[]) {
  const rows = [["Full name", "Email"], ...members.map((m) => [m.full_name, m.email])];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function SegmentRow({
  segment,
  onRefresh,
  onRemove,
  onFetchMembers,
}: {
  segment: SmartSegment;
  onRefresh: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onFetchMembers: (id: string) => Promise<SegmentMember[]>;
}) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<SegmentMember[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !members) {
      setLoadingMembers(true);
      setMembers(await onFetchMembers(segment.id));
      setLoadingMembers(false);
    }
  }

  async function doRefresh() {
    setRefreshing(true);
    await onRefresh(segment.id);
    setMembers(null);
    setRefreshing(false);
  }

  return (
    <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A]">
      <div onClick={() => void toggle()} className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-white">{segment.name}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-[#6A6A80]">
            {segment.conditions.length === 0
              ? "Everyone"
              : segment.conditions
                  .map((c: Condition) => `${fieldLabel(c.field)} ${c.operator.replace("_", " ")} ${c.value}`)
                  .join(" and ")}
          </p>
        </div>
        <span className="rounded-full bg-[#6C47FF]/15 px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-[#6C47FF]">
          {segment.registrant_count}
        </span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton title="Recalculate" onClick={() => void doRefresh()}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </IconButton>
          <IconButton title="Delete" danger onClick={() => void onRemove(segment.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#1E1E2E] px-4 py-3">
          {loadingMembers ? (
            <div className="grid h-16 place-items-center">
              <Loader2 className="h-4 w-4 animate-spin text-[#6C47FF]" />
            </div>
          ) : members && members.length > 0 ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11.5px] text-[#6A6A80]">{members.length} members</p>
                <button
                  onClick={() => downloadCsv(segment.name, members)}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[#6C47FF] hover:text-[#7C5AFF]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between border-b border-[#1E1E2E] py-1.5 text-[12.5px]">
                    <span className="text-white">{member.full_name}</span>
                    <span className="text-[#6A6A80]">{member.email}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[12.5px] text-[#6A6A80]">No one currently matches this segment.</p>
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
      className={`rounded-full p-1.5 transition-colors ${danger ? "text-[#6A6A80] hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]" : "text-[#6A6A80] hover:bg-white/5 hover:text-white"}`}
    >
      {children}
    </button>
  );
}

function SegmentForm({
  creating,
  onCancel,
  onCreate,
}: {
  creating: boolean;
  onCancel: () => void;
  onCreate: (input: { name: string; description: string; conditions: Condition[] }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([
    { field: "deviceType", operator: "equals", value: "mobile" },
  ]);

  const valid = name.trim().length > 0;

  return (
    <div className="mb-6 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4">
      <Field label="Segment name" required>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Engaged mobile visitors" />
      </Field>

      <Field label="Description" className="mt-4" hint="Optional">
        <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <div className="mt-4">
        <p className="mb-2 text-[12px] font-medium text-[#A0A0B0]">
          Conditions <span className="text-[#6A6A80]">(all must match)</span>
        </p>
        <div className="flex flex-col gap-2">
          {conditions.map((condition, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <select
                value={condition.field}
                onChange={(e) => {
                  const next = [...conditions];
                  next[index] = { ...next[index], field: e.target.value as ConditionField };
                  setConditions(next);
                }}
                className="h-10 rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-3 text-[13px] text-white focus:border-[#6C47FF] focus:outline-none"
              >
                {FIELDS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                value={condition.operator}
                onChange={(e) => {
                  const next = [...conditions];
                  next[index] = { ...next[index], operator: e.target.value as ConditionOperator };
                  setConditions(next);
                }}
                className="h-10 rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-3 text-[13px] text-white focus:border-[#6C47FF] focus:outline-none"
              >
                {OPERATORS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <TextInput
                value={String(condition.value)}
                onChange={(e) => {
                  const next = [...conditions];
                  next[index] = { ...next[index], value: e.target.value };
                  setConditions(next);
                }}
                className="h-10 w-40"
                placeholder="value"
              />
              <button
                onClick={() => setConditions(conditions.filter((_, i) => i !== index))}
                className="rounded-full p-1.5 text-[#6A6A80] hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setConditions([...conditions, { field: "deviceType", operator: "equals", value: "" }])}
          className="mt-2 text-[12px] font-medium text-[#6C47FF] hover:text-[#7C5AFF]"
        >
          + Add condition
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <AdminButton disabled={!valid || creating} onClick={() => void onCreate({ name, description, conditions })}>
          {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create segment
        </AdminButton>
        <AdminButton variant="ghost" onClick={onCancel}>
          Cancel
        </AdminButton>
      </div>
    </div>
  );
}
