"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame, TooltipBox } from "@/components/analytics/ChartFrame";
import {
  CATEGORICAL,
  CHART,
  seriesColour,
  sequentialStep,
  STATUS,
} from "@/lib/analytics/palette";
import { formatOffset } from "@/lib/utils";

const axis = {
  stroke: CHART.axis,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const grid = <CartesianGrid stroke={CHART.grid} vertical={false} />;

const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/* ── Registrations and attendees over time ───────────────────────────────── */

export function TimeSeriesChart({
  data,
}: {
  data: { day: string; registrations: number; attendees: number }[];
}) {
  return (
    <ChartFrame
      title="Registrations and attendees"
      legend={[
        { label: "Registered", colour: CATEGORICAL[0] },
        { label: "Attended", colour: CATEGORICAL[2] },
      ]}
      empty={
        data.length
          ? null
          : "No registrations in this range. Try widening the date range."
      }
    >
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            {grid}
            <XAxis dataKey="day" tickFormatter={shortDay} {...axis} />
            <YAxis allowDecimals={false} width={44} {...axis} />
            <Tooltip
              cursor={{ stroke: CHART.grid }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={shortDay(String(label))}
                    rows={payload.map((p) => ({
                      label: String(p.name),
                      value: String(p.value),
                      colour: p.color,
                    }))}
                  />
                ) : null
              }
            />
            <Line
              type="monotone"
              dataKey="registrations"
              name="Registered"
              stroke={CATEGORICAL[0]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
            />
            <Line
              type="monotone"
              dataKey="attendees"
              name="Attended"
              stroke={CATEGORICAL[2]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

/* ── Watch depth ─────────────────────────────────────────────────────────── */

export function RetentionCurve({
  data,
  biggestDrop,
  durationSeconds,
}: {
  data: { percent: number; viewers: number; share: number }[];
  biggestDrop: { fromPercent: number; toPercent: number; lost: number } | null;
  durationSeconds: number | null;
}) {
  // The insight is the sentence, not the shape.
  const note =
    biggestDrop && biggestDrop.lost > 0
      ? `Biggest drop-off between ${biggestDrop.fromPercent}% and ${biggestDrop.toPercent}%` +
        (durationSeconds
          ? ` — around ${formatOffset(Math.round((biggestDrop.fromPercent / 100) * durationSeconds))} in.`
          : ".")
      : "Share of attendees still watching at each point in the video.";

  return (
    <ChartFrame
      title="Watch depth"
      note={note}
      empty={data.every((d) => d.viewers === 0) ? "Nobody has attended yet." : null}
    >
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="retentionFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CATEGORICAL[0]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={CATEGORICAL[0]} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {grid}
            <XAxis
              dataKey="percent"
              tickFormatter={(v) => `${v}%`}
              {...axis}
            />
            <YAxis allowDecimals={false} width={44} {...axis} />
            {biggestDrop && biggestDrop.lost > 0 && (
              <ReferenceLine
                x={biggestDrop.toPercent}
                stroke={STATUS.warning}
                strokeDasharray="3 3"
              />
            )}
            <Tooltip
              cursor={{ stroke: CHART.grid }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={`${label}% of the video`}
                    rows={[
                      {
                        label: "Still watching",
                        value: `${payload[0].payload.viewers} (${payload[0].payload.share}%)`,
                        colour: CATEGORICAL[0],
                      },
                    ]}
                  />
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="viewers"
              name="Still watching"
              stroke={CATEGORICAL[0]}
              strokeWidth={2}
              fill="url(#retentionFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

/* ── Funnel ──────────────────────────────────────────────────────────────── */

export function FunnelChart({
  stages,
}: {
  stages: { label: string; value: number; ofPrevious: number | null }[];
}) {
  const top = stages[0]?.value ?? 0;

  return (
    <ChartFrame
      title="Funnel"
      note="Each step as a share of the one above it."
      empty={top ? null : "No registrations in this range."}
    >
      <ul className="flex flex-col gap-2.5">
        {stages.map((stage, index) => {
          const width = top ? Math.max(2, (stage.value / top) * 100) : 0;
          return (
            <li key={stage.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-[12.5px] text-white">{stage.label}</span>
                <span className="flex items-baseline gap-2 text-[12px]">
                  <span className="font-medium tabular-nums text-white">
                    {stage.value.toLocaleString()}
                  </span>
                  {stage.ofPrevious !== null && (
                    <span
                      className="tabular-nums"
                      style={{
                        color:
                          stage.ofPrevious >= 50
                            ? STATUS.good
                            : stage.ofPrevious >= 20
                              ? CHART.muted
                              : STATUS.warning,
                      }}
                      title={`${stage.value} of ${stages[index - 1].value}`}
                    >
                      {stage.ofPrevious}%
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#1A1A2A]">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${width}%`, background: seriesColour(index) }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </ChartFrame>
  );
}

/* ── Ranked breakdown ────────────────────────────────────────────────────── */

export function BreakdownBars({
  title,
  note,
  data,
  empty,
  /** Colour per row where the categories are an identity (device); otherwise one hue. */
  categorical = false,
}: {
  title: string;
  note?: string;
  data: { label: string; value: number; share: number }[];
  empty?: string | null;
  categorical?: boolean;
}) {
  // Past the palette, fold the tail into "Other" rather than inventing hues.
  const rows = data.slice(0, 6);
  const tail = data.slice(6);
  if (tail.length) {
    rows.push({
      label: `Other (${tail.length})`,
      value: tail.reduce((sum, r) => sum + r.value, 0),
      share: Math.round(tail.reduce((sum, r) => sum + r.share, 0) * 10) / 10,
    });
  }

  const max = rows[0]?.value ?? 0;

  return (
    <ChartFrame title={title} note={note} empty={data.length ? empty ?? null : empty ?? "Nothing recorded yet."}>
      <ul className="flex flex-col gap-2.5">
        {rows.map((row, index) => (
          <li key={row.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[12.5px] text-white">
                {row.label}
              </span>
              <span className="shrink-0 text-[12px] tabular-nums text-[#A0A0B0]">
                {row.value.toLocaleString()}
                <span className="ml-1.5 text-[#6A6A80]">{row.share}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#1A1A2A]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${max ? Math.max(2, (row.value / max) * 100) : 0}%`,
                  background: categorical ? seriesColour(index) : CATEGORICAL[0],
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}

/* ── Best time slots ─────────────────────────────────────────────────────── */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TimeSlotHeatmap({
  data,
}: {
  data: { weekday: number; hour: number; sessions: number; attendanceRate: number }[];
}) {
  const max = data.reduce((m, d) => Math.max(m, d.attendanceRate), 0);
  const hours = [...new Set(data.map((d) => d.hour))].sort((a, b) => a - b);
  const byKey = new Map(data.map((d) => [`${d.weekday}-${d.hour}`, d]));

  return (
    <ChartFrame
      title="Best time slots"
      note="Average attendance rate by day and hour, UTC."
      empty={data.length ? null : "No sessions have run yet."}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-[2px]">
          <thead>
            <tr>
              <th className="w-10" />
              {hours.map((hour) => (
                <th
                  key={hour}
                  className="pb-1 text-[10px] font-medium tabular-nums text-[#6A6A80]"
                >
                  {String(hour).padStart(2, "0")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((label, weekday) => (
              <tr key={label}>
                <th className="pr-2 text-right text-[10.5px] font-medium text-[#A0A0B0]">
                  {label}
                </th>
                {hours.map((hour) => {
                  const cell = byKey.get(`${weekday}-${hour}`);
                  return (
                    <td key={hour}>
                      <div
                        title={
                          cell
                            ? `${label} ${String(hour).padStart(2, "0")}:00 — ${cell.attendanceRate}% attendance across ${cell.sessions} session${cell.sessions === 1 ? "" : "s"}`
                            : `${label} ${String(hour).padStart(2, "0")}:00 — no sessions`
                        }
                        className="h-7 rounded-[3px]"
                        style={{
                          background: cell
                            ? sequentialStep(cell.attendanceRate, max)
                            : "#15151F",
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartFrame>
  );
}

/* ── Session: viewers and chat, both on the video-offset axis ────────────── */

export function ViewerTimeline({
  data,
  fromSnapshots,
  dropOffs,
}: {
  data: { offset: number; viewers: number }[];
  fromSnapshots: boolean;
  dropOffs: { offset: number; lost: number }[];
}) {
  return (
    <ChartFrame
      title="Viewers during the session"
      note={
        fromSnapshots
          ? "Captured every minute while the session ran."
          : "Reconstructed from join and leave events."
      }
      empty={data.length ? null : "No attendance recorded for this session."}
    >
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="viewerFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CATEGORICAL[0]} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CATEGORICAL[0]} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {grid}
            <XAxis dataKey="offset" tickFormatter={(v) => formatOffset(v)} {...axis} />
            <YAxis allowDecimals={false} width={44} {...axis} />
            {dropOffs.map((drop) => (
              <ReferenceLine
                key={drop.offset}
                x={drop.offset}
                stroke={STATUS.critical}
                strokeDasharray="3 3"
              />
            ))}
            <Tooltip
              cursor={{ stroke: CHART.grid }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={formatOffset(Number(label))}
                    rows={[
                      {
                        label: "Watching",
                        value: String(payload[0].value),
                        colour: CATEGORICAL[0],
                      },
                    ]}
                  />
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="viewers"
              name="Watching"
              stroke={CATEGORICAL[0]}
              strokeWidth={2}
              fill="url(#viewerFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function ChatActivityChart({
  data,
}: {
  data: { offset: number; real: number; scripted: number }[];
}) {
  return (
    <ChartFrame
      title="Chat activity"
      note="Messages per minute. The gap between the two is the engagement signal."
      legend={[
        { label: "Real attendees", colour: CATEGORICAL[0] },
        { label: "Scripted", colour: CATEGORICAL[4] },
      ]}
      empty={data.length ? null : "No messages in this session."}
    >
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            {grid}
            <XAxis dataKey="offset" tickFormatter={(v) => formatOffset(v)} {...axis} />
            <YAxis allowDecimals={false} width={44} {...axis} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={formatOffset(Number(label))}
                    rows={payload.map((p) => ({
                      label: String(p.name),
                      value: String(p.value),
                      colour: p.color,
                    }))}
                  />
                ) : null
              }
            />
            {/* Stacked with a 2px surface gap so the segments stay separable. */}
            <Bar dataKey="real" name="Real attendees" stackId="chat" fill={CATEGORICAL[0]} />
            <Bar
              dataKey="scripted"
              name="Scripted"
              stackId="chat"
              fill={CATEGORICAL[4]}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function OfferClickChart({
  data,
  revealOffset,
}: {
  data: { offset: number; clicks: number }[];
  revealOffset: number | null;
}) {
  return (
    <ChartFrame
      title="Offer click timing"
      note={
        revealOffset !== null
          ? `The offer appears at ${formatOffset(revealOffset)}. Clicks clustered long after it suggest the trigger is early.`
          : "When people clicked, relative to the session."
      }
      empty={data.length ? null : "Nobody clicked the offer in this session."}
    >
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            {grid}
            <XAxis dataKey="offset" tickFormatter={(v) => formatOffset(v)} {...axis} />
            <YAxis allowDecimals={false} width={44} {...axis} />
            {revealOffset !== null && (
              <ReferenceLine x={revealOffset} stroke={STATUS.attention} strokeDasharray="3 3" />
            )}
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={formatOffset(Number(label))}
                    rows={[{ label: "Clicks", value: String(payload[0].value), colour: STATUS.attention }]}
                  />
                ) : null
              }
            />
            <Bar dataKey="clicks" name="Clicks" radius={[3, 3, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.offset} fill={STATUS.attention} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
