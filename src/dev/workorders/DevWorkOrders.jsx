import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ListTodo,
  Search,
  Timer,
  X,
  XCircle,
  Inbox,
  RotateCcw,
  Calendar,
  Building2,
  FileText,
} from 'lucide-react';
import { useApp } from '../../data/context.js';
import { PriorityBadge, WoStatusBadge } from './badges.jsx';
import DevWorkOrderDetail from './DevWorkOrderDetail.jsx';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'not-started', label: 'Not Started' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Done' },
];

const SORT_OPTIONS = [
  { id: 'due', label: 'Due date' },
  { id: 'priority', label: 'Priority' },
  { id: 'progress', label: 'Progress' },
  { id: 'hours', label: 'Est. hours' },
];

const PRESET_DEV_REJECTION_REASONS = [
  'Current sprint bandwidth / workload full',
  'Missing technical specifications or dependencies',
  'Timeline conflict with concurrent deliverables',
  'Requires different domain / architecture expertise',
  'Blocker on external API / service dependencies',
];

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const DONE_STATUSES = new Set(['completed', 'done']);

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(`${iso}T00:00:00`).getTime() - Date.now()) / 86400000);
}

function isDone(wo) {
  return DONE_STATUSES.has(wo.status);
}

function isOverdue(wo) {
  return !isDone(wo) && daysUntil(wo.dueDate) !== null && daysUntil(wo.dueDate) < 0;
}

function accentShadow(wo) {
  if (isOverdue(wo)) return 'inset 4px 0 0 0 #ef4444';
  if (isDone(wo)) return 'inset 4px 0 0 0 #10b981';
  switch (wo.status) {
    case 'in-progress':
      return 'inset 4px 0 0 0 #f59e0b';
    case 'submitted-review':
      return 'inset 4px 0 0 0 #a78bfa';
    case 'changes-requested':
      return 'inset 4px 0 0 0 #fb923c';
    default:
      return 'inset 4px 0 0 0 #71717a';
  }
}

function barColor(p) {
  return p >= 100 ? 'bg-emerald-500' : p >= 50 ? 'bg-violet-500' : 'bg-amber-500';
}

