import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  Bug,
  Camera,
  CheckCircle2,
  Clock,
  Flag,
  Folder,
  Link2,
  Plus,
  RotateCcw,
  Search,
  Timer,
  User as UserIcon,
  Wrench,
  X,
} from 'lucide-react';
import { useApp } from '../../data/context.js';

const STATUS_META = {
  open: 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
  'in-progress': 'bg-sky-500/15 text-sky-400 border border-sky-500/20',
  resolved: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20',
};

const PRIORITY_META = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/20',
  high: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  medium: 'bg-sky-500/15 text-sky-400 border border-sky-500/20',
  low: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20',
};

const CATEGORY_META = {
  Functional: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  'UI/UX': 'text-violet-500 bg-violet-500/10 border-violet-500/20',
  Performance: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  Security: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
  Data: 'text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20',
  Other: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
};

const ISSUE_CATEGORIES = ['Functional', 'UI/UX', 'Performance', 'Security', 'Data', 'Other'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const STATUS_PILLS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
];

function accentShadow(status) {
  switch (status) {
    case 'open':
      return 'inset 4px 0 0 0 #f43f5e';
    case 'in-progress':
      return 'inset 4px 0 0 0 #0ea5e9';
    case 'resolved':
      return 'inset 4px 0 0 0 #10b981';
    default:
      return 'inset 4px 0 0 0 #71717a';
  }
}

function StatusBadge({ status }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_META[status] || STATUS_META.open}`}>
      {status.replace('-', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_META[priority] || PRIORITY_META.medium}`}>
      {priority}
    </span>
  );
}

