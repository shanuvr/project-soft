import { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Hash,
  History,
  TrendingDown,
  TrendingUp,
  User as UserIcon,
  X,
  XCircle,
  Play,
  Square,
  Timer,
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

function formatTimer(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatHours(val) {
  if (val === null || val === undefined || isNaN(val)) return '0h';
  const num = Number(val);
  const rounded = Math.round(num * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded}h`;
}

function dueLabel(left, overdue) {
  if (overdue) return `Overdue by ${Math.abs(left)}d`;
  if (left === 0) return 'Due today';
  if (left === 1) return 'Due tomorrow';
  if (left === null) return null;
  return `${left}d left`;
}

function getWorkOrderHistory(activity, workOrderId, woTitle) {
  if (!activity || !woTitle) return [];
  return activity
    .filter((a) => a.text && (a.text.includes(`"${woTitle}"`) || a.text.includes(workOrderId)))
    .slice(0, 20);
}

function extractHours(text) {
  if (!text) return null;
  const m = text.match(/logged\s+([\d.]+)\s*h/i);
  return m ? Math.round(parseFloat(m[1]) * 100) / 100 : null;
}

function buildDailySummary(entries) {
  const byDate = {};
  for (const e of entries) {
    if (!e.date) continue;
    if (!byDate[e.date]) byDate[e.date] = { hours: 0, entries: [] };
    const hrs = extractHours(e.text);
    if (hrs) byDate[e.date].hours = Math.round(((byDate[e.date].hours || 0) + hrs) * 100) / 100;
    byDate[e.date].entries.push(e);
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({ date, ...data, hours: Math.round((data.hours || 0) * 100) / 100 }));
}

export default function DevWorkOrderDetail({ wo, project, currentUser, dark, onBack }) {
  const { db, logHours, updateWorkOrder, submitWorkOrderForReview, updateWorkOrderStatus, acceptWorkOrder, rejectWorkOrder } = useApp();

  const left = daysUntil(wo.dueDate);
  const overdue = !isDone(wo) && left !== null && left < 0;
  const progress = Math.min(100, Math.max(0, wo.progress ?? 0));
  
  const estHours = Math.round((Number(wo.estimatedHours) || 0) * 100) / 100;
  const actHours = Math.round((Number(wo.actualHours) || 0) * 100) / 100;
  const remaining = Math.max(0, Math.round((estHours - actHours) * 100) / 100);
  const budgetUsedPct = estHours > 0
    ? Math.min(100, Math.round((actHours / estHours) * 100))
    : 0;
  const overBudget = actHours > estHours;

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRemark, setRejectRemark] = useState('');
  const [rejectError, setRejectError] = useState('');

  const [showStopModal, setShowStopModal] = useState(false);
  const [frozenSession, setFrozenSession] = useState({ seconds: 0, hours: 0 });
  const [sessionProgress, setSessionProgress] = useState(progress);
  const [sessionNote, setSessionNote] = useState('');

  const [newProgress, setNewProgress] = useState(progress);
  const [note, setNote] = useState('');
  const [logSuccess, setLogSuccess] = useState(false);
  const [logSuccessMsg, setLogSuccessMsg] = useState('');

  // Automated Stopwatch Timer state with persistence
  const TIMER_KEY = `project-soft:timer:${wo.id}`;
  const [timerState, setTimerState] = useState(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.isRunning && parsed.lastStart) {
          const elapsed = Math.floor((Date.now() - parsed.lastStart) / 1000);
          return {
            isRunning: true,
            seconds: (parsed.seconds || 0) + elapsed,
            lastStart: Date.now(),
          };
        }
        return { isRunning: false, seconds: parsed.seconds || 0, lastStart: null };
      }
    } catch {}
    return { isRunning: false, seconds: 0, lastStart: null };
  });

  useEffect(() => {
    let interval = null;
    if (timerState.isRunning) {
      interval = setInterval(() => {
        setTimerState((prev) => {
          const nextSecs = prev.seconds + 1;
          const nextObj = { isRunning: true, seconds: nextSecs, lastStart: Date.now() };
          try {
            localStorage.setItem(TIMER_KEY, JSON.stringify(nextObj));
          } catch {}
          return nextObj;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isRunning, wo.id]);

  // Live session calculated hours
  const calculatedHours = useMemo(() => {
    if (timerState.seconds === 0) return 0;
    if (timerState.seconds < 60) return 0.05; // minimum preview
    return +(timerState.seconds / 3600).toFixed(2);
  }, [timerState.seconds]);

  const handleStartTimer = () => {
    const nextObj = { isRunning: true, seconds: timerState.seconds, lastStart: Date.now() };
    setTimerState(nextObj);
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify(nextObj));
    } catch {}
    if (wo.status === 'not-started' || wo.status === 'assigned') {
      updateWorkOrderStatus(wo.id, 'in-progress');
    }
  };

  const handleOpenStopModal = () => {
    const hrs = calculatedHours;
    const secs = timerState.seconds;
    setFrozenSession({ seconds: secs, hours: hrs });
    setSessionProgress(newProgress);
    setSessionNote(note);
    setShowStopModal(true);
  };

  const handleConfirmStopAndLog = () => {
    const hrsToLog = frozenSession.hours > 0 ? frozenSession.hours : (timerState.seconds > 0 ? calculatedHours : 0);
    const finalProgress = sessionProgress;
    const finalNote = sessionNote.trim();
    const formattedDuration = formatTimer(frozenSession.seconds || timerState.seconds);

    if (hrsToLog > 0) {
      logHours(wo.id, hrsToLog, finalNote || `Automated Live Timer (${formattedDuration})`);
    }
    if (finalProgress !== progress) {
      updateWorkOrder(wo.id, { progress: finalProgress });
      setNewProgress(finalProgress);
    }
    setTimerState({ isRunning: false, seconds: 0, lastStart: null });
    try {
      localStorage.removeItem(TIMER_KEY);
    } catch {}
    setShowStopModal(false);
    setLogSuccessMsg(`Successfully logged ${hrsToLog}h (${formattedDuration}) & updated progress to ${finalProgress}%!`);
    setLogSuccess(true);
    setNote('');
    setSessionNote('');
    setTimeout(() => {
      setLogSuccess(false);
      setLogSuccessMsg('');
    }, 4000);
  };

  const handleSaveProgressOnly = () => {
    if (newProgress !== progress) {
      updateWorkOrder(wo.id, { progress: newProgress });
      setLogSuccessMsg(`Project completion updated to ${newProgress}%!`);
      setLogSuccess(true);
      setTimeout(() => {
        setLogSuccess(false);
        setLogSuccessMsg('');
      }, 3000);
    }
  };

  const history = useMemo(
    () => getWorkOrderHistory(db.activity || [], wo.id, wo.title),
    [db.activity, wo.id, wo.title],
  );
  const dailySummary = useMemo(() => buildDailySummary(history), [history]);

  const ptd = (db.ptds || []).find((p) => p.id === wo.ptdId);

  const handleSubmitReview = () => {
    submitWorkOrderForReview(wo.id, 'Ready for review');
  };

  const handleMarkComplete = () => {
    setNewProgress(100);
    updateWorkOrderStatus(wo.id, 'completed');
  };

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
          {/* AUTOMATED LIVE WORK TIMER & PROGRESS TRACKER */}
          <section className={`overflow-hidden rounded-3xl border shadow-md backdrop-blur-md ${panel}`}>
            {/* Card Header */}
            <div className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${cardBorder}`}>
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                    timerState.isRunning
                      ? 'border-orange-500/40 bg-orange-500/20 text-orange-400 shadow-lg shadow-orange-500/20'
                      : dark
                      ? 'border-zinc-800 bg-zinc-800 text-violet-400'
                      : 'border-zinc-200 bg-violet-50 text-violet-600'
                  }`}
                >
                  <Timer className={`h-5 w-5 ${timerState.isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                </span>
                <div>
                  <h3 className={`text-base font-bold ${heading}`}>Automated Work Timer & Progress</h3>
                  <p className={`text-xs ${muted}`}>
                    Click Start to run the clock — elapsed time automatically logs against your man-hours when stopped.
                  </p>
                </div>
              </div>

              {logSuccess && (
                <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4" /> {logSuccessMsg || 'Saved!'}
                </span>
              )}
            </div>

            <div className="space-y-4 p-5">
              {/* TWO-COLUMN CONTROLLER: TIMER (LEFT) + COMPLETION SLIDER (RIGHT) */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* 1. AUTOMATED LIVE STOPWATCH */}
                <div
                  className={`flex flex-col justify-between rounded-2xl border p-4.5 transition-all ${
                    timerState.isRunning
                      ? dark
                        ? 'border-orange-500/40 bg-orange-950/20 ring-1 ring-orange-500/30'
                        : 'border-orange-300 bg-orange-50/70 ring-1 ring-orange-400/40'
                      : cardBorder
                  } ${isDone(wo) ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <div>
                    {/* Top status tag */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-bold uppercase tracking-wider ${heading}`}>
                        Live Work Clock
                      </span>
                      {timerState.isRunning ? (
                        <span className="flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-orange-400 animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-orange-400" />
                          RECORDING TIME
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2.5 py-0.5 text-[10px] font-medium text-zinc-400">
                          ○ TIMER READY
                        </span>
                      )}
                    </div>

                    {/* BIG DIGITAL CLOCK DISPLAY */}
                    <div className="my-2 text-center">
                      <div
                        className={`font-mono text-4xl sm:text-5xl font-black tracking-wider tabular-nums ${
                          timerState.isRunning
                            ? 'text-orange-500 dark:text-orange-400 drop-shadow-sm'
                            : heading
                        }`}
                      >
                        {formatTimer(timerState.seconds)}
                      </div>
                      <div className="mt-1.5 text-xs text-zinc-400">
                        {timerState.seconds > 0 ? (
                          <span>
                            Logged on Stop: <strong className="font-bold text-violet-400">+{calculatedHours}h</strong> (
                            {Math.round(timerState.seconds / 60)} mins)
                          </span>
                        ) : (
                          <span>Press Start when you begin coding or testing</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stopwatch Control Button */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/40">
                    {!timerState.isRunning ? (
                      <button
                        type="button"
                        onClick={handleStartTimer}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 transition-all cursor-pointer active:scale-95"
                      >
                        <Play className="h-4 w-4 fill-white" />
                        <span>Start Working</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenStopModal}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-500 transition-all cursor-pointer active:scale-95"
                      >
                        <Square className="h-4 w-4 fill-white" />
                        <span>Stop & Log Time (+{calculatedHours}h)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. PROJECT COMPLETION PROGRESS CONTROLLER */}
                <div
                  className={`flex flex-col justify-between rounded-2xl border p-4.5 ${cardBorder} ${
                    isDone(wo) ? 'pointer-events-none opacity-60' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${heading}`}>
                        Project Completion
                      </span>
                      <div className="flex items-center gap-1.5">
                        {newProgress !== progress && (
                          <span
                            className={`flex items-center gap-0.5 text-xs font-bold ${
                              newProgress > progress ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {newProgress > progress ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            {newProgress > progress ? '+' : ''}
                            {newProgress - progress}%
                          </span>
                        )}
                        <span className="font-extrabold text-lg tabular-nums text-violet-500">
                          {newProgress}%
                        </span>
                      </div>
                    </div>

                    <p className={`text-xs ${muted}`}>
                      Slide to reflect how much of this task's deliverables are completed.
                    </p>

                    {/* Progress Slider */}
                    <div className="mt-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={newProgress}
                        onChange={(e) => setNewProgress(Number(e.target.value))}
                        className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-600"
                      />
                      <div className={`mt-1 flex justify-between text-[11px] ${muted} font-medium`}>
                        <span>0%</span>
                        <span className="font-semibold text-violet-400">{newProgress}% Completed</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* Quick Jump Buttons */}
                    <div className="mt-3 flex items-center justify-between gap-1.5">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setNewProgress(pct)}
                          className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all cursor-pointer ${
                            newProgress === pct
                              ? 'bg-violet-600 text-white shadow-sm'
                              : dark
                              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Save Progress Only Action */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/40 flex items-center justify-between gap-2">
                    <span className={`text-[11px] ${muted}`}>
                      {newProgress !== progress ? 'Unsaved completion changes' : 'Completion progress is up to date'}
                    </span>
                    {newProgress !== progress && (
                      <button
                        type="button"
                        onClick={handleSaveProgressOnly}
                        className="rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-500 transition-all cursor-pointer whitespace-nowrap"
                      >
                        Update Progress
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Note for PM */}
              <div className={isDone(wo) ? 'pointer-events-none opacity-60' : ''}>
                <label className={`block text-xs font-semibold ${heading}`}>
                  Work Note for PM <span className={`font-normal ${muted}`}>(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Finished OAuth token rotation and unit tests, starting live API test..."
                  className={`mt-1.5 w-full resize-none rounded-xl border px-3.5 py-2 text-xs outline-none ${inputBg}`}
                />
              </div>

              {/* Bottom Quick Status & Complete Bar */}
              <div className={`flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border px-4 py-3 ${cardBorder}`}>
                <p className={`min-w-0 flex-1 text-xs leading-snug ${muted}`}>
                  {isDone(wo)
                    ? 'This work order is completed.'
                    : wo.status === 'not-started'
                    ? 'Press "Start Working" above to begin your live session clock.'
                    : timerState.isRunning
                    ? `Clock running: ${formatTimer(timerState.seconds)}. Press "Stop & Log" when finishing.`
                    : 'Adjust completion percentage and submit deliverables when done.'}
                </p>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {(wo.status === 'in-progress' || wo.status === 'not-started') && (
                    <button
                      type="button"
                      onClick={handleMarkComplete}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition-all hover:bg-emerald-500 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Mark Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* DESCRIPTION */}
          <section className={`rounded-2xl border p-4.5 ${panel}`}>
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
            <div className={`mt-2.5 grid grid-cols-3 gap-1.5 rounded-xl border p-2.5 text-center ${cardBorder} ${dark ? 'bg-zinc-950/40' : 'bg-zinc-50/60'}`}>
              <div className="flex flex-col items-center justify-center">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>Allocated</span>
                <span className={`mt-0.5 text-sm font-bold tabular-nums ${heading}`}>{formatHours(estHours)}</span>
              </div>
              <div className={`flex flex-col items-center justify-center border-x ${dark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>Used</span>
                <span className={`mt-0.5 text-sm font-bold tabular-nums ${overBudget ? 'text-rose-400' : 'text-violet-500'}`}>
                  {formatHours(actHours)}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>Left</span>
                <span className={`mt-0.5 text-sm font-bold tabular-nums ${remaining <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatHours(remaining)}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <div className={`flex items-center justify-between text-[10px] font-medium ${muted}`}>
                <span>Budget usage</span>
                <span className={`tabular-nums ${overBudget ? 'font-bold text-rose-400' : 'font-semibold text-violet-400'}`}>
                  {budgetUsedPct}%{overBudget ? ' — Over budget' : ''}
                </span>
              </div>
              <div className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${barTrack}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    overBudget ? 'bg-rose-500' : budgetUsedPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
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
                          <Clock className="h-3 w-3" /> {formatHours(day.hours)}
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

      {/* End Session & Progress Update Modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 transition-all animate-in fade-in">
          <div
            className={`relative w-full max-w-lg rounded-3xl border p-6 shadow-2xl transition-all ${
              dark ? 'border-zinc-800 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  <Timer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">End Session & Log Time</h3>
                  <p className={`text-xs ${muted}`}>
                    Review session man-hours and update task deliverables completion.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStopModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Recorded Session Time Banner */}
              <div
                className={`flex items-center justify-between rounded-2xl border p-4 ${
                  dark ? 'border-orange-500/30 bg-orange-950/20' : 'border-orange-200 bg-orange-50/70'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                    Recorded Hours to Log
                  </span>
                  <div className="mt-0.5 font-mono text-3xl font-black tabular-nums text-orange-500 dark:text-orange-400">
                    +{frozenSession.hours}h
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Recorded session duration: <strong className="text-orange-400 font-semibold">{formatTimer(frozenSession.seconds)}</strong> ({Math.max(1, Math.round(frozenSession.seconds / 60))} mins)
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-violet-400 uppercase">{wo.id}</span>
                  <p className={`truncate max-w-[180px] text-xs font-medium ${muted}`}>{wo.title}</p>
                </div>
              </div>

              {/* Completion Progress Selector */}
              <div className={`rounded-2xl border p-4 ${cardBorder}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-bold uppercase tracking-wider ${heading}`}>
                    Task Completion Progress
                  </span>
                  <div className="flex items-center gap-1.5">
                    {sessionProgress !== progress && (
                      <span
                        className={`flex items-center gap-0.5 text-xs font-bold ${
                          sessionProgress > progress ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {sessionProgress > progress ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {sessionProgress > progress ? '+' : ''}
                        {sessionProgress - progress}%
                      </span>
                    )}
                    <span className="font-extrabold text-lg tabular-nums text-violet-500">
                      {sessionProgress}%
                    </span>
                  </div>
                </div>

                <p className={`text-[11px] ${muted}`}>
                  Update your overall deliverables percentage for this work order:
                </p>

                {/* Progress Slider */}
                <div className="mt-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={sessionProgress}
                    onChange={(e) => setSessionProgress(Number(e.target.value))}
                    className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                  <div className={`mt-1 flex justify-between text-[10px] ${muted} font-medium`}>
                    <span>0%</span>
                    <span className="font-semibold text-violet-400">{sessionProgress}% Completed</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="mt-2.5 flex items-center justify-between gap-1.5">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setSessionProgress(pct)}
                      className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        sessionProgress === pct
                          ? 'bg-violet-600 text-white shadow-sm'
                          : dark
                          ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Session Note (Optional) */}
              <div>
                <label className={`block text-xs font-semibold ${heading}`}>
                  Work Note for PM <span className={`font-normal ${muted}`}>(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  placeholder="What deliverables were completed during this session? (optional)"
                  className={`mt-1.5 w-full resize-none rounded-xl border p-3 text-xs outline-none transition-colors focus:border-violet-500 ${
                    dark
                      ? 'border-zinc-700 bg-zinc-950 text-white placeholder-zinc-500'
                      : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400'
                  }`}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-2.5 border-t pt-4 border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowStopModal(false)}
                className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                  dark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                }`}
              >
                Keep Working
              </button>
              <button
                type="button"
                onClick={handleConfirmStopAndLog}
                className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-500 transition-all cursor-pointer active:scale-95"
              >
                <Square className="h-4 w-4 fill-white" />
                <span>Log +{frozenSession.hours}h & Save Progress</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}