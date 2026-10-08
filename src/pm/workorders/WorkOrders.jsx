import { useState, useMemo } from 'react';
import {
  Search,
  ChevronRight,
  Plus,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useApp } from '../../data/context.js';
import { PriorityBadge, WoStatusBadge } from '../badges.jsx';
import CreateWorkOrderModal from './CreateWorkOrderModal.jsx';
import WorkOrderDetailDrawer from './WorkOrderDetailDrawer.jsx';

const WO_STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned (Pending)' },
  { id: 'not-started', label: 'Not Started' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected by Dev' },
];

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(`${iso}T00:00:00`).getTime() - Date.now()) / 86400000);
}

export default function WorkOrders({ dark }) {
  const { db } = useApp();
  const { workOrders = [], projects = [], ptds = [], users = [], blockers = [] } = db;

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [developerFilter, setDeveloperFilter] = useState('all');

  // Selected work order for 360 detail drawer
  const [selectedWoId, setSelectedWoId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const projectsById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects],
  );
  const ptdsById = useMemo(
    () => Object.fromEntries(ptds.map((p) => [p.id, p])),
    [ptds],
  );
  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );
  const activeBlockersByWo = useMemo(() => {
    const map = {};
    (blockers || []).forEach((b) => {
      if (b.status === 'open' && b.workOrderId) {
        map[b.workOrderId] = b;
      }
    });
    return map;
  }, [blockers]);

  // Filtered work orders
  const filtered = useMemo(() => {
    return workOrders.filter((wo) => {
      const q = query.trim().toLowerCase();
      const project = projectsById[wo.projectId];
      const ptd = ptdsById[wo.ptdId];
      const assignee = usersById[wo.assignee];

      const matchesQuery =
        !q ||
        wo.title?.toLowerCase().includes(q) ||
        wo.description?.toLowerCase().includes(q) ||
        project?.name?.toLowerCase().includes(q) ||
        ptd?.ref?.toLowerCase().includes(q) ||
        assignee?.name?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
      const matchesProject = projectFilter === 'all' || wo.projectId === projectFilter;
      const matchesDev = developerFilter === 'all' || wo.assignee === developerFilter;

      return matchesQuery && matchesStatus && matchesProject && matchesDev;
    });
  }, [workOrders, query, statusFilter, projectFilter, developerFilter, projectsById, ptdsById, usersById]);

  // Overall metrics
  const stats = useMemo(() => {
    const total = workOrders.length;
    const assigned = workOrders.filter((w) => w.status === 'assigned').length;
    const notStarted = workOrders.filter((w) => w.status === 'not-started').length;
    const inProgress = workOrders.filter((w) => w.status === 'in-progress').length;
    const completed = workOrders.filter((w) => w.status === 'completed').length;
    const rejected = workOrders.filter((w) => w.status === 'rejected').length;
    const activeBlockersCount = Object.keys(activeBlockersByWo).length;
    const totalEst = workOrders.reduce((s, w) => s + (w.estimatedHours || 0), 0);
    const totalUsed = workOrders.reduce((s, w) => s + (w.actualHours || 0), 0);

    return { total, assigned, notStarted, inProgress, completed, rejected, activeBlockersCount, totalEst, totalUsed };
  }, [workOrders, activeBlockersByWo]);

  const panel = dark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-white/80';
  const heading = dark ? 'text-zinc-200' : 'text-zinc-800';
  const muted = dark ? 'text-zinc-400' : 'text-zinc-500';
  const rowHover = dark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50';
  const inputBg = dark
    ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500 focus:border-violet-500'
    : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400 focus:border-violet-500';

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      {/* Header section */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`}>Work Orders</h1>
          <p className={`mt-1 text-xs ${muted}`}>
            All active, pending, and completed tasks across projects — track progress, time logs, and execution details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/30 transition-all cursor-pointer hover:bg-violet-500 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Work Order</span>
          </button>
        </div>
      </div>

      {/* Rejection Alert Banner if any rejected tasks */}
      {stats.rejected > 0 && (
        <div
          className={`mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border p-4 transition-all ${
            dark ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                <span>{stats.rejected} Work Order{stats.rejected > 1 ? 's' : ''} Rejected by Developer</span>
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">
                  Action Required
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${dark ? 'text-rose-300/80' : 'text-rose-700'}`}>
                Developers submitted rejection remarks. Review reasons and reassign to another team member.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
            className="self-start sm:self-auto rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-all cursor-pointer whitespace-nowrap"
          >
            {statusFilter === 'rejected' ? 'Show All Work Orders' : 'Filter Rejected Work Orders'}
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className={`rounded-2xl border p-3.5 ${panel}`}>
          <div className={`text-[11px] font-medium uppercase tracking-wide ${muted}`}>Total Tasks</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{stats.total}</div>
          <div className={`mt-0.5 text-[10px] ${muted}`}>across all projects</div>
        </div>

        <div className={`rounded-2xl border p-3.5 ${panel}`}>
          <div className={`text-[11px] font-medium uppercase tracking-wide ${muted}`}>Pending Dev</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-blue-400">{stats.assigned}</div>
          <div className={`mt-0.5 text-[10px] ${muted}`}>awaiting acceptance</div>
        </div>

        <div className={`rounded-2xl border p-3.5 ${panel}`}>
          <div className={`text-[11px] font-medium uppercase tracking-wide ${muted}`}>Not Started</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-400">{stats.notStarted}</div>
          <div className={`mt-0.5 text-[10px] ${muted}`}>accepted, queued</div>
        </div>

        <div className={`rounded-2xl border p-3.5 ${panel}`}>
          <div className={`text-[11px] font-medium uppercase tracking-wide ${muted}`}>In Progress</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-amber-500">{stats.inProgress}</div>
          <div className={`mt-0.5 text-[10px] ${muted}`}>active development</div>
        </div>

        <div className={`rounded-2xl border p-3.5 ${panel}`}>
          <div className={`text-[11px] font-medium uppercase tracking-wide ${muted}`}>Completed</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">{stats.completed}</div>
          <div className={`mt-0.5 text-[10px] ${muted}`}>verified & closed</div>
        </div>

        <div className={`rounded-2xl border p-3.5 ${panel}`}>
          <div className={`text-[11px] font-medium uppercase tracking-wide ${muted}`}>Rejected</div>
          <div className={`mt-1 text-2xl font-bold tabular-nums ${stats.rejected > 0 ? 'text-rose-400 font-extrabold' : ''}`}>
            {stats.rejected}
          </div>
          <div className={`mt-0.5 text-[10px] ${muted}`}>{stats.rejected > 0 ? 'needs reassignment' : 'none rejected'}</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search work orders by title, description, project, or developer..."
            className={`w-full rounded-xl border pl-9 pr-8 py-2 text-xs outline-none transition-all ${inputBg}`}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns & Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Project Dropdown */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-xs outline-none cursor-pointer ${inputBg}`}
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Developer Dropdown */}
          <select
            value={developerFilter}
            onChange={(e) => setDeveloperFilter(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-xs outline-none cursor-pointer ${inputBg}`}
          >
            <option value="all">All Developers</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Status Pills */}
          <div className="flex flex-wrap gap-1">
            {WO_STATUS_FILTERS.map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === s.id
                    ? 'bg-violet-600 text-white'
                    : dark
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Work Orders Table */}
      <div className={`overflow-x-auto rounded-2xl border shadow-sm backdrop-blur-md ${panel}`}>
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className={`border-b text-xs uppercase tracking-wider ${muted}`}>
              <th className="px-5 py-3.5 font-semibold">Work Order</th>
              <th className="px-4 py-3.5 font-semibold">Project</th>
              <th className="px-4 py-3.5 font-semibold">Developer</th>
              <th className="px-4 py-3.5 font-semibold">Priority</th>
              <th className="px-4 py-3.5 font-semibold">Status</th>
              <th className="px-4 py-3.5 font-semibold">Work Progress</th>
              <th className="px-4 py-3.5 font-semibold">Hours (Used / Est)</th>
              <th className="px-4 py-3.5 font-semibold">Due Date</th>
              <th className="py-3.5 pl-3 pr-6 sm:pr-8 text-right font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40 dark:divide-zinc-800/60">
            {filtered.map((wo) => {
              const project = projectsById[wo.projectId];
              const assignee = usersById[wo.assignee];
              const activeBlocker = activeBlockersByWo[wo.id];
              const daysLeft = daysUntil(wo.dueDate);
              const isOverdue = wo.status !== 'completed' && wo.status !== 'rejected' && daysLeft !== null && daysLeft < 0;

              const progressPct =
                wo.status === 'completed' || wo.status === 'done'
                  ? 100
                  : typeof wo.progress === 'number'
                  ? wo.progress
                  : wo.estimatedHours > 0
                  ? Math.min(100, Math.round(((wo.actualHours || 0) / wo.estimatedHours) * 100))
                  : 0;

              return (
                <tr
                  key={wo.id}
                  onClick={() => setSelectedWoId(wo.id)}
                  className={`cursor-pointer transition-colors ${rowHover} ${
                    activeBlocker ? 'bg-red-500/5' : wo.status === 'rejected' ? 'bg-rose-500/5' : ''
                  }`}
                >
                  {/* Work Order ID, Title & Blocker indicator */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-violet-500 uppercase">
                            {wo.id}
                          </span>
                          <span className={`font-semibold text-sm ${heading} hover:text-violet-400 transition-colors`}>
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
                              className="flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400 animate-pulse"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Blocked
                            </span>
                          )}
                        </div>
                        {wo.status === 'rejected' && wo.rejectionRemark ? (
                          <div className="mt-1 text-xs text-rose-400 font-medium truncate max-w-[320px]">
                            <span className="font-bold text-rose-500">Reason: </span>
                            {wo.rejectionRemark}
                          </div>
                        ) : wo.description ? (
                          <div className={`mt-0.5 truncate text-xs ${muted} max-w-[280px]`}>
                            {wo.description}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* Project Name */}
                  <td className={`px-4 py-3.5 text-xs font-medium ${heading}`}>
                    {project ? project.name : '—'}
                  </td>

                  {/* Assignee / Developer */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                          assignee ? 'bg-gradient-to-tr from-violet-600 to-indigo-500' : 'bg-zinc-500'
                        }`}
                      >
                        {assignee ? assignee.name.slice(0, 2).toUpperCase() : '?'}
                      </div>
                      <span className={`text-xs font-medium ${heading}`}>
                        {assignee?.name || 'Unassigned'}
                      </span>
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <PriorityBadge priority={wo.priority} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <WoStatusBadge status={wo.status} />
                  </td>

                  {/* Work Progress Bar */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="w-32">
                      <div className="mb-1 flex items-center justify-between text-[11px] tabular-nums">
                        <span className={`text-[10px] font-medium ${muted}`}>Progress</span>
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

                  {/* Hours (Actual vs Est) */}
                  <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                    <div className="text-xs">
                      <strong className="text-violet-500 font-bold">{wo.actualHours || 0}h</strong>
                      <span className={muted}> / {wo.estimatedHours}h</span>
                    </div>
                  </td>

                  {/* Due Date */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {wo.dueDate ? (
                      <span
                        className={`text-xs font-medium tabular-nums ${
                          isOverdue
                            ? 'font-bold text-red-400 bg-red-500/15 rounded px-1.5 py-0.5'
                            : muted
                        }`}
                      >
                        {wo.dueDate}
                      </span>
                    ) : (
                      <span className={`text-xs ${muted}`}>—</span>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3.5 pl-3 pr-6 sm:pr-8 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedWoId(wo.id)}
                        title="View Full Details"
                        className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                          dark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-200 text-zinc-500'
                        }`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className={`py-12 text-center text-sm ${muted}`}>
                  No work orders found matching your search and filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 360 WORK ORDER WORKSPACE DRAWER */}
      {selectedWoId && (
        <WorkOrderDetailDrawer
          workOrderId={selectedWoId}
          dark={dark}
          onClose={() => setSelectedWoId(null)}
        />
      )}

      {/* CREATE WORK ORDER MODAL */}
      {showCreateModal && (
        <CreateWorkOrderModal
          dark={dark}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