function ReportIssueModal({ dark, onClose, defaultProjectId = '' }) {
  const { db, currentUser, reportIssue } = useApp();
  const projects = db.projects || [];
  const users = db.users || [];
  const devs = users.filter((u) => u.role === 'dev');

  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '');
  const [workOrderId, setWorkOrderId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Functional');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState(devs[0]?.id || '');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotName, setScreenshotName] = useState('');

  const projectWorkOrders = (db.workOrders || []).filter((w) => w.projectId === projectId);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result);
      setScreenshotName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    reportIssue({
      title,
      category,
      priority,
      description,
      projectId,
      workOrderId: workOrderId || null,
      assignedTo,
      screenshot,
      screenshotName,
    });
    onClose();
  };

  const bgPanel = dark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-800';
  const borderCls = dark ? 'border-zinc-800' : 'border-zinc-200';
  const divider = dark ? 'border-zinc-800/60' : 'border-zinc-200';
  const muted = dark ? 'text-zinc-400' : 'text-zinc-500';
  const heading = dark ? 'text-zinc-100' : 'text-zinc-800';
  const inputBg = dark
    ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-violet-500'
    : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400 focus:border-violet-500';
  const inputCls = `w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-all ${inputBg}`;
  const selectCls = `${inputCls} cursor-pointer [&>option]:bg-white [&>option]:text-zinc-800 ${dark ? '[&>option]:bg-zinc-900 [&>option]:text-zinc-100' : ''}`;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border p-6 shadow-2xl backdrop-blur-xl ${bgPanel} ${borderCls}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b shrink-0" style={{ borderColor: dark ? 'rgba(63,63,70,.6)' : 'rgb(228 228 231)' }}>
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${dark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-100 text-rose-500'}`}>
              <Bug className="h-5 w-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${heading}`}>Report an Issue</h3>
              <p className={`text-xs ${muted}`}>Log a problem you found so it gets fixed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-xl p-1.5 ${dark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'} cursor-pointer`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${heading}`}>Project *</label>
              <select
                value={projectId}
                onChange={(e) => { setProjectId(e.target.value); setWorkOrderId(''); }}
                className={selectCls}
                style={{ colorScheme: dark ? 'dark' : 'light' }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className={dark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-800'}>
                    {p.name} — {p.client}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${heading}`}>Work Order</label>
              <select
                value={workOrderId}
                onChange={(e) => setWorkOrderId(e.target.value)}
                className={selectCls}
                style={{ colorScheme: dark ? 'dark' : 'light' }}
              >
                <option value="" className={dark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-800'}>No work order</option>
                {projectWorkOrders.map((w) => (
                  <option key={w.id} value={w.id} className={dark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-800'}>
                    {w.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${heading}`}>Issue Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dashboard widgets not loading after login"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${heading}`}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={selectCls}
                style={{ colorScheme: dark ? 'dark' : 'light' }}
              >
                {ISSUE_CATEGORIES.map((c) => (
                  <option key={c} value={c} className={dark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-800'}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${heading}`}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={selectCls}
                style={{ colorScheme: dark ? 'dark' : 'light' }}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className={dark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-800'}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${heading}`}>Description *</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, steps to reproduce, and what you expected..."
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${heading}`}>Screenshot</label>
            <div className="flex items-start gap-3">
              <label
                className={`flex w-36 h-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed ${
                  screenshot ? 'border-emerald-500/40 bg-emerald-500/5' : dark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-300 bg-zinc-50'
                }`}
              >
                {screenshot ? (
                  <img src={screenshot} alt="Issue screenshot preview" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <>
                    <Camera className={`h-5 w-5 ${muted}`} />
                    <span className={`text-[10px] ${muted}`}>Attach a screenshot</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>
              <div className="min-w-0 flex-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-violet-400">
                  {screenshot ? (
                    <span className="truncate">{screenshotName}</span>
                  ) : (
                    <span>Choose an image file</span>
                  )}
                </label>
                <p className={`mt-1 text-[11px] ${muted}`}>
                  Optional — shows a visual of the problem to the assigned developer.
                </p>
                {screenshot && (
                  <button
                    type="button"
                    onClick={() => { setScreenshot(null); setScreenshotName(''); }}
                    className="mt-1.5 text-[11px] font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    Remove screenshot
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${heading}`}>Assign To *</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className={selectCls}
              style={{ colorScheme: dark ? 'dark' : 'light' }}
            >
              {devs.map((d) => (
                <option key={d.id} value={d.id} className={dark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-800'}>
                  {d.name} — {d.title}
                </option>
              ))}
            </select>
            <p className={`mt-1 text-[11px] ${muted}`}>
              Reported by {currentUser?.name}, assigned to the selected developer.
            </p>
          </div>

          <div className={`flex justify-end gap-2 pt-3 border-t ${divider}`}>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${dark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-200 text-zinc-600'} cursor-pointer`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-violet-600/30 hover:bg-violet-500 cursor-pointer"
            >
              <Bug className="h-3.5 w-3.5" /> Report Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResolveIssueModal({ dark, issue, onCancel, onConfirm }) {
  const [note, setNote] = useState('');
  const muted = dark ? 'text-zinc-400' : 'text-zinc-500';
  const heading = dark ? 'text-zinc-100' : 'text-zinc-800';
  const bgPanel = dark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-800';
  const borderCls = dark ? 'border-zinc-800' : 'border-zinc-200';
  const inputBg = dark
    ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-emerald-500'
    : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400 focus:border-emerald-500';
  const active = note.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl backdrop-blur-xl ${bgPanel} ${borderCls}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-base font-bold ${heading}`}>Mark Issue Solved</h3>
              <p className={`mt-0.5 text-xs leading-snug ${muted}`}>"{issue.title}"</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className={`rounded-xl p-1.5 ${dark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'} cursor-pointer`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          <label className={`block text-xs font-semibold ${heading}`}>What caused it, and how did you fix it? *</label>
          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="e.g. Rate limiter only checked the client IP, not the API key — fixed by keying on (key + IP)."
            className={`mt-1.5 w-full resize-none rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-all ${inputBg}`}
          />
          <p className={`mt-1.5 text-[11px] ${muted}`}>
            This note is shown to the reporter and saved as the resolution cause.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${dark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-200 text-zinc-600'} cursor-pointer`}
          >
            Cancel
          </button>
          <button
            onClick={() => active && onConfirm(note.trim())}
            disabled={!active}
            className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-semibold text-white transition-all cursor-pointer ${
              active
                ? 'bg-emerald-600 shadow-md shadow-emerald-600/30 hover:bg-emerald-500'
                : 'cursor-not-allowed bg-zinc-600 opacity-50'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Solved
          </button>
        </div>
      </div>
    </div>
  );
}

function ScreenshotLightbox({ src, name, onClose }) {
  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
          <span className="text-xs font-semibold text-zinc-200">{name || 'Issue screenshot'}</span>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <img src={src} alt={name || 'Issue screenshot'} className="max-h-[80vh] w-auto" onClick={onClose} />
      </div>
    </div>
  );
}

export default function DevIssues({ dark }) {
  const { db, currentUser, updateIssueStatus } = useApp();
  const meId = currentUser?.id;

  const [showReport, setShowReport] = useState(false);
  const [resolving, setResolving] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [mineOnly, setMineOnly] = useState(true);
  const [query, setQuery] = useState('');
  const [viewImage, setViewImage] = useState(null);

  const issues = useMemo(() => db.issues || [], [db.issues]);
  const projectsById = useMemo(
    () => Object.fromEntries((db.projects || []).map((p) => [p.id, p])),
    [db.projects],
  );
  const workOrdersById = useMemo(
    () => Object.fromEntries((db.workOrders || []).map((w) => [w.id, w])),
    [db.workOrders],
  );
  const usersById = useMemo(
    () => Object.fromEntries((db.users || []).map((u) => [u.id, u])),
    [db.users],
  );

  const myIssues = useMemo(() => issues.filter((i) => i.assignedTo === meId), [issues, meId]);
  const scope = mineOnly ? myIssues : issues;

  const counts = useMemo(() => {
    const c = { open: 0, 'in-progress': 0, resolved: 0, closed: 0 };
    scope.forEach((i) => {
      if (c[i.status] !== undefined) c[i.status] += 1;
    });
    return c;
  }, [scope]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = scope.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (projectFilter !== 'all' && i.projectId !== projectFilter) return false;
      const project = projectsById[i.projectId];
      const wo = workOrdersById[i.workOrderId];
      return (
        !q ||
        i.title?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        project?.name?.toLowerCase().includes(q) ||
        wo?.title?.toLowerCase().includes(q)
      );
    });
    list.sort((a, b) => {
      const p = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      if (p !== 0) return p;
      return (b.dateReported || '').localeCompare(a.dateReported || '');
    });
    return list;
  }, [scope, statusFilter, projectFilter, query, projectsById, workOrdersById]);

  const panel = dark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-white/80';
  const cardBorder = dark ? 'border-zinc-800' : 'border-zinc-200';
  const heading = dark ? 'text-zinc-100' : 'text-zinc-800';
  const muted = dark ? 'text-zinc-400' : 'text-zinc-500';
  const inputBg = dark
    ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500 focus:border-violet-500'
    : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400 focus:border-violet-500';

  const initials = (name) =>
    (name || '')
      .split(' ')
      .map((w) => w.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const kpis = [
    { id: 'open', label: 'Open', value: counts.open, icon: AlertCircle, accent: 'text-rose-500', sub: 'waiting on you' },
    { id: 'in-progress', label: 'Fixing', value: counts['in-progress'], icon: Timer, accent: 'text-sky-500', sub: 'in progress' },
    { id: 'resolved', label: 'Resolved', value: counts.resolved, icon: CheckCircle2, accent: 'text-emerald-500', sub: 'fixed' },
    { id: 'closed', label: 'Closed', value: counts.closed, icon: Archive, accent: 'text-zinc-500', sub: 'confirmed' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-6 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`}>Issues</h1>
          <p className={`mt-1 text-xs ${muted}`}>
            Bugs and quality problems that need fixing. Start on an issue, then mark it solved with the cause.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {counts.open > 0 && (
            <span className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-bold text-rose-400">
              <AlertCircle className="h-3.5 w-3.5" /> {counts.open} open
            </span>
          )}
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-md shadow-violet-600/30 transition-all cursor-pointer hover:bg-violet-500 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> Report Issue
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-2">
        {kpis.map((k) => {
          const active = statusFilter === k.id;
          return (
            <button
              key={k.id}
              onClick={() => setStatusFilter(active ? 'all' : k.id)}
              className={`min-w-0 rounded-2xl border p-2 text-left transition-all cursor-pointer sm:p-3 ${panel} ${active ? 'border-violet-500/50' : cardBorder}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${cardBorder}`}>
                  <k.icon className={`h-3 w-3 ${k.accent}`} />
                </span>
                <span className={`text-sm font-bold tabular-nums leading-none sm:text-xl ${heading}`}>{k.value}</span>
              </div>
              <div className={`mt-1 truncate text-[10px] font-bold uppercase ${muted}`}>{k.label}</div>
              <div className={`mt-0.5 hidden truncate text-[10px] sm:block ${muted}`}>{k.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="mt-4 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, project, work order..."
            className={`w-full rounded-xl border py-2 pl-9 pr-8 text-xs outline-none transition-all ${inputBg}`}
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {STATUS_PILLS.map((s) => {
              const count = s.id === 'all' ? scope.length : counts[s.id] || 0;
              const active = statusFilter === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-violet-600 text-white'
                      : dark
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      : 'bg-zinc-200/80 text-zinc-600 hover:bg-zinc-300'
                  }`}
                >
                  {s.label}
                  <span className={`tabular-nums text-[10px] ${active ? 'text-white/70' : 'opacity-60'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-xs outline-none cursor-pointer ${inputBg}`}
          >
            <option value="all">All Projects</option>
            {(db.projects || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setMineOnly((m) => !m)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              mineOnly
                ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                : `${cardBorder} ${dark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'}`
            }`}
          >
            <UserIcon className="h-3.5 w-3.5" />
            Assigned to me
          </button>
        </div>
      </div>

      {/* Issue list */}
      <div className="mt-4 space-y-2.5">
        {filtered.length === 0 && (
          <div className={`rounded-2xl border py-16 text-center ${panel}`}>
            {scope.length === 0 ? (
              <>
                <Bug className={`mx-auto h-10 w-10 ${muted}`} />
                <p className={`mt-3 text-sm font-semibold ${heading}`}>
                  {mineOnly ? 'No issues assigned to you yet' : 'No issues yet'}
                </p>
                <p className={`mt-1 text-xs ${muted}`}>Bugs reported for your projects will show up here.</p>
              </>
            ) : (
              <>
                <Search className={`mx-auto h-10 w-10 ${muted}`} />
                <p className={`mt-3 text-sm font-semibold ${heading}`}>No issues match your filters</p>
                <p className={`mt-1 text-xs ${muted}`}>Try a different search term, project, or status.</p>
              </>
            )}
          </div>
        )}

        {filtered.map((issue) => {
          const project = projectsById[issue.projectId];
          const wo = workOrdersById[issue.workOrderId];
          const assignee = usersById[issue.assignedTo];
          const catCls = CATEGORY_META[issue.category] || CATEGORY_META.Other;
          const isMine = issue.assignedTo === meId;

          return (
            <div
              key={issue.id}
              style={{ boxShadow: accentShadow(issue.status) }}
              className={`rounded-2xl border p-3 ${panel}`}
            >
              <div className="flex flex-col gap-2">
                {/* Top row: title + badges + screenshot */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className={`min-w-0 text-sm font-bold leading-snug ${heading}`}>{issue.title}</span>
                    <StatusBadge status={issue.status} />
                    <PriorityBadge priority={issue.priority} />
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${catCls}`}>
                      {issue.category}
                    </span>
                  </div>
                  {issue.screenshot ? (
                    <button
                      onClick={() => setViewImage({ src: issue.screenshot, name: issue.screenshotName })}
                      className="h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-zinc-700 cursor-pointer"
                    >
                      <img src={issue.screenshot} alt={issue.screenshotName || 'Issue screenshot'} className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <div className={`hidden h-10 w-14 shrink-0 items-center justify-center rounded-lg border sm:flex ${catCls}`}>
                      <Bug className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className={`line-clamp-1 text-xs leading-relaxed ${muted}`}>{issue.description}</p>

                {/* Meta */}
                <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ${muted}`}>
                  {project && (
                    <span className="flex items-center gap-1">
                      <Folder className="h-3 w-3" /> {project.name}
                    </span>
                  )}
                  {wo && (
                    <span className="flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> {wo.title}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Flag className="h-3 w-3" /> by {issue.reportedBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {issue.dateReported}
                    {issue.timeReported && ` · ${issue.timeReported}`}
                  </span>
                </div>

                {/* Resolution note */}
                {issue.status === 'resolved' && issue.resolution && (
                  <div className={`flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${dark ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700'}`}>
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>
                      <span className="font-semibold">Cause & fix:</span> {issue.resolution}
                    </span>
                  </div>
                )}

                {/* Footer: assignee + actions */}
                <div className={`flex flex-wrap items-center justify-between gap-2 border-t pt-2 ${cardBorder}`}>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-lg text-[9px] font-bold ${
                        dark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {initials(assignee?.name)}
                    </span>
                    <div className="leading-tight">
                      <div className={`text-[10px] font-semibold ${heading}`}>{assignee?.name}</div>
                      <div className={`text-[9px] uppercase tracking-wide ${muted}`}>{isMine ? 'Assigned to you' : 'Assignee'}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {issue.status === 'open' && isMine && (
                      <button
                        onClick={() => updateIssueStatus(issue.id, 'in-progress')}
                        className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-sky-500 cursor-pointer"
                      >
                        <Wrench className="h-3 w-3" /> Start Fixing
                      </button>
                    )}
                    {issue.status === 'in-progress' && isMine && (
                      <button
                        onClick={() => setResolving(issue)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Mark Solved
                      </button>
                    )}
                    {issue.status === 'resolved' && isMine && (
                      <button
                        onClick={() => updateIssueStatus(issue.id, 'open', '')}
                        title="Reopen issue"
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                          dark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                        }`}
                      >
                        <RotateCcw className="h-3 w-3" /> Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showReport && <ReportIssueModal dark={dark} onClose={() => setShowReport(false)} />}
      {resolving && (
        <ResolveIssueModal
          dark={dark}
          issue={resolving}
          onCancel={() => setResolving(null)}
          onConfirm={(note) => {
            updateIssueStatus(resolving.id, 'resolved', note);
            setResolving(null);
          }}
        />
      )}
      {viewImage && (
        <ScreenshotLightbox
          src={viewImage.src}
          name={viewImage.name}
          onClose={() => setViewImage(null)}
        />
      )}
    </div>
  );
}