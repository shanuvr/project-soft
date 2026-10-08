import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Hash,
  History,
  Minus,
  Plus,
  Save,
  Send,
  TrendingDown,
  TrendingUp,
  User as UserIcon,
  X,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../data/context.js';
import { PriorityBadge, WoStatusBadge } from './badges.jsx';

function isDone(wo) {
  return wo.status === 'completed' || wo.status === 'done';
}

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(`${iso}T00:00:00`).getTime() - Date.now()) / 86400000);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function relativeDay(iso) {
  if (!iso) return '';
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  return fmtDate(iso);
}

function getWorkOrderHistory(activity, workOrderId, woTitle) {
  if (!activity || !woTitle) return [];
  return activity
    .filter((a) => a.text && (a.text.includes(`"${woTitle}"`) || a.text.includes(workOrderId)))
    .slice(0, 20);
}

function extractHours(text) {
  const m = text.match(/logged\s+([\d.]+)\s*h/i);
  return m ? parseFloat(m[1]) : null;
}

function buildDailySummary(entries) {
  const byDate = {};
  for (const e of entries) {
    if (!e.date) continue;
    if (!byDate[e.date]) byDate[e.date] = { hours: 0, entries: [] };
    const hrs = extractHours(e.text);
    if (hrs) byDate[e.date].hours += hrs;
    byDate[e.date].entries.push(e);
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({ date, ...data }));
}

function dueLabel(left, overdue) {
  if (overdue) return `Overdue by ${Math.abs(left)}d`;
  if (left === 0) return 'Due today';
  if (left === 1) return 'Due tomorrow';
  if (left === null) return null;
  return `${left}d left`;
}

