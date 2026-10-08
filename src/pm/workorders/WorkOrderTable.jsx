import { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { PriorityBadge, WoStatusBadge } from '../badges.jsx';

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(`${iso}T00:00:00`).getTime() - Date.now()) / 86400000);
}

export default function WorkOrderTable({
  workOrders = [],
  projects = [],
  ptds = [],
  users = [],
  blockers = [],
  dark,
  onSelectWorkOrder,
  onQuickLogHours,
}) {
  const [sortField, setSortField] = useState('dueDate');
  const [sortDir, setSortDir] = useState('asc');

  const getProject = (id) => projects.find((p) => p.id === id);
  const getPtd = (id) => ptds.find((p) => p.id === id);
  const getUser = (id) => users.find((u) => u.id === id);
  const getActiveBlocker = (woId) =>
    blockers.find((b) => b.workOrderId === woId && b.status === 'open');

  const borderCls = dark ? 'border-zinc-800' : 'border-zinc-200';
  const tableHeaderBg = dark ? 'bg-zinc-900/90 text-zinc-400' : 'bg-zinc-100/90 text-zinc-600';
  const rowHover = dark ? 'hover:bg-zinc-850/60' : 'hover:bg-zinc-50';
  const mutedText = dark ? 'text-zinc-400' : 'text-zinc-500';
  const headingText = dark ? 'text-zinc-100' : 'text-zinc-800';

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = [...workOrders].sort((a, b) => {
    let vA = a[sortField] || '';
    let vB = b[sortField] || '';
    if (sortField === 'assignee') {
      vA = getUser(a.assignee)?.name || '';
      vB = getUser(b.assignee)?.name || '';
    } else if (sortField === 'project') {
      vA = getProject(a.projectId)?.name || '';
      vB = getProject(b.projectId)?.name || '';
    }
    if (vA < vB) return sortDir === 'asc' ? -1 : 1;
    if (vA > vB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border backdrop-blur-md transition-all ${
        dark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-white/80'
      }`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${borderCls} ${tableHeaderBg}`}>
              <th
                onClick={() => handleSort('title')}
                className="cursor-pointer py-3.5 pl-5 pr-4 select-none hover:text-violet-500"
              >
                <div className="flex items-center gap-1.5">
                  Work Order / Context
                  {sortField === 'title' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="cursor-pointer px-4 py-3.5 select-none hover:text-violet-500"
              >
                <div className="flex items-center gap-1.5">
                  Status
                  {sortField === 'status' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('priority')}
                className="cursor-pointer px-4 py-3.5 select-none hover:text-violet-500"
              >
                <div className="flex items-center gap-1.5">
                  Priority
                  {sortField === 'priority' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('assignee')}
                className="cursor-pointer px-4 py-3.5 select-none hover:text-violet-500"
              >
                <div className="flex items-center gap-1.5">
                  Assignee
                  {sortField === 'assignee' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('dueDate')}
                className="cursor-pointer px-4 py-3.5 select-none hover:text-violet-500"
              >
                <div className="flex items-center gap-1.5">
                  Due Date
                  {sortField === 'dueDate' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </div>
              </th>
              <th className="px-4 py-3.5">Hours (Used / Est)</th>
              <th className="px-4 py-3.5">Work Progress</th>
              <th className="py-3.5 pl-4 pr-6 sm:pr-8 text-right font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40 dark:divide-zinc-800/60">
            {sorted.map((wo) => {
              const project = getProject(wo.projectId);
              const ptd = getPtd(wo.ptdId);
              const assignee = getUser(wo.assignee);
              const activeBlocker = getActiveBlocker(wo.id);
              const daysLeft = daysUntil(wo.dueDate);
              const isOverdue =
                wo.status !== 'completed' && daysLeft !== null && daysLeft < 0;

              const progressPct =
                wo.status === 'completed' || wo.status === 'done'
                  ? 100
                  : typeof wo.progress === 'number'
                  ? wo.progress
                  : wo.estimatedHours > 0
                  ? Math.min(100, Math.round(((wo.actualHours || 0) / wo.estimatedHours) * 100))
                  : 0;

              const hoursPct =
                wo.estimatedHours > 0
                  ? Math.round(((wo.actualHours || 0) / wo.estimatedHours) * 100)
                  : 0;

              return (
                <tr
                  key={wo.id}
                  onClick={() => onSelectWorkOrder(wo.id)}
                  className={`group cursor-pointer transition-colors ${rowHover} ${
                    activeBlocker ? 'bg-red-500/5' : ''
                  }`}
                >
                  {/* Title & Project context */}
                  <td className="py-3 pl-5 pr-4">
                    <div className="flex items-start gap-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm ${headingText} group-hover:text-violet-400 transition-colors`}>
                            {wo.title}
                          </span>
                          {wo.status === 'rejected' && (
                            <span className="rounded bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                              Rejected by Dev
                            </span>
                          )}
                          {activeBlocker && (
                            <span
                              title={`Blocked: ${activeBlocker.description}`}
                              className="flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400"
                            >
                              <AlertTriangle className="h-3 w-3 animate-pulse" />
                              Blocked
                            </span>
                          )}
                        </div>
                        {wo.status === 'rejected' && wo.rejectionRemark ? (
                          <div className="mt-1 text-xs text-rose-400 font-medium truncate max-w-[320px]">
                            <span className="font-bold text-rose-500">Reason: </span>
                            {wo.rejectionRemark}
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            {project && <span className={`font-medium ${mutedText}`}>{project.name}</span>}
                            {ptd && (
                              <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                                  dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                                }`}
                              >
                                {ptd.ref || ptd.name}
                              </span>
                            )}
                            {wo.comments?.length > 0 && (
                              <span className={`flex items-center gap-0.5 text-[11px] ${mutedText}`}>
                                <MessageSquare className="h-3 w-3" />
                                {wo.comments.length}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <WoStatusBadge status={wo.status} />
                  </td>

                  {/* Priority Badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <PriorityBadge priority={wo.priority} />
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                          assignee ? 'bg-gradient-to-tr from-violet-600 to-indigo-500' : 'bg-zinc-500'
                        }`}
                      >
                        {assignee ? assignee.name.slice(0, 2).toUpperCase() : '?'}
                      </div>
                      <span className={`text-xs font-medium ${headingText}`}>
                        {assignee?.name || 'Unassigned'}
                      </span>
                    </div>
                  </td>

                  {/* Due Date */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {wo.dueDate ? (
                      <span
                        className={`text-xs font-medium tabular-nums ${
                          isOverdue
                            ? 'font-bold text-red-400 bg-red-500/15 rounded px-1.5 py-0.5'
                            : mutedText
                        }`}
                      >
                        {wo.dueDate}
                      </span>
                    ) : (
                      <span className={`text-xs ${mutedText}`}>—</span>
                    )}
                  </td>

                  {/* Hours Progress */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="w-28">
                      <div className="mb-1 flex items-center justify-between text-[11px] tabular-nums">
                        <span className={headingText}>
                          <strong>{Math.round((Number(wo.actualHours) || 0) * 100) / 100}h</strong> / {wo.estimatedHours}h
                        </span>
                        <span
                          className={`font-semibold ${
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
                  </td>

                  {/* Work Progress */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="w-24">
                      <div className="mb-1 flex items-center justify-between text-[11px] tabular-nums">
                        <span className={`text-[10px] font-medium ${mutedText}`}>Done</span>
                        <span className="font-bold text-xs">{progressPct}%</span>
                      </div>
                      <div
                        className={`h-1.5 w-full overflow-hidden rounded-full ${
                          dark ? 'bg-zinc-800' : 'bg-zinc-200'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all ${
                            progressPct >= 100
                              ? 'bg-emerald-500'
                              : progressPct >= 50
                              ? 'bg-violet-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Quick Action buttons */}
                  <td className="py-3 pl-4 pr-6 sm:pr-8 text-right whitespace-nowrap">
                    <div
                      className="flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onQuickLogHours(wo)}
                        title="Log hours"
                        className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                          dark
                            ? 'hover:bg-zinc-800 text-zinc-300 hover:text-violet-400'
                            : 'hover:bg-zinc-200 text-zinc-600 hover:text-violet-600'
                        }`}
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onSelectWorkOrder(wo.id)}
                        title="Open Details"
                        className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                          dark
                            ? 'hover:bg-zinc-800 text-zinc-300 hover:text-white'
                            : 'hover:bg-zinc-200 text-zinc-600 hover:text-black'
                        }`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className={`py-12 text-center text-sm ${mutedText}`}>
                  No work orders found matching current criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
