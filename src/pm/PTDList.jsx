import { useState } from 'react';
import {
  Search,
  ChevronRight,
  Inbox,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Building2,
  AlertCircle,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight,
  MessageSquareQuote,
} from 'lucide-react';
import { useApp } from '../data/context.js';
import { PTD_STATUS_LABELS } from './ptdMeta.js';
import { PtdStatusBadge } from './badges.jsx';

const inputCls = (dark) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-violet-500 ${
    dark
      ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500'
      : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400'
  }`;

const PRESET_REJECTION_REASONS = [
  'Scope & technical specifications unclear',
  'Estimated hours insufficient for deliverables',
  'Engineering team bandwidth currently full',
  'Duplicate or obsolete requirement',
  'Awaiting client sign-off on design specs',
];

export default function PTDList({ dark, onOpen }) {
  const { db, acceptPtd, rejectPtd, reopenPtdRequest } = useApp();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'requests' | 'rejected'
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  // Reject modal state
  const [rejectingPtd, setRejectingPtd] = useState(null);
  const [rejectRemark, setRejectRemark] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Toast / notification feedback banner
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const projectsById = Object.fromEntries((db.projects || []).map((p) => [p.id, p]));

  // Partition PTDs by status
  const allPtds = db.ptds || [];
  const requestedPtds = allPtds.filter(
    (p) => p.status === 'requested' || p.status === 'pending',
  );
  const rejectedPtds = allPtds.filter((p) => p.status === 'rejected');
  const activePtds = allPtds.filter(
    (p) => p.status !== 'requested' && p.status !== 'pending' && p.status !== 'rejected',
  );

  // Status options for active PTDs filter
  const activeStatusOptions = ['all', ...Array.from(new Set(activePtds.map((p) => p.status)))];

  // Filtered lists based on search query
  const q = query.trim().toLowerCase();

  const filteredActive = activePtds.filter((p) => {
    const matchesQuery =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.ref?.toLowerCase().includes(q) ||
      (p.projectId && projectsById[p.projectId]?.name?.toLowerCase().includes(q));
    const matchesFilter = filter === 'all' || p.status === filter;
    return matchesQuery && matchesFilter;
  });

  const filteredRequests = requestedPtds.filter((p) => {
    return (
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.ref?.toLowerCase().includes(q) ||
      p.client?.toLowerCase().includes(q) ||
      p.source?.toLowerCase().includes(q) ||
      (p.projectId && projectsById[p.projectId]?.name?.toLowerCase().includes(q))
    );
  });

  const filteredRejected = rejectedPtds.filter((p) => {
    return (
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.ref?.toLowerCase().includes(q) ||
      p.client?.toLowerCase().includes(q) ||
      p.rejectionRemark?.toLowerCase().includes(q) ||
      (p.projectId && projectsById[p.projectId]?.name?.toLowerCase().includes(q))
    );
  });

  const handleAccept = (ptd) => {
    if (acceptPtd) {
      acceptPtd(ptd.id);
      showToast(`Accepted "${ptd.ref} · ${ptd.name}"! It is now in Active PTDs.`);
    }
  };

  const handleOpenRejectModal = (ptd) => {
    setRejectingPtd(ptd);
    setRejectRemark('');
    setRejectError('');
  };

  const handleConfirmReject = () => {
    if (!rejectRemark.trim()) {
      setRejectError('Please provide a remark or reason for rejecting this PTD request.');
      return;
    }
    if (rejectPtd && rejectingPtd) {
      rejectPtd(rejectingPtd.id, rejectRemark);
      showToast(`Rejected request "${rejectingPtd.ref}". Remark recorded.`);
      setRejectingPtd(null);
      setRejectRemark('');
      setRejectError('');
    }
  };

  const handleReopen = (ptd) => {
    if (reopenPtdRequest) {
      reopenPtdRequest(ptd.id);
      showToast(`Reopened request "${ptd.ref}". Moved back to Incoming Requests.`);
    }
  };

  const panel = dark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-white/80';
  const heading = dark ? 'text-zinc-200' : 'text-zinc-800';
  const muted = dark ? 'text-zinc-400' : 'text-zinc-500';
  const rowHover = dark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50';

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-400 backdrop-blur-md shadow-lg transition-all animate-in fade-in">
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

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-400">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${heading}`}>PTDs</h1>
          </div>
          <p className={`mt-1 text-xs ${muted}`}>
            Incoming technical data from external software & sales accounts — review incoming requests or manage accepted PTDs.
          </p>
        </div>

        {/* Primary View Switcher Tabs — Single-line with red dock-style notification badge */}
        <div className={`flex shrink-0 items-center gap-1 overflow-x-auto rounded-xl border p-1 shadow-sm ${panel}`}>
          {/* Tab 1: Active PTDs */}
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
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Active PTDs</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                activeTab === 'active'
                  ? 'bg-white/20 text-white'
                  : dark
                    ? 'bg-zinc-800 text-zinc-400'
                    : 'bg-zinc-200 text-zinc-600'
              }`}
            >
              {activePtds.length}
            </span>
          </button>

          {/* Tab 2: Incoming Requests */}
          <button
            onClick={() => setActiveTab('requests')}
            className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-violet-600 text-white shadow-sm'
                : dark
                  ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800'
            }`}
          >
            <Inbox className="h-3.5 w-3.5 shrink-0" />
            <span>Incoming Requests</span>
            {requestedPtds.length > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm tabular-nums">
                {requestedPtds.length}
              </span>
            ) : (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  activeTab === 'requests'
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

          {/* Tab 3: Rejected */}
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
              {rejectedPtds.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. INCOMING REQUESTS TAB                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'requests' && (
        <div>
          {/* Search bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search incoming requests by ref, title, client, or source..."
                className={`pl-9 ${inputCls(dark)}`}
              />
            </div>
          </div>

          {/* Balanced, Structured Request Cards */}
          <div className="flex flex-col gap-3">
            {filteredRequests.map((ptd) => {
              const project = ptd.projectId ? projectsById[ptd.projectId] : null;
              const clientName = ptd.client || (project ? project.client : null);
              const hours = ptd.estimatedHours || ptd.allocatedHours || 0;

              return (
                <div
                  key={ptd.id}
                  className={`group rounded-2xl border p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all ${panel} hover:border-violet-500/40`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Main Content Area */}
                    <div className="min-w-0 flex-1">
                      {/* Top Badges & Title */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="shrink-0 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-mono font-bold text-violet-400">
                          {ptd.ref}
                        </span>
                        <h2 className={`text-base font-bold tracking-tight ${heading}`}>
                          {ptd.name}
                        </h2>
                        {clientName && (
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                              dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {clientName}
                            {project?.name && ` · ${project.name}`}
                          </span>
                        )}
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
                          Awaiting Review
                        </span>
                      </div>

                      {/* Deliverable Scope Description */}
                      {ptd.description && (
                        <p className={`mt-2 text-xs leading-relaxed line-clamp-2 ${muted}`}>
                          {ptd.description}
                        </p>
                      )}

                      {/* Key Metadata Row */}
                      <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs">
                        {/* Allocated Man Hours */}
                        <div
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
                            dark
                              ? 'border-violet-500/20 bg-violet-500/5 text-violet-300'
                              : 'border-violet-200 bg-violet-50/70 text-violet-900'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                          <span>
                            Allocated Man Hours:{' '}
                            <strong className="font-bold text-violet-400">{hours}h</strong>
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
                            Due Date: <strong className={heading}>{ptd.deadline || '—'}</strong>
                          </span>
                        </div>

                        {/* Source System */}
                        {ptd.source && (
                          <div
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
                              dark
                                ? 'border-zinc-800 bg-zinc-950/60 text-zinc-400'
                                : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                            }`}
                          >
                            <Building2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            <span>Source: {ptd.source}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions on Right */}
                    <div className="flex shrink-0 items-center gap-2 border-t pt-3 sm:border-t-0 sm:pt-0 border-zinc-800/60">
                      <button
                        onClick={() => handleAccept(ptd)}
                        className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Accept PTD</span>
                      </button>

                      <button
                        onClick={() => handleOpenRejectModal(ptd)}
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

            {filteredRequests.length === 0 && (
              <div
                className={`flex flex-col items-center justify-center rounded-2xl border py-16 text-center shadow-sm backdrop-blur-md ${panel}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-500">
                  <Inbox className="h-6 w-6" />
                </div>
                <h3 className={`mt-3 text-sm font-semibold ${heading}`}>No Pending Incoming Requests</h3>
                <p className={`mt-1 max-w-sm text-xs ${muted}`}>
                  All incoming technical documents have been processed. New requests from external accounts systems will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ACTIVE PTDS TAB                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'active' && (
        <div>
          {/* Search + status filter */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search active PTDs by name, reference, or project..."
                className={`pl-9 ${inputCls(dark)}`}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeStatusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    filter === s
                      ? 'bg-violet-500 text-white'
                      : dark
                        ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                  }`}
                >
                  {s === 'all' ? 'All' : PTD_STATUS_LABELS[s] || s}
                </button>
              ))}
            </div>
          </div>

          {/* PTD cards (mobile) */}
          <div className="flex flex-col gap-2.5 sm:hidden">
            {filteredActive.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpen(p.id)}
                className={`rounded-2xl border p-3.5 text-left transition-colors cursor-pointer ${panel} ${rowHover}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold leading-tight ${heading}`}>
                      <span className="text-violet-500">{p.ref}</span> · {p.name}
                    </div>
                    <div className={`mt-0.5 truncate text-xs ${muted}`}>{p.description || '—'}</div>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                </div>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <PtdStatusBadge status={p.status} />
                  <span className={`text-xs tabular-nums ${muted}`}>
                    <span className={`font-semibold ${heading}`}>{p.progress}%</span> ·{' '}
                    {p.allocatedHours}h allocated
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div
                    className={`h-1.5 flex-1 overflow-hidden rounded-full ${
                      dark ? 'bg-zinc-800' : 'bg-zinc-200'
                    }`}
                  >
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }}
                    />
                  </div>
                  <span className={`shrink-0 text-[11px] tabular-nums ${muted}`}>
                    est {p.estimatedHours}h · used {p.usedHours}h
                  </span>
                </div>

                <div className={`mt-2 flex items-center justify-between gap-2 text-xs ${muted}`}>
                  <span className="min-w-0 truncate">
                    {p.projectId ? projectsById[p.projectId]?.name || '—' : 'Unassigned'}
                  </span>
                  <span className="shrink-0 tabular-nums">Due {p.deadline || '—'}</span>
                </div>
              </button>
            ))}
            {filteredActive.length === 0 && (
              <div className={`rounded-2xl border py-10 text-center text-sm ${panel} ${muted}`}>
                No active PTDs found.
              </div>
            )}
          </div>

          {/* PTD table (desktop) */}
          <div className={`hidden overflow-x-auto rounded-2xl border sm:block ${panel}`}>
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wide ${muted} border-zinc-800`}>
                  <th className="px-4 py-3 font-medium">PTD</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Deadline</th>
                  <th className="w-8 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredActive.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onOpen(p.id)}
                    className={`cursor-pointer border-b last:border-0 transition-colors ${rowHover} border-zinc-800/60`}
                  >
                    <td className="px-4 py-3">
                      <div className={`font-semibold ${heading}`}>
                        <span className="text-violet-500 font-mono">{p.ref}</span> · {p.name}
                      </div>
                      <div className={`mt-0.5 max-w-[320px] truncate text-xs ${muted}`}>
                        {p.description || '—'}
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${muted}`}>
                      {p.projectId ? projectsById[p.projectId]?.name || '—' : 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <div className={muted}>
                        alloc <span className={heading}>{p.allocatedHours}h</span>
                      </div>
                      <div className={muted}>
                        est {p.estimatedHours}h · used {p.usedHours}h
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-1.5 w-16 overflow-hidden rounded-full ${
                            dark ? 'bg-zinc-800' : 'bg-zinc-200'
                          }`}
                        >
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }}
                          />
                        </div>
                        <span className={`text-xs tabular-nums ${muted}`}>{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PtdStatusBadge status={p.status} />
                    </td>
                    <td className={`px-4 py-3 text-xs tabular-nums ${muted}`}>
                      {p.deadline || '—'}
                    </td>
                    <td className="px-2 py-3 text-zinc-500">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
                {filteredActive.length === 0 && (
                  <tr>
                    <td colSpan={7} className={`px-4 py-10 text-center text-sm ${muted}`}>
                      No active PTDs found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REJECTED HISTORY TAB                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'rejected' && (
        <div>
          {/* Search bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rejected PTD requests by ref, title, or remark..."
                className={`pl-9 ${inputCls(dark)}`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {filteredRejected.map((ptd) => {
              const project = ptd.projectId ? projectsById[ptd.projectId] : null;
              const clientName = ptd.client || (project ? project.client : null);
              const hours = ptd.estimatedHours || ptd.allocatedHours || 0;

              return (
                <div
                  key={ptd.id}
                  className={`group rounded-2xl border p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all ${panel} hover:border-rose-500/40`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Main Content Area */}
                    <div className="min-w-0 flex-1">
                      {/* Top Badges & Title */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-mono font-bold text-rose-400">
                          {ptd.ref}
                        </span>
                        <h2 className={`text-base font-bold tracking-tight ${heading}`}>
                          {ptd.name}
                        </h2>
                        {clientName && (
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                              dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {clientName}
                          </span>
                        )}
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-rose-400">
                          Rejected
                        </span>
                      </div>

                      {/* Rejection Remark Callout */}
                      {ptd.rejectionRemark && (
                        <div
                          className={`mt-2.5 rounded-xl border p-2.5 text-xs leading-relaxed ${
                            dark
                              ? 'border-rose-500/20 bg-rose-500/5 text-rose-300'
                              : 'border-rose-200 bg-rose-50/80 text-rose-900'
                          }`}
                        >
                          <span className="font-semibold text-rose-400">Rejection Remark:</span>{' '}
                          {ptd.rejectionRemark}
                          {ptd.rejectedDate && (
                            <span className="ml-2 opacity-75 text-[10px]">
                              (on {ptd.rejectedDate})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Key Metadata Row */}
                      <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs">
                        {/* Allocated Man Hours */}
                        <div
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
                            dark
                              ? 'border-violet-500/20 bg-violet-500/5 text-violet-300'
                              : 'border-violet-200 bg-violet-50/70 text-violet-900'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                          <span>
                            Allocated Man Hours:{' '}
                            <strong className="font-bold text-violet-400">{hours}h</strong>
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
                            Due Date: <strong className={heading}>{ptd.deadline || '—'}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions on Right */}
                    <div className="flex shrink-0 items-center gap-2 border-t pt-3 sm:border-t-0 sm:pt-0 border-zinc-800/60">
                      <button
                        onClick={() => handleReopen(ptd)}
                        className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all hover:border-violet-500 hover:text-violet-400 cursor-pointer ${
                          dark
                            ? 'border-zinc-700 bg-zinc-800/80 text-zinc-300'
                            : 'border-zinc-300 bg-zinc-100 text-zinc-700'
                        }`}
                        title="Move back to Pending Requests queue"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reopen</span>
                      </button>

                      <button
                        onClick={() => handleAccept(ptd)}
                        className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 cursor-pointer"
                        title="Accept this deliverable now"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Accept</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredRejected.length === 0 && (
              <div className={`rounded-2xl border py-14 text-center text-sm ${panel} ${muted}`}>
                No rejected PTD requests on record.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REJECTION REMARK SUBMISSION MODAL                                         */}
      {/* ========================================================================= */}
      {rejectingPtd && (
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
                  <h3 className="text-base font-bold">Reject PTD Request</h3>
                  <p className="text-xs text-zinc-400">
                    Provide a remark explaining why this deliverable cannot be accepted.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectingPtd(null)}
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
                <span className="font-mono font-bold text-violet-400">{rejectingPtd.ref}</span>
                <span className="text-zinc-400">Est. {rejectingPtd.estimatedHours}h</span>
              </div>
              <div className="mt-1 font-semibold text-zinc-200">{rejectingPtd.name}</div>
              <div className="mt-0.5 text-zinc-400">Client: {rejectingPtd.client || 'Unassigned'}</div>
            </div>

            {/* Quick pre-set reason tags */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-zinc-400">
                Quick Reason Selectors:
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PRESET_REJECTION_REASONS.map((reason) => (
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
                placeholder="Enter detailed reason for rejection (e.g. scope clarification needed, timeline conflict, etc.)..."
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
                onClick={() => setRejectingPtd(null)}
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