export default function DevWorkOrderDetail({ wo, project, currentUser, dark, onBack }) {
  const { db, logHours, updateWorkOrder, submitWorkOrderForReview, updateWorkOrderStatus, acceptWorkOrder, rejectWorkOrder } = useApp();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRemark, setRejectRemark] = useState('');
  const [rejectError, setRejectError] = useState('');

  const left = daysUntil(wo.dueDate);
  const overdue = !isDone(wo) && left !== null && left < 0;
  const progress = Math.min(100, Math.max(0, wo.progress ?? 0));
  const remaining = Math.max(0, (wo.estimatedHours || 0) - (wo.actualHours || 0));
  const budgetUsedPct = wo.estimatedHours
    ? Math.min(100, Math.round(((wo.actualHours || 0) / wo.estimatedHours) * 100))
    : 0;
  const overBudget = (wo.actualHours || 0) > (wo.estimatedHours || 0);

  const [hoursToday, setHoursToday] = useState(0);
  const [newProgress, setNewProgress] = useState(progress);
  const [note, setNote] = useState('');
  const [logSuccess, setLogSuccess] = useState(false);

  const history = useMemo(
    () => getWorkOrderHistory(db.activity || [], wo.id, wo.title),
    [db.activity, wo.id, wo.title],
  );
  const dailySummary = useMemo(() => buildDailySummary(history), [history]);

  const ptd = (db.ptds || []).find((p) => p.id === wo.ptdId);

  const afterLogHours = (wo.actualHours || 0) + hoursToday;
  const afterRemaining = Math.max(0, remaining - hoursToday);

  const handleLogHours = () => {
    if (hoursToday > 0) {
      logHours(wo.id, hoursToday, note.trim());
    }
    if (newProgress !== progress) {
      updateWorkOrder(wo.id, { progress: newProgress });
    }
    if (hoursToday > 0 || newProgress !== progress) {
      setLogSuccess(true);
      setHoursToday(0);
      setNote('');
      setTimeout(() => setLogSuccess(false), 3000);
    }
  };

  const handleSubmitReview = () => {
    submitWorkOrderForReview(wo.id, 'Ready for review');
  };

  const handleStartWork = () => {
    updateWorkOrderStatus(wo.id, 'in-progress');
  };

  const handleMarkComplete = () => {
    setNewProgress(100);
    updateWorkOrderStatus(wo.id, 'completed');
  };

  const canSave = hoursToday > 0 || newProgress !== progress;

  const panel = dark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-white/80';
  const cardBorder = dark ? 'border-zinc-800' : 'border-zinc-200';
  const heading = dark ? 'text-zinc-100' : 'text-zinc-800';
  const muted = dark ? 'text-zinc-400' : 'text-zinc-500';
  const divider = dark ? 'divide-zinc-800/80' : 'divide-zinc-200/90';
  const inputBg = dark
    ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500 focus:border-violet-500'
    : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400 focus:border-violet-500';

  const barTrack = dark ? 'bg-zinc-800' : 'bg-zinc-200';
  const sectionLabel = 'flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-500';

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-6 sm:px-6">
      {/* ===== Sticky header ===== */}
      <header
        className={`sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between gap-3 border-b px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 ${cardBorder} ${
          dark ? 'bg-zinc-950/75' : 'bg-zinc-100/80'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={onBack}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-violet-500 transition-colors hover:bg-violet-500/10 hover:text-violet-400 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All work orders
          </button>
          <span className={`hidden h-4 w-px shrink-0 sm:block ${cardBorder}`} />
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 font-mono text-xs font-bold text-violet-500 uppercase">{wo.id}</span>
            <h2 className={`truncate text-sm font-bold ${heading}`}>{wo.title}</h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {overdue && (
            <span className="flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
              <AlertTriangle className="h-3 w-3" /> Overdue
            </span>
          )}
          <WoStatusBadge status={wo.status} />
          <PriorityBadge priority={wo.priority} />
        </div>
      </header>

      {/* Action banner for assigned (pending acceptance) or rejected status */}
      {wo.status === 'assigned' && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 font-bold">
              !
            </span>
            <div>
              <h3 className="text-sm font-bold text-blue-300">New Work Order Assignment</h3>
              <p className="text-xs text-blue-200/80">
                You have been assigned this task by the project manager. Accept to add it to your active board or reject with a reason.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => acceptWorkOrder(wo.id)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" /> Accept Task
            </button>
            <button
              onClick={() => {
                setShowRejectModal(true);
                setRejectRemark('');
                setRejectError('');
              }}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 cursor-pointer"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
          </div>
        </div>
      )}

      {wo.status === 'rejected' && (
        <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-rose-400">
            <XCircle className="h-4 w-4" />
            <span>Task Rejected by You</span>
            {wo.rejectedDate && <span className="text-[11px] font-normal opacity-75">on {wo.rejectedDate}</span>}
          </div>
          <p className="mt-1 leading-relaxed">
            <strong>Remark:</strong> {wo.rejectionRemark || 'No specific remark recorded.'}
          </p>
          <div className="mt-3">
            <button
              onClick={() => acceptWorkOrder(wo.id)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Reconsider & Accept Task
            </button>
          </div>
        </div>
      )}

      {/* ===== Body grid ===== */}
      <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ---- Left column ---- */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* DAILY WORK LOG */}
          <section className={`overflow-hidden rounded-2xl border ${panel}`}>
            <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${cardBorder}`}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                  <ClipboardCheck className="h-4 w-4" />
                </span>
                <div>
                  <h3 className={`text-sm font-bold ${heading}`}>Daily Work Log</h3>
                  <p className={`text-[11px] ${muted}`}>
                    End-of-day update — hours count against your man-hour budget.
                  </p>
                </div>
              </div>
              {logSuccess && (
                <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>

            <div className="space-y-3.5 p-4">
              {/* Hours + Progress input row */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {/* Hours worked today */}
                <div className={`rounded-xl border p-3 ${cardBorder} ${isDone(wo) ? 'pointer-events-none opacity-60' : ''}`}>
                  <label className={`block text-xs font-semibold ${heading}`}>Hours worked today</label>
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setHoursToday((h) => Math.max(0, +(h - 0.5).toFixed(1)))}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                        dark ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'border-zinc-300 bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={hoursToday}
                      onChange={(e) => setHoursToday(Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`w-full rounded-lg border px-3 py-2 text-center text-sm font-bold tabular-nums outline-none ${inputBg}`}
                    />
                    <button
                      type="button"
                      onClick={() => setHoursToday((h) => +(h + 0.5).toFixed(1))}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                        dark ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'border-zinc-300 bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className={`mt-1.5 text-[10px] leading-relaxed ${muted}`}>
                    {hoursToday > 0 ? (
                      <>
                        After logging:{' '}
                        <span className={`font-semibold ${overBudget ? 'text-red-400' : 'text-violet-400'}`}>
                          {afterLogHours}h
                        </span>{' '}
                        consumed ·{' '}
                        <span className={`font-semibold ${afterRemaining <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {afterRemaining}h
                        </span>{' '}
                        remaining
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-violet-400">{(wo.actualHours || 0)}h</span> consumed ·{' '}
                        <span className="font-semibold text-emerald-400">{remaining}h</span> remaining
                      </>
                    )}
                  </p>
                </div>

                {/* Completion slider */}
                <div className={`rounded-xl border p-3 ${cardBorder} ${isDone(wo) ? 'pointer-events-none opacity-60' : ''}`}>
                  <label className={`flex items-center justify-between text-xs font-semibold ${heading}`}>
                    <span>Project completion</span>
                    <span className="flex items-center gap-1.5">
                      {newProgress !== progress && (
                        <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${
                          newProgress > progress ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {newProgress > progress ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {newProgress > progress ? '+' : ''}
                          {newProgress - progress}%
                        </span>
                      )}
                      <span className="font-bold tabular-nums text-violet-500">{newProgress}%</span>
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={newProgress}
                    onChange={(e) => setNewProgress(Number(e.target.value))}
                    className="mt-3 w-full accent-violet-500"
                  />
                  <div className={`mt-1 flex justify-between text-[10px] ${muted}`}>
                    <span>0%</span>
                    <span className="truncate">
                      {newProgress > progress
                        ? 'Progress increased'
                        : newProgress < progress
                        ? 'Progress decreased'
                        : 'Slide to set completion'}
                    </span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className={isDone(wo) ? 'pointer-events-none opacity-60' : ''}>
                <label className={`block text-xs font-semibold ${heading}`}>
                  Note for your PM <span className={`font-normal ${muted}`}>(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Finished the retry logic, moving on to the dead-letter handler..."
                  className={`mt-1.5 w-full resize-none rounded-xl border px-3.5 py-2.5 text-xs outline-none ${inputBg}`}
                />
              </div>

              {/* Actions */}
              <div className={`flex flex-wrap items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 ${cardBorder}`}>
                <p className={`min-w-0 flex-1 text-[11px] leading-snug ${muted}`}>
                  {isDone(wo)
                    ? 'This work order is completed.'
                    : wo.status === 'changes-requested'
                    ? 'Changes requested by PM — adjust, log work, then resubmit.'
                    : wo.status === 'submitted-review'
                    ? 'Submitted for review — your PM will approve it or request changes.'
                    : wo.status === 'not-started'
                    ? 'Press Start Working to begin, or log hours directly.'
                    : hoursToday > 0
                    ? `Logging ${hoursToday}h reduces remaining budget ${remaining}h → ${afterRemaining}h.`
                    : newProgress !== progress
                    ? `Progress will update from ${progress}% → ${newProgress}%.`
                    : 'Set hours and/or progress, then save.'}
                </p>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {wo.status === 'not-started' && (
                    <button
                      type="button"
                      onClick={handleStartWork}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        dark ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                      }`}
                    >
                      Start Working
                    </button>
                  )}
                  {(wo.status === 'in-progress' || wo.status === 'changes-requested') && (
                    <>
                      <button
                        type="button"
                        onClick={handleMarkComplete}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                          dark
                            ? 'bg-emerald-900/70 text-emerald-300 hover:bg-emerald-800'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitReview}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                          dark
                            ? 'bg-sky-900/70 text-sky-300 hover:bg-sky-800'
                            : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                        }`}
                      >
                        <Send className="h-3.5 w-3.5" />
                        {wo.status === 'changes-requested' ? 'Resubmit for Review' : 'Submit for Review'}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleLogHours}
                    disabled={!canSave}
                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-all cursor-pointer ${
                      canSave
                        ? 'bg-violet-600 shadow-md shadow-violet-600/30 hover:bg-violet-500'
                        : 'cursor-not-allowed bg-zinc-600 opacity-50'
                    }`}
                  >
                    <Save className="h-3.5 w-3.5" /> Save Work Log
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* DESCRIPTION */}
          <section className={`rounded-2xl border p-4 ${panel}`}>
            <h4 className={sectionLabel}>
              <FileText className="h-3.5 w-3.5" /> Description & Requirements
            </h4>
            <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
              {wo.description || 'No detailed description provided.'}
            </p>
          </section>
        </div>

        {/* ---- Right column ---- */}
        <aside className={`flex min-w-0 flex-col gap-4 ${dark ? 'xl:border-l xl:border-zinc-800/70' : 'xl:border-l xl:border-zinc-200'} xl:pl-5`}>
          {/* COMPLETION */}
          <section className={`rounded-2xl border p-4 ${panel}`}>
            <div className="flex items-center justify-between gap-3">
              <h4 className={sectionLabel}>
                <TrendingUp className="h-3.5 w-3.5" /> Completion
              </h4>
              <span className={`text-2xl font-bold tabular-nums ${progress >= 100 ? 'text-emerald-400' : 'text-violet-500'}`}>
                {progress}%
              </span>
            </div>
            <div className={`mt-3 h-3 w-full overflow-hidden rounded-full ${barTrack}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : progress >= 50
                    ? 'bg-gradient-to-r from-violet-600 to-violet-400'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className={`mt-2 text-[11px] ${muted}`}>
              {progress >= 100 ? 'Complete — great work!' : `${100 - progress}% remaining. Slide on the left to update.`}
            </p>
          </section>

          {/* MAN-HOURS */}
          <section className={`rounded-2xl border p-4 ${panel}`}>
            <h4 className={sectionLabel}>
              <Clock className="h-3.5 w-3.5" /> Man-Hours
            </h4>
            <div className="mt-2.5 flex items-center justify-between rounded-xl border px-3 py-2 text-xs tabular-nums">
              <span className={muted}>
                Allocated <span className={`font-bold ${heading}`}>{wo.estimatedHours || 0}h</span>
              </span>
              <span className={`hidden sm:inline h-3 w-px ${dark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
              <span className={muted}>
                Used <span className={`font-bold ${overBudget ? 'text-red-400' : 'text-violet-500'}`}>{wo.actualHours || 0}h</span>
              </span>
              <span className={`hidden sm:inline h-3 w-px ${dark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
              <span className={muted}>
                Left <span className={`font-bold ${remaining <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>{remaining}h</span>
              </span>
            </div>
            <div className="mt-2.5">
              <div className={`flex items-center justify-between text-[10px] font-medium ${muted}`}>
                <span>Budget usage</span>
                <span className={`tabular-nums ${overBudget ? 'font-bold text-red-400' : 'font-semibold text-violet-400'}`}>
                  {budgetUsedPct}%{overBudget ? ' — Over budget' : ''}
                </span>
              </div>
              <div className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${barTrack}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    overBudget ? 'bg-red-500' : budgetUsedPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
                />
              </div>
            </div>
          </section>

          {/* DETAILS */}
          <section className={`rounded-2xl border p-4 ${panel}`}>
            <h4 className={sectionLabel}>Details</h4>
            <dl className={`mt-2 divide-y text-xs ${divider}`}>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className={`flex items-center gap-1.5 ${muted}`}>
                  <Building2 className="h-3 w-3" /> Project
                </dt>
                <dd className={`truncate font-semibold ${heading}`}>{project?.name || '—'}</dd>
              </div>
              {ptd && (
                <div className="flex items-center justify-between gap-3 py-1.5">
                  <dt className={`flex items-center gap-1.5 ${muted}`}>
                    <Hash className="h-3 w-3" /> PTD
                  </dt>
                  <dd className={`truncate font-semibold ${heading}`}>
                    {ptd.ref} · {ptd.name}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className={`flex items-center gap-1.5 ${muted}`}>
                  <UserIcon className="h-3 w-3" /> Assignee
                </dt>
                <dd className={`truncate font-semibold ${heading}`}>{currentUser?.name || 'You'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className={`flex items-center gap-1.5 ${muted}`}>
                  <CalendarDays className="h-3 w-3" /> Start
                </dt>
                <dd className={`font-medium tabular-nums ${heading}`}>{wo.startDate || '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className={`flex items-center gap-1.5 ${muted}`}>
                  <CalendarDays className="h-3 w-3" /> Due
                </dt>
                <dd className="text-right">
                  <span className={`font-medium tabular-nums text-rose-400`}>{wo.dueDate || '—'}</span>
                  {wo.dueDate && (
                    <span
                      className={`ml-1.5 text-[10px] font-semibold ${
                        overdue ? 'text-red-400' : left !== null && left <= 2 ? 'text-amber-400' : muted
                      }`}
                    >
                      {dueLabel(left, overdue)}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* HISTORY */}
          <section
            className={`flex min-w-0 flex-col rounded-2xl border p-4 ${panel} ${
              dark ? 'xl:border-zinc-800' : 'xl:border-zinc-200'
            }`}
          >
            <div className="mb-3 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-violet-500" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-violet-500">Work Log History</h4>
              {history.length > 0 && (
                <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${dark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-600'}`}>
                  {history.length} entries
                </span>
              )}
            </div>

            {dailySummary.length === 0 ? (
              <div className={`flex flex-1 flex-col items-center justify-center py-6 text-center`}>
                <History className={`h-7 w-7 ${muted}`} />
                <p className={`mt-2 text-xs font-semibold ${heading}`}>No history yet</p>
                <p className={`mt-0.5 text-[11px] ${muted}`}>Your daily logs will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5 xl:max-h-[36vh] xl:overflow-y-auto xl:pr-1 scrollbar-hide">
                {dailySummary.map((day) => (
                  <div key={day.date} className={`rounded-xl border p-2.5 ${cardBorder}`}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className={`text-xs font-bold ${heading}`}>{relativeDay(day.date)}</span>
                      {day.hours > 0 && (
                        <span className="flex items-center gap-1 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-400 tabular-nums">
                          <Clock className="h-3 w-3" /> {day.hours}h
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {day.entries.map((e) => {
                        const hrs = extractHours(e.text);
                        const isProgress = e.text.includes('set') && e.text.includes('to');
                        return (
                          <li key={e.id} className="flex items-start gap-1.5">
                            <span
                              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                                hrs ? 'bg-violet-500' : isProgress ? 'bg-amber-500' : 'bg-zinc-500'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className={`text-[11px] leading-snug ${muted}`}>{e.text}</p>
                              <span className={`text-[9px] tabular-nums ${dark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                {e.time}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* Rejection Remark Modal */}
      {showRejectModal && (
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
                    State why you cannot take this work order.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-zinc-300">
                Rejection Reason / Remark <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                value={rejectRemark}
                onChange={(e) => {
                  setRejectRemark(e.target.value);
                  setRejectError('');
                }}
                placeholder="Explain why this work order is being rejected (e.g. bandwidth full, missing dependency, etc.)..."
                className={`mt-1.5 w-full rounded-xl border p-3 text-xs outline-none transition-colors focus:border-rose-500 ${
                  dark
                    ? 'border-zinc-700 bg-zinc-950 text-white placeholder-zinc-500'
                    : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400'
                }`}
              />
              {rejectError && <p className="mt-1.5 text-xs text-rose-400">{rejectError}</p>}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 border-t pt-4 border-zinc-800">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  dark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectRemark.trim()) {
                    setRejectError('Please enter a remark explaining the rejection.');
                    return;
                  }
                  rejectWorkOrder(wo.id, rejectRemark);
                  setShowRejectModal(false);
                  onBack();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 cursor-pointer"
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