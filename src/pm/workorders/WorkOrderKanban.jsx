import { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  Paperclip,
  MessageSquare,
} from 'lucide-react';
import { PriorityBadge } from '../badges.jsx';

const COLUMN_DEFS = [
  {
    id: 'assigned',
    title: 'Assigned',
    accent: 'border-blue-500/40 text-blue-400',
    dot: 'bg-blue-400',
    bg: 'bg-blue-500/5',
  },
  {
    id: 'not-started',
    title: 'Not Started',
    accent: 'border-zinc-500/40 text-zinc-400',
    dot: 'bg-zinc-400',
    bg: 'bg-zinc-500/5',
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    accent: 'border-amber-500/40 text-amber-400',
    dot: 'bg-amber-400',
    bg: 'bg-amber-500/5',
  },
  {
    id: 'completed',
    title: 'Completed',
    accent: 'border-emerald-500/40 text-emerald-400',
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/5',
  },
  {
    id: 'rejected',
    title: 'Rejected',
    accent: 'border-rose-500/40 text-rose-400',
    dot: 'bg-rose-400',
    bg: 'bg-rose-500/5',
  },
];

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(`${iso}T00:00:00`).getTime() - Date.now()) / 86400000);
}

export default function WorkOrderKanban({
  workOrders = [],
  projects = [],
  ptds = [],
  users = [],
  blockers = [],
  dark,
  onSelectWorkOrder,
  onUpdateStatus,
  onQuickLogHours,
}) {
  const [menuOpenId, setMenuOpenId] = useState(null);

  const getProject = (id) => projects.find((p) => p.id === id);
  const getPtd = (id) => ptds.find((p) => p.id === id);
  const getUser = (id) => users.find((u) => u.id === id);
  const getActiveBlocker = (woId) =>
    blockers.find((b) => b.workOrderId === woId && b.status === 'open');

  const borderCls = dark ? 'border-zinc-800/80' : 'border-zinc-200';
  const cardBg = dark
    ? 'bg-zinc-900/90 hover:bg-zinc-850 border-zinc-800 shadow-lg shadow-black/20'
    : 'bg-white hover:bg-zinc-50/90 border-zinc-200 shadow-md shadow-zinc-200/50';
  const mutedText = dark ? 'text-zinc-400' : 'text-zinc-500';
  const headingText = dark ? 'text-zinc-100' : 'text-zinc-800';

  return (
    <div className="flex w-full gap-4 overflow-x-auto pb-6 pt-1">
      {COLUMN_DEFS.map((col) => {
        const colWos = workOrders.filter((w) => w.status === col.id);
        const colEstimated = colWos.reduce((s, w) => s + (w.estimatedHours || 0), 0);
        const colActual = colWos.reduce((s, w) => s + (w.actualHours || 0), 0);

        return (
          <div
            key={col.id}
            className={`flex w-76 sm:w-80 shrink-0 flex-col rounded-2xl border p-3.5 backdrop-blur-md transition-all ${
              dark ? 'border-zinc-800/80 bg-zinc-950/60' : 'border-zinc-200/80 bg-zinc-100/70'
            }`}
          >
            {/* Column Header */}
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${headingText}`}>
                  {col.title}
                </h3>
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
                  }`}
                >
                  {colWos.length}
                </span>
              </div>
              <span className={`text-[11px] font-medium tabular-nums ${mutedText}`}>
                {colActual}h / {colEstimated}h
              </span>
            </div>

            {/* Column Cards Container */}
            <div className="flex flex-1 flex-col gap-3 min-h-[300px]">
              {colWos.map((wo) => {
                const project = getProject(wo.projectId);
                const ptd = getPtd(wo.ptdId);
                const assignee = getUser(wo.assignee);
                const activeBlocker = getActiveBlocker(wo.id);
                const daysLeft = daysUntil(wo.dueDate);
                const isOverdue =
                  wo.status !== 'completed' && daysLeft !== null && daysLeft < 0;
                const isDueSoon =
                  wo.status !== 'completed' && daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;

                const checklist = wo.checklist || [];
                const checklistDone = checklist.filter((c) => c.done).length;
                const checklistTotal = checklist.length;

                const hoursPct =
                  wo.estimatedHours > 0
                    ? Math.round(((wo.actualHours || 0) / wo.estimatedHours) * 100)
                    : 0;

                return (
                  <div
                    key={wo.id}
                    onClick={() => onSelectWorkOrder(wo.id)}
                    className={`group relative flex cursor-pointer flex-col rounded-xl border p-4 transition-all duration-150 hover:-translate-y-0.5 ${cardBg} ${
                      activeBlocker ? 'ring-1 ring-red-500/40' : ''
                    }`}
                  >
                    {/* Top Row: Priority & Project / PTD pill */}
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <PriorityBadge priority={wo.priority} />
                        {ptd && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {ptd.ref || ptd.name}
                          </span>
                        )}
                      </div>

                      {/* Card Action Menu Toggle */}
                      <div
                        className="relative"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === wo.id ? null : wo.id);
                        }}
                      >
                        <button
                          className={`rounded p-1 transition-colors ${
                            dark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
                          }`}
                          title="Actions"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>

                        {menuOpenId === wo.id && (
                          <div
                            className={`absolute right-0 top-6 z-30 w-44 rounded-xl border p-1 shadow-2xl backdrop-blur-xl ${
                              dark
                                ? 'border-zinc-700 bg-zinc-900/95 text-zinc-200'
                                : 'border-zinc-200 bg-white/95 text-zinc-800'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              Move Status
                            </div>
                            {COLUMN_DEFS.map((c) => (
                              <button
                                key={c.id}
                                disabled={wo.status === c.id}
                                onClick={() => {
                                  onUpdateStatus(wo.id, c.id);
                                  setMenuOpenId(null);
                                }}
                                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer disabled:opacity-40 ${
                                  dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                                }`}
                              >
                                <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                                {c.title}
                              </button>
                            ))}
                            <div className={`my-1 border-t ${borderCls}`} />
                            <button
                              onClick={() => {
                                onQuickLogHours(wo);
                                setMenuOpenId(null);
                              }}
                              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-violet-500 transition-colors cursor-pointer ${
                                dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                              }`}
                            >
                              <Clock className="h-3.5 w-3.5" />
                              Log Hours
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Work Order Title & Project Context */}
                    <h4 className={`text-sm font-semibold leading-snug line-clamp-2 ${headingText}`}>
                      {wo.title}
                    </h4>
                    {project && (
                      <p className={`mt-0.5 text-xs font-medium truncate ${mutedText}`}>
                        {project.name}
                      </p>
                    )}

                    {/* Active Blocker Alert Flag if any */}
                    {activeBlocker && (
                      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 animate-pulse text-red-400" />
                        <span className="truncate">{activeBlocker.description}</span>
                      </div>
                    )}

                    {/* Developer Rejection Remark Callout */}
                    {wo.status === 'rejected' && wo.rejectionRemark && (
                      <div className="mt-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-300">
                        <span className="font-bold text-rose-400 block mb-0.5">Rejected by Dev:</span>
                        <span className="line-clamp-2 italic">"{wo.rejectionRemark}"</span>
                      </div>
                    )}

                    {/* Hours Progress Bar */}
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className={`tabular-nums ${mutedText}`}>
                          <strong className={headingText}>{wo.actualHours || 0}h</strong> /{' '}
                          {wo.estimatedHours}h
                        </span>
                        <span
                          className={`font-semibold tabular-nums ${
                            hoursPct > 100
                              ? 'text-red-400'
                              : hoursPct >= 80
                              ? 'text-amber-400'
                              : 'text-violet-400'
                          }`}
                        >
                          {hoursPct}%
                        </span>
                      </div>
                      <div
                        className={`h-1.5 w-full overflow-hidden rounded-full ${
                          dark ? 'bg-zinc-800' : 'bg-zinc-200'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all ${
                            hoursPct > 100
                              ? 'bg-red-500'
                              : hoursPct >= 80
                              ? 'bg-amber-500'
                              : 'bg-violet-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, hoursPct))}%` }}
                        />
                      </div>
                    </div>

                    {/* Card Footer: Assignee, Checklist Count, Due Date */}
                    <div className={`mt-3.5 flex items-center justify-between border-t pt-2.5 text-xs ${borderCls}`}>
                      {/* Assignee Avatar / Name */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            assignee ? 'bg-gradient-to-tr from-violet-600 to-indigo-500' : 'bg-zinc-500'
                          }`}
                        >
                          {assignee ? assignee.name.slice(0, 2).toUpperCase() : '?'}
                        </div>
                        <span className={`truncate text-[11px] font-medium ${mutedText}`}>
                          {assignee ? assignee.name.split(' ')[0] : 'Unassigned'}
                        </span>
                      </div>

                      {/* Meta badges: Checklist & Date */}
                      <div className="flex items-center gap-2 shrink-0">
                        {checklistTotal > 0 && (
                          <div
                            className={`flex items-center gap-1 text-[11px] font-medium tabular-nums ${
                              checklistDone === checklistTotal ? 'text-emerald-400' : mutedText
                            }`}
                            title="Checklist items completed"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>
                              {checklistDone}/{checklistTotal}
                            </span>
                          </div>
                        )}

                        {wo.comments?.length > 0 && (
                          <div className={`flex items-center gap-0.5 text-[11px] ${mutedText}`}>
                            <MessageSquare className="h-3 w-3" />
                            <span>{wo.comments.length}</span>
                          </div>
                        )}

                        {wo.files?.length > 0 && (
                          <div className={`flex items-center gap-0.5 text-[11px] ${mutedText}`}>
                            <Paperclip className="h-3 w-3" />
                            <span>{wo.files.length}</span>
                          </div>
                        )}

                        {wo.dueDate && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                              isOverdue
                                ? 'bg-red-500/20 text-red-400 font-bold border border-red-500/30'
                                : isDueSoon
                                ? 'bg-amber-500/20 text-amber-400'
                                : dark
                                ? 'bg-zinc-800 text-zinc-400'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {isOverdue ? `Overdue` : wo.dueDate.slice(5)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {colWos.length === 0 && (
                <div
                  className={`flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center ${borderCls}`}
                >
                  <span className={`text-xs ${mutedText}`}>No work orders in this stage</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
