import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bug,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Flag,
  Folder,
  Link2,
  Plus,
  RotateCcw,
  Search,
  User as UserIcon,
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

function ModalSelect({ dark, value, onChange, options, placeholder = 'Select...', direction = 'down' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open]);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-all cursor-pointer ${
          dark
            ? 'bg-zinc-900 border-zinc-700 text-white focus:border-violet-500'
            : 'bg-white border-zinc-300 text-zinc-800 focus:border-violet-500'
        } ${open ? 'border-violet-500 ring-1 ring-violet-500/20' : ''}`}
      >
        <span className="truncate text-left font-medium">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-violet-400' : dark ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 ${
            direction === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } z-50 max-h-56 overflow-y-auto rounded-xl border p-1 shadow-2xl backdrop-blur-xl ${
            dark
              ? 'bg-zinc-900 border-zinc-700 shadow-black/80'
              : 'bg-white border-zinc-200 shadow-zinc-400/20'
          }`}
        >
          {options.length === 0 ? (
            <div className={`px-3 py-2 text-xs ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>No options</div>
          ) : (
            options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                    isSelected
                      ? dark
                        ? 'bg-violet-600/25 text-violet-200 font-semibold'
                        : 'bg-violet-50 text-violet-700 font-semibold'
                      : dark
                        ? 'text-zinc-200 hover:bg-zinc-800 hover:text-white'
                        : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-violet-400 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
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
  const muted = dark ? 'text-zinc-400' : 'text-zinc-500';
  const heading = dark ? 'text-zinc-100' : 'text-zinc-800';
  const inputBg = dark
    ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-violet-500'
    : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400 focus:border-violet-500';
  const inputCls = `w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-all ${inputBg}`;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border p-6 shadow-2xl backdrop-blur-xl ${bgPanel} ${borderCls}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${dark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-100 text-rose-500'}`}>
              <Bug className="h-5 w-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${heading}`}>Report an Issue</h3>
              <p className={`text-xs ${muted}`}>Log a problem found during testing for the assigned developer</p>
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
              <ModalSelect
                dark={dark}
                value={projectId}
                onChange={(val) => {
                  setProjectId(val);
                  setWorkOrderId('');
                }}
                options={projects.map((p) => ({
                  value: p.id,
                  label: `${p.name} — ${p.client}`,
                }))}
                placeholder="Select project..."
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${heading}`}>Work Order</label>
              <ModalSelect
                dark={dark}
                value={workOrderId}
                onChange={(val) => setWorkOrderId(val)}
                options={[
                  { value: '', label: 'No work order' },
                  ...projectWorkOrders.map((w) => ({
                    value: w.id,
                    label: w.title,
                  })),
                ]}
                placeholder="No work order"
              />
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
              <ModalSelect
                dark={dark}
                value={category}
                onChange={(val) => setCategory(val)}
                options={ISSUE_CATEGORIES.map((c) => ({
                  value: c,
                  label: c,
                }))}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${heading}`}>Priority</label>
              <ModalSelect
                dark={dark}
                value={priority}
                onChange={(val) => setPriority(val)}
                options={PRIORITIES.map((p) => ({
                  value: p,
                  label: p.charAt(0).toUpperCase() + p.slice(1),
                }))}
              />
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
            <ModalSelect
              dark={dark}
              value={assignedTo}
              onChange={(val) => setAssignedTo(val)}
              options={devs.map((d) => ({
                value: d.id,
                label: `${d.name} — ${d.title}`,
              }))}
              placeholder="Select developer..."
              direction="up"
            />
            <p className={`mt-1 text-[11px] ${muted}`}>
              Reported by {currentUser?.name}, assigned to the selected developer.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800/60">
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

export default function Issues({ dark }) {
  const { db, currentUser, updateIssueStatus } = useApp();
  const role = currentUser?.role || 'pm';
  const isPm = role === 'pm' || role === 'admin';

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

  const [showReport, setShowReport] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [mineOnly, setMineOnly] = useState(role === 'dev');
  const [query, setQuery] = useState('');
  const [viewImage, setViewImage] = useState(null);

  const counts = useMemo(() => {
    const c = { open: 0, 'in-progress': 0, resolved: 0, closed: 0 };
    issues.forEach((i) => {
      if (c[i.status] !== undefined) c[i.status] += 1;
    });
    return c;
  }, [issues]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (projectFilter !== 'all' && i.projectId !== projectFilter) return false;
      if (mineOnly && i.assignedTo !== currentUser?.id) return false;
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
  }, [issues, statusFilter, projectFilter, mineOnly, query, projectsById, workOrdersById, currentUser]);

  const handleAction = (issue, status) => {
    if (status === 'resolved') {
      const note = window.prompt('Resolution note (shown to the reporter):', 'Fixed the root cause.');
      if (note === null) return;
      updateIssueStatus(issue.id, 'resolved', note);
      return;
    }
    updateIssueStatus(issue.id, status);
  };

  const panel = dark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-white/80';
  const heading = dark ? 'text-zinc-200' : 'text-zinc-800';
  const muted = dark ? 'text-zinc-500' : 'text-zinc-500';
  const border = dark ? 'border-zinc-800' : 'border-zinc-200';
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

  const statusChip = (label, value) => (
    <button
      key={value}
      onClick={() => setStatusFilter(value)}
      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
        statusFilter === value
          ? dark
            ? 'bg-zinc-200 text-zinc-900'
            : 'bg-zinc-900 text-white'
          : `${dark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'}`
      }`}
    >
      {label}
      <span className={`ml-1 text-[10px] ${statusFilter === value ? (dark ? 'text-zinc-600' : 'text-zinc-400') : muted}`}>
        {value === 'all' ? issues.length : counts[value]}
      </span>
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`}>Issues</h1>
          <p className={`mt-1 text-xs ${muted}`}>
            Report bugs and quality problems found during testing. Each issue goes to its assigned developer.
          </p>
        </div>
        <button
          onClick={() => setShowReport(true)}
          className="flex w-fit items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/30 transition-all cursor-pointer hover:bg-violet-500 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Report Issue
        </button>
      </div>

      {/* Status filters */}
      <div className={`mb-4 flex flex-wrap items-center gap-2 ${border} rounded-xl p-1`}>
        {statusChip('All', 'all')}
        {statusChip('Open', 'open')}
        {statusChip('In Progress', 'in-progress')}
        {statusChip('Resolved', 'resolved')}
        {statusChip('Closed', 'closed')}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search issues..."
            className={`w-full rounded-xl border pl-9 pr-8 py-2 text-xs outline-none ${inputBg}`}
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
        <div className="flex items-center gap-2">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold outline-none cursor-pointer ${inputBg}`}
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
                : `${border} ${dark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'}`
            }`}
          >
            <UserIcon className="h-3.5 w-3.5" />
            Assigned to me
          </button>
        </div>
      </div>

      {/* Issue list */}
      <div className="space-y-3">
        {filtered.map((issue) => {
          const project = projectsById[issue.projectId];
          const wo = workOrdersById[issue.workOrderId];
          const assignee = usersById[issue.assignedTo];
          const catCls = CATEGORY_META[issue.category] || CATEGORY_META.Other;
          const isMine = issue.assignedTo === currentUser?.id;

          return (
            <div key={issue.id} className={`rounded-2xl border p-3 sm:p-4 ${panel}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {/* Screenshot / category tile */}
                {issue.screenshot ? (
                  <button
                    onClick={() => setViewImage({ src: issue.screenshot, name: issue.screenshotName })}
                    className="h-12 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-800 cursor-pointer sm:h-20 sm:w-28"
                  >
                    <img src={issue.screenshot} alt={issue.screenshotName || 'Issue screenshot'} className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <div className={`flex h-12 w-16 shrink-0 items-center justify-center rounded-xl border sm:h-20 sm:w-28 ${catCls}`}>
                    <Bug className="h-4 w-4 sm:h-7 sm:w-7" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-semibold ${heading}`}>{issue.title}</span>
                    <StatusBadge status={issue.status} />
                    <PriorityBadge priority={issue.priority} />
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${catCls}`}>
                      {issue.category}
                    </span>
                  </div>

                  <p className={`mt-1.5 text-xs leading-relaxed ${muted}`}>{issue.description}</p>

                  {issue.status === 'resolved' && issue.resolution && (
                    <div className={`mt-2 rounded-xl border p-2.5 text-[11px] ${dark ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700'}`}>
                      <span className="font-semibold">How it was fixed:</span> {issue.resolution}
                    </div>
                  )}

                  <div className={`mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ${muted}`}>
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
                      <Flag className="h-3 w-3" /> Reported by {issue.reportedBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {issue.dateReported} {issue.timeReported && `· ${issue.timeReported}`}
                    </span>
                  </div>
                </div>

                {/* Assignee + actions */}
                <div className="flex shrink-0 flex-col items-end gap-2 self-start">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold ${
                        dark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {initials(assignee?.name)}
                    </span>
                    <div className="text-right leading-tight">
                      <div className={`text-[11px] font-semibold ${heading}`}>{assignee?.name || 'Unassigned'}</div>
                      <div className={`text-[10px] ${muted}`}>{isMine ? 'Assigned to you' : 'Assignee'}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-1.5">
                    {issue.status === 'open' && isMine && (
                      <button
                        onClick={() => handleAction(issue, 'in-progress')}
                        className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-sky-500 cursor-pointer"
                      >
                        Start Fixing
                      </button>
                    )}
                    {issue.status === 'in-progress' && isMine && (
                      <button
                        onClick={() => handleAction(issue, 'resolved')}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                      >
                        <CheckCircle2 className="mr-1 inline h-3 w-3" /> Resolve
                      </button>
                    )}
                    {issue.status === 'resolved' && isPm && (
                      <button
                        onClick={() => handleAction(issue, 'closed')}
                        className="rounded-lg bg-zinc-700 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-zinc-600 cursor-pointer"
                      >
                        Confirm Fix
                      </button>
                    )}
                    {(issue.status === 'resolved' || issue.status === 'closed') && (
                      <button
                        onClick={() => handleAction(issue, 'open')}
                        title="Reopen"
                        className={`rounded-lg p-1.5 ${dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'} ${muted} cursor-pointer`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className={`rounded-2xl border py-16 text-center ${panel}`}>
            <CheckCircle2 className={`mx-auto h-10 w-10 ${muted}`} />
            <p className={`mt-3 text-sm font-semibold ${heading}`}>No issues found</p>
            <p className={`mt-1 text-xs ${muted}`}>Try clearing a filter or report a new issue.</p>
          </div>
        )}
      </div>

      {showReport && <ReportIssueModal dark={dark} onClose={() => setShowReport(false)} />}
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