export default function DevWorkOrders({ dark }) {
  const { db, currentUser, acceptWorkOrder, rejectWorkOrder } = useApp();
  const meId = currentUser?.id;

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'assigned' | 'rejected'
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due');

  // Reject modal state
  const [rejectingWo, setRejectingWo] = useState(null);
  const [rejectRemark, setRejectRemark] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const projectsById = useMemo(
    () => Object.fromEntries((db.projects || []).map((p) => [p.id, p])),
    [db.projects],
  );

  const ptdsById = useMemo(
    () => Object.fromEntries((db.ptds || []).map((p) => [p.id, p])),
    [db.ptds],
  );

  const myAllWorkOrders = useMemo(
    () => (db.workOrders || []).filter((w) => w.assignee === meId),
    [db.workOrders, meId],
  );

  // Partition work orders by status
  const assignedRequests = useMemo(
    () => myAllWorkOrders.filter((w) => w.status === 'assigned'),
    [myAllWorkOrders],
  );

  const rejectedWorkOrders = useMemo(
    () => myAllWorkOrders.filter((w) => w.status === 'rejected'),
    [myAllWorkOrders],
  );

  const activeWorkOrders = useMemo(
    () => myAllWorkOrders.filter((w) => w.status !== 'assigned' && w.status !== 'rejected'),
    [myAllWorkOrders],
  );

  const stats = useMemo(
    () => ({
      total: activeWorkOrders.length,
      inProgress: activeWorkOrders.filter((w) => w.status === 'in-progress').length,
      inReview: activeWorkOrders.filter((w) => w.status === 'submitted-review').length,
      done: activeWorkOrders.filter(isDone).length,
      overdue: activeWorkOrders.filter(isOverdue).length,
      hours: activeWorkOrders.reduce((s, w) => s + (w.actualHours || 0), 0),
      est: activeWorkOrders.reduce((s, w) => s + (w.estimatedHours || 0), 0),
    }),
    [activeWorkOrders],
  );

  const filteredActive = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = activeWorkOrders.filter((w) => {
      const project = projectsById[w.projectId];
      const matchesQuery =
        !q ||
        w.title?.toLowerCase().includes(q) ||
        w.id?.toLowerCase().includes(q) ||
        w.description?.toLowerCase().includes(q) ||
        project?.name?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
    list.sort((a, b) => {
      if (sortBy === 'priority') return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      if (sortBy === 'progress') return (b.progress || 0) - (a.progress || 0);
      if (sortBy === 'hours') return (b.estimatedHours || 0) - (a.estimatedHours || 0);
      return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31');
    });
    return list;
  }, [activeWorkOrders, query, statusFilter, sortBy, projectsById]);

  const filteredAssigned = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignedRequests.filter((w) => {
      const project = projectsById[w.projectId];
      return (
        !q ||
        w.title?.toLowerCase().includes(q) ||
        w.id?.toLowerCase().includes(q) ||
        w.description?.toLowerCase().includes(q) ||
        project?.name?.toLowerCase().includes(q)
      );
    });
  }, [assignedRequests, query, projectsById]);

  const filteredRejected = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rejectedWorkOrders.filter((w) => {
      const project = projectsById[w.projectId];
      return (
        !q ||
        w.title?.toLowerCase().includes(q) ||
        w.id?.toLowerCase().includes(q) ||
        w.rejectionRemark?.toLowerCase().includes(q) ||
        project?.name?.toLowerCase().includes(q)
      );
    });
  }, [rejectedWorkOrders, query, projectsById]);

  const handleAccept = (wo) => {
    if (acceptWorkOrder) {
      acceptWorkOrder(wo.id);
      showToast(`Accepted "${wo.id} · ${wo.title}". Added to your Active Tasks.`);
    }
  };

  const handleOpenRejectModal = (wo) => {
    setRejectingWo(wo);
    setRejectRemark('');
    setRejectError('');
  };

  const handleConfirmReject = () => {
    if (!rejectRemark.trim()) {
      setRejectError('Please provide a reason or remark for rejecting this work order.');
      return;
    }
    if (rejectWorkOrder && rejectingWo) {
      rejectWorkOrder(rejectingWo.id, rejectRemark);
      showToast(`Rejected "${rejectingWo.id}". Project Manager has been notified.`);
      setRejectingWo(null);
      setRejectRemark('');
      setRejectError('');
    }
  };

  const openWo = openId ? myAllWorkOrders.find((w) => w.id === openId) : null;

  useEffect(() => {
    if (openWo) {
      const main = document.querySelector('main');
      main?.scrollTo?.({ top: 0, behavior: 'smooth' });
    }
  }, [openWo]);

  const panel = dark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-white/80';
  const cardBorder = dark ? 'border-zinc-800' : 'border-zinc-200';
  const heading = dark ? 'text-zinc-100' : 'text-zinc-800';
  const muted = dark ? 'text-zinc-400' : 'text-zinc-500';
  const barTrack = dark ? 'bg-zinc-800' : 'bg-zinc-200';
  const inputBg = dark
    ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500 focus:border-violet-500'
    : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400 focus:border-violet-500';

  if (openWo) {
    return (
      <DevWorkOrderDetail
        wo={openWo}
        project={projectsById[openWo.projectId]}
        currentUser={currentUser}
        dark={dark}
        onBack={() => setOpenId(null)}
      />
    );
  }

  const kpis = [
    { label: 'Active Tasks', value: stats.total, icon: ListTodo, accent: 'text-violet-500', sub: `${stats.done} done` },
    { label: 'Not Started', value: stats.notStarted, icon: Clock, accent: 'text-zinc-400', sub: 'queued' },
    { label: 'In Progress', value: stats.inProgress, icon: Timer, accent: 'text-amber-500', sub: 'working on' },
    { label: 'Hours Logged', value: `${stats.hours}h`, icon: CheckCircle2, accent: 'text-emerald-500', sub: `of ${stats.est}h est` },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-6 sm:px-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-400 backdrop-blur-md shadow-lg transition-all animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            className="text-emerald-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col gap-3.5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-xl font-bold tracking-tight sm:text-2xl ${heading}`}>
            My Work Orders
          </h1>
          <p className={`mt-0.5 text-xs ${muted}`}>
            Review assigned tasks, accept incoming work orders, and log execution progress.
          </p>
        </div>

        {/* Top Single-Line Switcher Tabs with Red Notification Badge */}
        <div className={`flex shrink-0 items-center gap-1 overflow-x-auto rounded-xl border p-1 shadow-sm ${panel}`}>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-violet-600 text-white shadow-sm'
                : dark
                  ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800'
            }`}
          >
            <ListTodo className="h-3.5 w-3.5 shrink-0" />
            <span>Active Tasks</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                activeTab === 'active'
                  ? 'bg-white/20 text-white'
                  : dark
                    ? 'bg-zinc-800 text-zinc-400'
                    : 'bg-zinc-200 text-zinc-600'
              }`}
            >
              {activeWorkOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('assigned')}
            className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'assigned'
                ? 'bg-violet-600 text-white shadow-sm'
                : dark
                  ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800'
            }`}
          >
            <Inbox className="h-3.5 w-3.5 shrink-0" />
            <span>New Assignments</span>
            {assignedRequests.length > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm tabular-nums">
                {assignedRequests.length}
              </span>
            ) : (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  activeTab === 'assigned'
                    ? 'bg-white/20 text-white'
                    : dark
                      ? 'bg-zinc-800 text-zinc-400'
                      : 'bg-zinc-200 text-zinc-600'
                }`}
              >
                0
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'rejected'
                ? 'bg-violet-600 text-white shadow-sm'
                : dark
                  ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800'
            }`}
          >
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Rejected</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                activeTab === 'rejected'
                  ? 'bg-white/20 text-white'
                  : dark
                    ? 'bg-zinc-800 text-zinc-400'
                    : 'bg-zinc-200 text-zinc-600'
              }`}
            >
              {rejectedWorkOrders.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. NEW ASSIGNMENTS TAB                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'assigned' && (
        <div className="mt-2 flex flex-col gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search new assignments by ID, title, or project..."
              className={`w-full rounded-xl border py-2 pl-9 pr-4 text-xs outline-none transition-colors ${inputBg}`}
            />
          </div>

          {/* Assignment Cards */}
          <div className="flex flex-col gap-3">
            {filteredAssigned.map((wo) => {
              const project = projectsById[wo.projectId];
              const ptd = ptdsById[wo.ptdId];
              return (
                <div
                  key={wo.id}
                  className={`group rounded-2xl border p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all ${panel} hover:border-violet-500/40`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Main Content Area */}
                    <div className="min-w-0 flex-1">
                      {/* Top Badges & Title */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="shrink-0 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-mono font-bold text-violet-400">
                          {wo.id}
                        </span>
                        <h2 className={`text-base font-bold tracking-tight ${heading}`}>
                          {wo.title}
                        </h2>
                        {project && (
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                              dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {project.name}
                          </span>
                        )}
                        <PriorityBadge priority={wo.priority} />
                        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400">
                          Assigned to You
                        </span>
                      </div>

                      {/* Scope Description */}
                      {wo.description && (
                        <p className={`mt-2 text-xs leading-relaxed line-clamp-2 ${muted}`}>
                          {wo.description}
                        </p>
                      )}

                      {/* Metadata Row */}
                      <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs">
                        {/* Allocated Hours */}
                        <div
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
                            dark
                              ? 'border-violet-500/20 bg-violet-500/5 text-violet-300'
                              : 'border-violet-200 bg-violet-50/70 text-violet-900'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                          <span>
                            Allocated Hours:{' '}
                            <strong className="font-bold text-violet-400">
                              {wo.estimatedHours || 0}h
                            </strong>
                          </span>
                        </div>

                        {/* Due Date */}
                        <div
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
                            dark
                              ? 'border-zinc-800 bg-zinc-950/60 text-zinc-300'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                          }`}
                        >
                          <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span>
                            Due Date: <strong className={heading}>{wo.dueDate || '—'}</strong>
                          </span>
                        </div>

                        {ptd && (
                          <div
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
                              dark
                                ? 'border-zinc-800 bg-zinc-950/60 text-zinc-400'
                                : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                            }`}
                          >
                            <FileText className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            <span>PTD: {ptd.ref} · {ptd.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions on Right */}
                    <div className="flex shrink-0 items-center gap-2 border-t pt-3 sm:border-t-0 sm:pt-0 border-zinc-800/60">
                      <button
                        onClick={() => handleAccept(wo)}
                        className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Accept Work Order</span>
                      </button>

                      <button
                        onClick={() => handleOpenRejectModal(wo)}
                        className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 px-3.5 py-2 text-xs font-semibold text-rose-400 transition-all hover:bg-rose-500/10 active:scale-95 cursor-pointer ${
                          dark ? 'bg-rose-500/5' : 'bg-rose-50'
                        }`}
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredAssigned.length === 0 && (
              <div
                className={`flex flex-col items-center justify-center rounded-2xl border py-16 text-center shadow-sm backdrop-blur-md ${panel}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-500">
                  <Inbox className="h-6 w-6" />
                </div>
                <h3 className={`mt-3 text-sm font-semibold ${heading}`}>No Pending Work Order Assignments</h3>
                <p className={`mt-1 max-w-sm text-xs ${muted}`}>
                  You're all caught up! New tasks assigned by the project manager will appear here for your review and acceptance.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REJECTED TAB                                                           */}
      {/* ========================================================================= */}
      {activeTab === 'rejected' && (
        <div className="mt-2 flex flex-col gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rejected work orders by ID, title, or remark..."
              className={`w-full rounded-xl border py-2 pl-9 pr-4 text-xs outline-none transition-colors ${inputBg}`}
            />
          </div>

          <div className="flex flex-col gap-3">
            {filteredRejected.map((wo) => {
              const project = projectsById[wo.projectId];
              return (
                <div
                  key={wo.id}
                  className={`group rounded-2xl border p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all ${panel} hover:border-rose-500/40`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-mono font-bold text-rose-400">
                          {wo.id}
                        </span>
                        <h2 className={`text-base font-bold tracking-tight ${heading}`}>
                          {wo.title}
                        </h2>
                        {project && (
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                              dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {project.name}
                          </span>
                        )}
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-rose-400">
                          Rejected by You
                        </span>
                      </div>

                      {/* Rejection Remark Callout */}
                      {wo.rejectionRemark && (
                        <div
                          className={`mt-2.5 rounded-xl border p-2.5 text-xs leading-relaxed ${
                            dark
                              ? 'border-rose-500/20 bg-rose-500/5 text-rose-300'
                              : 'border-rose-200 bg-rose-50/80 text-rose-900'
                          }`}
                        >
                          <span className="font-semibold text-rose-400">Your Rejection Remark:</span>{' '}
                          {wo.rejectionRemark}
                          {wo.rejectedDate && (
                            <span className="ml-2 opacity-75 text-[10px]">
                              (on {wo.rejectedDate})
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs">
                        <div
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
                            dark
                              ? 'border-violet-500/20 bg-violet-500/5 text-violet-300'
                              : 'border-violet-200 bg-violet-50/70 text-violet-900'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                          <span>
                            Allocated Hours:{' '}
                            <strong className="font-bold text-violet-400">
                              {wo.estimatedHours || 0}h
                            </strong>
                          </span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
                            dark
                              ? 'border-zinc-800 bg-zinc-950/60 text-zinc-300'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                          }`}
                        >
                          <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span>
                            Due Date: <strong className={heading}>{wo.dueDate || '—'}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Accept Now button if dev re-evaluates */}
                    <div className="flex shrink-0 items-center gap-2 border-t pt-3 sm:border-t-0 sm:pt-0 border-zinc-800/60">
                      <button
                        onClick={() => handleAccept(wo)}
                        className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 cursor-pointer"
                        title="Accept this work order now"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Accept Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredRejected.length === 0 && (
              <div className={`rounded-2xl border py-14 text-center text-sm ${panel} ${muted}`}>
                No rejected work orders on record.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ACTIVE TASKS TAB                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'active' && (
        <div className="flex flex-col gap-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                className={`flex items-center gap-3 rounded-2xl border p-3 shadow-sm backdrop-blur-md transition-colors ${panel}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80">
                  <k.icon className={`h-4 w-4 ${k.accent}`} />
                </div>
                <div className="min-w-0">
                  <div className={`text-[10px] font-medium uppercase tracking-wider ${muted}`}>
                    {k.label}
                  </div>
                  <div className={`text-lg font-bold tabular-nums leading-tight ${heading}`}>
                    {k.value}
                  </div>
                  <div className={`truncate text-[10px] ${muted}`}>{k.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Overdue alert banner */}
          {stats.overdue > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs text-red-400 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{stats.overdue}</strong> work order{stats.overdue > 1 ? 's are' : ' is'} past due date!
                </span>
              </div>
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSortBy('due');
                }}
                className="underline hover:text-white cursor-pointer font-medium"
              >
                Show overdue
              </button>
            </div>
          )}

          {/* Filter and Sort Toolbar */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            {/* Search input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search active tasks..."
                className={`w-full rounded-xl border py-2 pl-9 pr-4 text-xs outline-none transition-colors ${inputBg}`}
              />
            </div>

            {/* Filter pills & sort dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      statusFilter === f.id
                        ? 'bg-violet-600 text-white shadow-sm'
                        : dark
                          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                          : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 hover:text-zinc-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium outline-none transition-colors cursor-pointer ${
                  dark
                    ? 'border-zinc-700 bg-zinc-850 text-zinc-300'
                    : 'border-zinc-300 bg-white text-zinc-700'
                }`}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    Sort: {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Work Order Cards List */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredActive.map((wo) => {
              const project = projectsById[wo.projectId];
              const overdue = isOverdue(wo);
              const done = isDone(wo);
              const daysLeft = daysUntil(wo.dueDate);
              const prog = Number(wo.progress) || 0;

              return (
                <button
                  key={wo.id}
                  onClick={() => setOpenId(wo.id)}
                  style={{ boxShadow: accentShadow(wo) }}
                  className={`group relative flex flex-col rounded-2xl border p-4 text-left shadow-sm backdrop-blur-md transition-all cursor-pointer hover:scale-[1.01] ${panel} ${
                    dark ? 'hover:bg-zinc-850/80 hover:border-zinc-700' : 'hover:bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-violet-400">
                        {wo.id}
                      </span>
                      <WoStatusBadge status={wo.status} />
                    </div>
                    <PriorityBadge priority={wo.priority} />
                  </div>

                  <h2 className={`mt-2 text-sm font-semibold line-clamp-2 transition-colors ${heading} group-hover:text-violet-400`}>
                    {wo.title}
                  </h2>

                  {project && (
                    <div className={`mt-1 flex items-center gap-1 text-[11px] ${muted}`}>
                      <Building2 className="h-3 w-3 shrink-0 text-zinc-500" />
                      <span className="truncate">{project.name}</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={muted}>Progress</span>
                      <span className={`font-semibold tabular-nums ${heading}`}>{prog}%</span>
                    </div>
                    <div className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${barTrack}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor(prog)}`}
                        style={{ width: `${Math.min(100, Math.max(0, prog))}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer metadata */}
                  <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-[11px] border-zinc-800/60">
                    <span className={`flex items-center gap-1 tabular-nums ${muted}`}>
                      <Clock className="h-3 w-3 text-zinc-500" />
                      <span>
                        <strong className={heading}>{wo.actualHours || 0}h</strong> / {wo.estimatedHours || 0}h
                      </span>
                    </span>

                    <span
                      className={`tabular-nums font-medium ${
                        overdue
                          ? 'text-red-400 font-bold'
                          : done
                            ? 'text-emerald-400'
                            : daysLeft !== null && daysLeft <= 2
                              ? 'text-amber-400 font-semibold'
                              : muted
                      }`}
                    >
                      {done
                        ? 'Completed'
                        : overdue
                          ? `Overdue (${Math.abs(daysLeft)}d)`
                          : daysLeft === 0
                            ? 'Due today'
                            : daysLeft === 1
                              ? 'Due tomorrow'
                              : daysLeft !== null
                                ? `Due in ${daysLeft}d`
                                : 'No deadline'}
                    </span>
                  </div>
                </button>
              );
            })}

            {filteredActive.length === 0 && (
              <div
                className={`col-span-full flex flex-col items-center justify-center rounded-2xl border py-16 text-center shadow-sm backdrop-blur-md ${panel}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-500">
                  <ListTodo className="h-6 w-6" />
                </div>
                <h3 className={`mt-3 text-sm font-semibold ${heading}`}>No Active Tasks Found</h3>
                <p className={`mt-1 max-w-sm text-xs ${muted}`}>
                  No active work orders match your search and filter criteria.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEVELOPER REJECTION REMARK MODAL                                          */}
      {/* ========================================================================= */}
      {rejectingWo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 transition-all animate-in fade-in">
          <div
            className={`relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
              dark ? 'border-zinc-800 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-4 border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Reject Work Order Assignment</h3>
                  <p className="text-xs text-zinc-400">
                    State the reason why this task cannot be accepted by you.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectingWo(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Target Item summary */}
            <div
              className={`mt-4 rounded-xl border p-3 text-xs ${
                dark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-violet-400">{rejectingWo.id}</span>
                <span className="text-zinc-400">Est. {rejectingWo.estimatedHours}h</span>
              </div>
              <div className="mt-1 font-semibold text-zinc-200">{rejectingWo.title}</div>
              <div className="mt-0.5 text-zinc-400">
                Project: {projectsById[rejectingWo.projectId]?.name || 'Unassigned'}
              </div>
            </div>

            {/* Quick preset reason tags */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-zinc-400">
                Quick Reason Selectors:
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PRESET_DEV_REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setRejectRemark(reason);
                      setRejectError('');
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                      rejectRemark === reason
                        ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                        : dark
                          ? 'border-zinc-800 bg-zinc-800/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:border-zinc-300 hover:text-zinc-800'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Remark text area */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-zinc-300">
                Rejection Remark / Reason <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                value={rejectRemark}
                onChange={(e) => {
                  setRejectRemark(e.target.value);
                  setRejectError('');
                }}
                placeholder="Explain why you cannot take this work order (e.g. bandwidth constraint, technical blocker, etc.)..."
                className={`mt-1.5 w-full rounded-xl border p-3 text-xs outline-none transition-colors focus:border-rose-500 ${
                  dark
                    ? 'border-zinc-700 bg-zinc-950 text-white placeholder-zinc-500'
                    : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400'
                }`}
              />
              {rejectError && <p className="mt-1.5 text-xs text-rose-400">{rejectError}</p>}
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-2.5 border-t pt-4 border-zinc-800">
              <button
                type="button"
                onClick={() => setRejectingWo(null)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  dark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-rose-500 active:scale-95 cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
                <span>Submit Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}