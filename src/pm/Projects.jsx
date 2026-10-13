import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Layers,
  LayoutGrid,
  List,
  ListTodo,
  Play,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
  FileText,
  Activity,
  Check,
} from 'lucide-react';
import { useApp } from '../data/context.js';
import { PtdStatusBadge, PriorityBadge } from './badges.jsx';

const inputCls = (dark) =>
  `w-full rounded-xl border px-3.5 py-2 text-sm outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 ${
    dark
      ? 'border-zinc-700/80 bg-zinc-900/90 text-white placeholder-zinc-500'
      : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400'
  }`;

const PROJECT_STATUS_LABELS = {
  active: 'Active',
  'on-hold': 'On Hold',
  completed: 'Completed',
  'not-started': 'Not Started',
  delayed: 'Delayed',
};

const PROJECT_STATUS_STYLES = {
  active: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  'on-hold': 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  completed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  'not-started': 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20',
  delayed: 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
};

const HEALTH_STYLES = {
  'on-track': 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  'at-risk': 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  overdue: 'bg-red-500/15 text-red-400 border border-red-500/20',
  delayed: 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
};

const HEALTH_LABELS = { 'on-track': 'On Track', 'at-risk': 'At Risk', overdue: 'Overdue', delayed: 'Delayed' };
const HEALTH_COLORS = { 'on-track': '#8b5cf6', 'at-risk': '#f59e0b', overdue: '#ef4444', delayed: '#f43f5e' };
const HEALTH_ACCENT = { 'on-track': 'bg-violet-500', 'at-risk': 'bg-amber-500', overdue: 'bg-red-500', delayed: 'bg-rose-500' };

function StatusChip({ status }) {
  return (
    <span
      className={`rounded px-1.5 py-px text-[9px] font-semibold uppercase ${
        PROJECT_STATUS_STYLES[status] || 'bg-zinc-500/15 text-zinc-400'
      }`}
    >
      {PROJECT_STATUS_LABELS[status] || status}
    </span>
  );
}

function HealthBadge({ health }) {
  return (
    <span
      className={`rounded px-1.5 py-px text-[9px] font-semibold uppercase ${
        HEALTH_STYLES[health] || HEALTH_STYLES['on-track']
      }`}
    >
      {HEALTH_LABELS[health] || health}
    </span>
  );
}

function ProgressRing({ value, color, dark, size = 52 }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        strokeWidth="6"
        className={dark ? 'stroke-zinc-800' : 'stroke-zinc-200'}
      />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        stroke={color}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        style={{ transition: 'stroke-dashoffset 400ms ease' }}
      />
    </svg>
  );
}

function projectHealth(proj, progress) {
  if (proj.status === 'delayed') return 'delayed';
  if (proj.status === 'completed') return 'completed';
  if (!proj.dueDate) return 'on-track';
  const today = new Date().toISOString().slice(0, 10);
  if (proj.dueDate < today && progress < 100) return 'overdue';
  const daysUntil = Math.max(0, Math.ceil((new Date(proj.dueDate) - new Date(today)) / 86400000));
  if (daysUntil <= 10 && progress < 80) return 'at-risk';
  return 'on-track';
}

function projectProgress(proj, ptds) {
  const pts = ptds.filter((t) => t.projectId === proj.id);
  if (!pts.length) return 0;
  const totalHours = pts.reduce((s, t) => s + (t.estimatedHours || 0), 0);
  if (totalHours > 0) {
    return Math.round(
      pts.reduce((s, t) => s + (t.progress || 0) * (t.estimatedHours || 0), 0) / totalHours,
    );
  }
  return Math.round(pts.reduce((s, t) => s + (t.progress || 0), 0) / pts.length);
}

function daysLeft(proj) {
  if (!proj.dueDate) return null;
  const today = new Date().toISOString().slice(0, 10);
  return Math.ceil((new Date(proj.dueDate) - new Date(today)) / 86400000);
}

export default function Projects({ dark }) {
  const { db, createProject, updateProject, deleteProject } = useApp();
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTab, setProjectTab] = useState('overview'); // overview, ptds, workorders, activity
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('urgency'); // urgency, progress, name, hours
  const [viewMode, setViewMode] = useState('table'); // grid, table
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New project form state
  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    priority: 'medium',
    status: 'active',
    dueDate: '',
    team: [],
    description: '',
  });

  const panel = dark
    ? 'border-zinc-800/90 bg-zinc-900/75 backdrop-blur-md'
    : 'border-zinc-200/90 bg-white/85 backdrop-blur-md';
  const cardBorder = dark ? 'border-zinc-800' : 'border-zinc-200';
  const heading = dark ? 'text-zinc-100' : 'text-zinc-800';
  const muted = dark ? 'text-zinc-400' : 'text-zinc-500';

  const usersById = useMemo(() => Object.fromEntries(db.users.map((u) => [u.id, u])), [db.users]);
  const developers = useMemo(() => db.users.filter((u) => u.role === 'dev'), [db.users]);

  const initials = (name) =>
    (name || '')
      .split(' ')
      .map((w) => w.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const projects = useMemo(() => {
    return db.projects.map((p) => {
      const progress = projectProgress(p, db.ptds);
      const pts = db.ptds.filter((t) => t.projectId === p.id);
      const wos = db.workOrders.filter((w) => w.projectId === p.id);
      const bls = (db.blockers || []).filter(
        (b) => b.projectId === p.id && b.status === 'open',
      );
      const estHours = pts.reduce((s, t) => s + (t.estimatedHours || 0), 0);
      const allocatedHours = pts.reduce((s, t) => s + (t.allocatedHours || 0), 0);
      const usedHours = pts.reduce((s, t) => s + (t.usedHours || 0), 0);
      const milestones = (db.milestones || []).filter((m) => m.projectId === p.id);

      return {
        ...p,
        progress,
        health: projectHealth(p, progress),
        ptds: pts,
        workOrders: wos,
        blockers: bls,
        milestones,
        teamMembers: (p.team || []).map((id) => usersById[id]).filter(Boolean),
        estHours,
        allocatedHours,
        usedHours,
        burnPct: estHours > 0 ? Math.min(100, Math.round((usedHours / estHours) * 100)) : 0,
      };
    });
  }, [db.projects, db.ptds, db.workOrders, db.blockers, db.milestones, usersById]);

  const filtered = useMemo(() => {
    let list = projects.filter((p) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q);
      const matchesStatus = filter === 'all' || p.status === filter;
      return matchesQuery && matchesStatus;
    });

    if (sortBy === 'urgency') {
      list.sort((a, b) => {
        const order = { overdue: 0, 'at-risk': 1, 'on-track': 2 };
        if (order[a.health] !== order[b.health]) return order[a.health] - order[b.health];
        return (daysLeft(a) ?? 999) - (daysLeft(b) ?? 999);
      });
    } else if (sortBy === 'progress') {
      list.sort((a, b) => b.progress - a.progress);
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'hours') {
      list.sort((a, b) => b.estHours - a.estHours);
    }

    return list;
  }, [projects, query, filter, sortBy]);

  const stats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      atRisk: projects.filter((p) => p.health === 'at-risk' || p.health === 'overdue' || p.status === 'delayed').length,
      completed: projects.filter((p) => p.status === 'completed').length,
    };
  }, [projects]);

  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
    : 0;
  const totalEst = projects.reduce((s, p) => s + p.estHours, 0);

  const attention = useMemo(
    () =>
      projects
        .filter((p) => p.status !== 'completed' && (p.health === 'overdue' || p.health === 'at-risk' || p.health === 'delayed' || p.status === 'delayed' || p.blockers.length > 0))
        .sort((a) => (a.health === 'overdue' || a.status === 'delayed' ? -1 : 1)),
    [projects],
  );

  const selected = selectedProject ? projects.find((p) => p.id === selectedProject) : null;

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;
    const id = createProject(newProject);
    setNewProject({
      name: '',
      client: '',
      priority: 'medium',
      status: 'active',
      dueDate: '',
      team: [],
      description: '',
    });
    setShowCreateModal(false);
    setSelectedProject(id);
  };

  const toggleTeamMember = (userId) => {
    setNewProject((prev) => ({
      ...prev,
      team: prev.team.includes(userId)
        ? prev.team.filter((id) => id !== userId)
        : [...prev.team, userId],
    }));
  };

  // Avatar stack helper
  const memberStack = (members) => (
    <div className="flex items-center">
      {members.length > 0 ? (
        <div className="flex -space-x-1.5">
          {members.slice(0, 3).map((m) => (
            <span
              key={m.id}
              title={`${m.name} (${m.title})`}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ring-2 shadow-xs ${
                dark
                  ? 'bg-zinc-800 text-zinc-200 ring-zinc-900'
                  : 'bg-zinc-200 text-zinc-700 ring-white'
              }`}
            >
              {initials(m.name)}
            </span>
          ))}
          {members.length > 3 && (
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ring-2 ${
                dark ? 'bg-zinc-700 text-zinc-300 ring-zinc-900' : 'bg-zinc-300 text-zinc-800 ring-white'
              }`}
            >
              +{members.length - 3}
            </span>
          )}
        </div>
      ) : (
        <span className={`text-[11px] ${muted}`}>Unassigned</span>
      )}
    </div>
  );

  // ----------------------------------------------------
  // SELECTED PROJECT DETAIL VIEW
  // ----------------------------------------------------
  if (selected) {
    const left = daysLeft(selected);
    const projectActivities = (db.activity || []).filter((a) => a.projectId === selected.id);

    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-6 animate-fade-in">
        {/* Navigation Breadcrumb */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-violet-500 hover:text-violet-400 cursor-pointer transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Projects Directory
          </button>
          <div className="flex items-center gap-2">
            <select
              value={selected.status}
              onChange={(e) => updateProject(selected.id, { status: e.target.value })}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer ${
                dark
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                  : 'border-zinc-300 bg-white text-zinc-700'
              }`}
            >
              <option value="active">Active</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="not-started">Not Started</option>
            </select>
            <button
              onClick={() => {
                if (window.confirm(`Delete project "${selected.name}"?`)) {
                  deleteProject(selected.id);
                  setSelectedProject(null);
                }
              }}
              title="Delete Project"
              className={`rounded-lg border p-1.5 text-xs text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors ${cardBorder}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Project Header Card */}
        <div className={`rounded-2xl border p-4 sm:p-5 ${panel}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-base sm:text-lg font-bold text-white shadow-md shadow-violet-500/30">
                {selected.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className={`text-lg sm:text-2xl font-bold ${heading}`}>{selected.name}</h1>
                  <StatusChip status={selected.status} />
                  {selected.status !== 'completed' && selected.status !== 'delayed' && (
                    <HealthBadge health={selected.health} />
                  )}
                  <PriorityBadge priority={selected.priority} />
                </div>
                <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${muted}`}>
                  <span className="font-medium text-violet-400">{selected.client}</span>
                  <span>·</span>
                  <span>PM: {usersById[selected.pm]?.name || 'Unassigned'}</span>
                  <span>·</span>
                  <span>
                    Due {selected.dueDate || '—'}{' '}
                    {left !== null && (
                      <span className={left < 0 ? 'text-red-400 font-bold' : 'text-violet-400'}>
                        ({left < 0 ? `${-left}d overdue` : `${left}d remaining`})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Header Pill */}
            <div className="flex items-center gap-3 sm:gap-6 bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5">
              <div className="text-center sm:text-right">
                <div className={`text-[10px] uppercase tracking-wider ${muted}`}>Progress</div>
                <div className="text-sm sm:text-xl font-bold tabular-nums text-violet-500">
                  {selected.progress}%
                </div>
              </div>
              <div className={`h-6 w-px ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              <div className="text-center sm:text-right">
                <div className={`text-[10px] uppercase tracking-wider ${muted}`}>Hours Used</div>
                <div className={`text-sm sm:text-xl font-bold tabular-nums ${heading}`}>
                  {selected.usedHours}h{' '}
                  <span className={`text-xs font-normal ${muted}`}>/ {selected.estHours}h</span>
                </div>
              </div>
              <div className={`h-6 w-px ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              <div className="text-center sm:text-right">
                <div className={`text-[10px] uppercase tracking-wider ${muted}`}>PTDs / WOs</div>
                <div className={`text-sm sm:text-xl font-bold tabular-nums ${heading}`}>
                  {selected.ptds.length} <span className={`text-xs font-normal ${muted}`}>/ {selected.workOrders.length}</span>
                </div>
              </div>
            </div>
          </div>

          {selected.description && (
            <p className={`mt-3 text-xs sm:text-sm leading-relaxed ${muted}`}>
              {selected.description}
            </p>
          )}

          {/* Delivery Progress Bar */}
          <div className="mt-4">
            <div className={`h-2 w-full overflow-hidden rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  HEALTH_ACCENT[selected.health] || HEALTH_ACCENT['on-track']
                }`}
                style={{ width: `${Math.min(100, Math.max(0, selected.progress))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Workspace Tab Navigation */}
        <div className="mt-4 flex items-center justify-between border-b pb-1 gap-2 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'overview', label: 'Overview', icon: Layers },
              { id: 'ptds', label: `PTDs (${selected.ptds.length})`, icon: FileText },
              { id: 'workorders', label: `Work Orders (${selected.workOrders.length})`, icon: ListTodo },
              { id: 'activity', label: 'Activity Log', icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setProjectTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  projectTab === tab.id
                    ? 'bg-violet-500 text-white shadow-sm'
                    : dark
                      ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      : 'text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {selected.blockers.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-xs font-bold text-red-400 animate-pulse">
              <ShieldAlert className="h-3.5 w-3.5" />
              {selected.blockers.length} Active Blocker{selected.blockers.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Tab 1: OVERVIEW */}
        {projectTab === 'overview' && (
          <div className="mt-4 space-y-4 animate-fade-in">
            {/* Team & Blockers Row */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Team Members */}
              <div className={`rounded-2xl border p-4 sm:p-5 ${panel}`}>
                <h2 className={`mb-3 text-sm font-bold ${heading}`}>Assigned Team Members</h2>
                {selected.teamMembers.length > 0 ? (
                  <div className="space-y-2">
                    {selected.teamMembers.map((m) => {
                      const userWos = selected.workOrders.filter((w) => w.assignee === m.id);
                      return (
                        <div
                          key={m.id}
                          className={`flex items-center justify-between rounded-xl border p-2.5 transition-colors ${
                            dark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                dark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-800'
                              }`}
                            >
                              {initials(m.name)}
                            </span>
                            <div>
                              <div className={`text-xs font-semibold ${heading}`}>{m.name}</div>
                              <div className={`text-[10px] ${muted}`}>{m.title}</div>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-violet-400">
                            {userWos.length} Work Order{userWos.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`text-xs ${muted}`}>No team members assigned yet.</div>
                )}
              </div>

              {/* Active Blockers */}
              <div className={`rounded-2xl border p-4 sm:p-5 ${panel}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className={`text-sm font-bold ${heading}`}>Active Blockers</h2>
                  <span className="text-xs font-semibold text-amber-500">
                    {selected.blockers.length} Open
                  </span>
                </div>
                {selected.blockers.length > 0 ? (
                  <div className="space-y-2">
                    {selected.blockers.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs"
                      >
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-red-300">{b.description}</div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-red-400/80">
                            <span>Raised by {usersById[b.developerId]?.name || 'Developer'}</span>
                            <span>·</span>
                            <span>{b.dateRaised}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500/70 mb-1" />
                    <span className="text-xs font-semibold text-emerald-400">Zero active blockers</span>
                    <span className={`text-[11px] ${muted}`}>Work is progressing smoothly without bottlenecks.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: PTDs */}
        {projectTab === 'ptds' && (
          <div className="mt-4 animate-fade-in">
            <div className={`overflow-x-auto rounded-2xl border ${panel}`}>
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className={`border-b text-xs uppercase tracking-wider ${muted}`}>
                    <th className="px-4 py-3 font-medium">PTD Details</th>
                    <th className="px-4 py-3 font-medium">Estimated & Used</th>
                    <th className="px-4 py-3 font-medium">Progress</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.ptds.map((p) => (
                    <tr
                      key={p.id}
                      className={`border-b last:border-0 ${
                        dark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className={`font-semibold ${heading}`}>
                          <span className="text-violet-500 font-mono">{p.ref}</span> · {p.name}
                        </div>
                        <div className={`mt-0.5 max-w-[300px] truncate text-xs ${muted}`}>
                          {p.description || '—'}
                        </div>
                      </td>
                      <td className={`px-4 py-3 tabular-nums text-xs ${muted}`}>
                        est <span className={`font-semibold ${heading}`}>{p.estimatedHours}h</span> · alloc{' '}
                        {p.allocatedHours}h · used {p.usedHours}h
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-1.5 w-16 overflow-hidden rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                            <div
                              className="h-full rounded-full bg-violet-500"
                              style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }}
                            />
                          </div>
                          <span className={`text-xs tabular-nums font-semibold ${muted}`}>{p.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PtdStatusBadge status={p.status} />
                      </td>
                      <td className={`px-4 py-3 text-xs tabular-nums ${muted}`}>{p.deadline || '—'}</td>
                    </tr>
                  ))}
                  {selected.ptds.length === 0 && (
                    <tr>
                      <td colSpan={5} className={`px-4 py-10 text-center text-sm ${muted}`}>
                        No PTDs attached to this project yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: WORK ORDERS */}
        {projectTab === 'workorders' && (
          <div className="mt-4 animate-fade-in">
            <div className={`overflow-x-auto rounded-2xl border ${panel}`}>
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className={`border-b text-xs uppercase tracking-wider ${muted}`}>
                    <th className="px-4 py-3 font-medium">Work Order</th>
                    <th className="px-4 py-3 font-medium">Assignee</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Hours</th>
                    <th className="px-4 py-3 font-medium">Due Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.workOrders.map((w) => (
                    <tr
                      key={w.id}
                      className={`border-b last:border-0 ${
                        dark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className={`font-semibold ${heading}`}>{w.title}</div>
                        <div className={`mt-0.5 max-w-[280px] truncate text-xs ${muted}`}>
                          {w.description || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ${
                              dark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-800'
                            }`}
                          >
                            {initials(usersById[w.assignee]?.name || '?')}
                          </span>
                          <span className={`text-xs ${muted}`}>
                            {usersById[w.assignee]?.name || 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={w.priority} />
                      </td>
                      <td className={`px-4 py-3 text-xs tabular-nums ${muted}`}>
                        est <span className={`font-semibold ${heading}`}>{w.estimatedHours}h</span> · actual{' '}
                        {w.actualHours}h
                      </td>
                      <td className={`px-4 py-3 text-xs tabular-nums ${muted}`}>{w.dueDate || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-400 border border-violet-500/20">
                          {w.status.replace('-', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {selected.workOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className={`px-4 py-10 text-center text-sm ${muted}`}>
                        No work orders created for this project yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: ACTIVITY */}
        {projectTab === 'activity' && (
          <div className="mt-4 animate-fade-in">
            <div className={`rounded-2xl border p-4 sm:p-5 ${panel}`}>
              <h2 className={`mb-3 text-sm font-bold ${heading}`}>Project Audit Trail</h2>
              {projectActivities.length > 0 ? (
                <div className="space-y-3">
                  {projectActivities.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 text-xs">
                      <span className={`mt-0.5 text-[11px] tabular-nums ${muted}`}>{a.time}</span>
                      <div className="min-w-0">
                        <span className={`font-semibold ${heading}`}>{a.actor}</span>{' '}
                        <span className={muted}>{a.text}</span>
                        <div className={`mt-0.5 text-[10px] ${muted}`}>{a.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`py-8 text-center text-xs ${muted}`}>No activity recorded for this project yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN PROJECTS DIRECTORY VIEW
  // ----------------------------------------------------
  const kpiData = [
    { label: 'Total projects', value: stats.total, icon: Briefcase, num: 'text-violet-500', iconCls: 'text-zinc-500' },
    { label: 'Active', value: stats.active, icon: Play, num: 'text-violet-400', iconCls: 'text-violet-400' },
    { label: 'At risk', value: stats.atRisk, icon: AlertTriangle, num: 'text-amber-500', iconCls: 'text-amber-400' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, num: heading, iconCls: 'text-emerald-500' },
  ];

  return (
    <div className="relative mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 flex justify-center overflow-hidden">
        <div className="h-64 w-[60rem] max-w-full rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      {/* Top Executive KPI Band */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 md:p-5 transition-all ${
          dark
            ? 'border-zinc-800 bg-gradient-to-br from-violet-500/15 via-zinc-900 to-zinc-900 shadow-sm'
            : 'border-zinc-200 bg-gradient-to-br from-violet-500/10 via-white to-white shadow-sm'
        }`}
      >
        {/* Header & Delivery Stats */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-lg font-bold sm:text-xl ${heading}`}>Projects Directory</h1>
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-400 border border-violet-500/20">
                {stats.total} Total
              </span>
            </div>
            <p className={`hidden text-xs sm:block ${muted}`}>
              Centralized project execution, team capacity & milestone tracking.
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 text-right">
            <div>
              <div className={`text-[10px] sm:text-[11px] uppercase tracking-wider ${muted}`}>Avg delivery</div>
              <div className="text-sm font-bold tabular-nums text-violet-500 sm:text-lg">{avgProgress}%</div>
            </div>
            <div className={`h-5 w-px shrink-0 ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
            <div>
              <div className={`text-[10px] sm:text-[11px] uppercase tracking-wider ${muted}`}>Committed</div>
              <div className={`text-sm font-bold tabular-nums sm:text-lg ${heading}`}>{totalEst}h</div>
            </div>
          </div>
        </div>

        {/* KPI metrics bar */}
        <div
          className={`mt-3 pt-3 sm:mt-3.5 sm:pt-3.5 border-t grid grid-cols-4 gap-1.5 sm:flex sm:flex-row sm:divide-x sm:gap-0 ${
            dark ? 'border-zinc-800/80 sm:divide-zinc-800' : 'border-zinc-200/80 sm:divide-zinc-200'
          }`}
        >
          {kpiData.map((k) => (
            <div
              key={k.label}
              className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left sm:flex-1 sm:px-4 py-0.5"
            >
              <div className="min-w-0">
                <div className={`text-[10px] sm:text-[11px] uppercase tracking-wider truncate ${muted}`}>{k.label}</div>
                <div className={`mt-0.5 text-base sm:text-xl font-bold tabular-nums ${k.num}`}>
                  {k.value}
                </div>
              </div>
              <k.icon className={`hidden sm:block h-4 w-4 shrink-0 opacity-80 ${k.iconCls}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Control Bar: Search, Filters, Sort, View Mode & New Project */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects by name or client..."
            className={`pl-10 ${inputCls(dark)}`}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter pills */}
          <div className={`flex rounded-xl border p-0.5 ${cardBorder}`}>
            {['all', 'active', 'on-hold', 'delayed', 'completed', 'not-started'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                  filter === s
                    ? 'bg-violet-500 text-white shadow-xs'
                    : dark
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {s === 'all' ? 'All' : PROJECT_STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer ${
              dark
                ? 'border-zinc-800 bg-zinc-900 text-zinc-300'
                : 'border-zinc-300 bg-white text-zinc-700'
            }`}
          >
            <option value="urgency">Sort: Urgency & Deadlines</option>
            <option value="progress">Sort: Delivery Progress</option>
            <option value="hours">Sort: Estimated Hours</option>
            <option value="name">Sort: Project Name</option>
          </select>

          {/* Grid / Table toggle */}
          <div className={`flex rounded-xl border p-0.5 ${cardBorder}`}>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`rounded-lg p-1.5 cursor-pointer transition-all ${
                viewMode === 'grid'
                  ? 'bg-violet-500 text-white shadow-xs'
                  : dark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Table View"
              className={`rounded-lg p-1.5 cursor-pointer transition-all ${
                viewMode === 'table'
                  ? 'bg-violet-500 text-white shadow-xs'
                  : dark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* "+ New Project" Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-violet-500/20 hover:bg-violet-500 active:scale-95 cursor-pointer transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Needs Attention Banner */}
      {attention.length > 0 && (
        <section className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h2 className={`text-xs font-bold uppercase tracking-wider ${heading}`}>
              Needs Immediate Attention ({attention.length})
            </h2>
          </div>
          <div className="space-y-1.5">
            {attention.map((p) => {
              const left = daysLeft(p);
              const hasBlocker = p.blockers.length > 0;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p.id)}
                  className={`group flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-left transition-all cursor-pointer hover:border-violet-500/40 hover:scale-[1.005] ${
                    dark ? 'border-zinc-800/80 bg-zinc-900/60' : 'border-zinc-200/80 bg-white/90'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        p.health === 'overdue' ? 'bg-red-500 animate-ping' : 'bg-amber-500'
                      }`}
                    />
                    <span className={`truncate text-xs font-semibold ${heading}`}>{p.name}</span>
                    <span className={`hidden text-[11px] sm:inline ${muted}`}>({p.client})</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {hasBlocker && (
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                        {p.blockers.length} Blocker{p.blockers.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        p.health === 'overdue' ? 'text-red-400' : 'text-amber-400'
                      }`}
                    >
                      {p.health === 'overdue'
                        ? `Overdue by ${-left}d`
                        : `${left}d left · ${p.progress}% done`}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-violet-500 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Content: GRID VIEW */}
      {viewMode === 'grid' ? (
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const left = daysLeft(p);
            const healthColor = HEALTH_COLORS[p.health] || HEALTH_COLORS['on-track'];
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className={`group relative flex flex-col rounded-2xl border p-4 text-left transition-all cursor-pointer hover:-translate-y-1 hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10 ${panel}`}
              >
                {/* Top Health Indicator Line */}
                <span
                  className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl ${
                    HEALTH_ACCENT[p.health] || HEALTH_ACCENT['on-track']
                  }`}
                />

                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-sm font-bold text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className={`truncate text-sm font-bold ${heading}`}>{p.name}</div>
                      <div className={`truncate text-xs font-medium text-violet-400`}>{p.client}</div>
                    </div>
                  </div>

                  {/* Circular Progress Ring */}
                  <div className="relative h-12 w-12 shrink-0">
                    <ProgressRing value={p.progress} color={healthColor} dark={dark} size={48} />
                    <span
                      className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums"
                      style={{ color: healthColor }}
                    >
                      {p.progress}%
                    </span>
                  </div>
                </div>

                {/* Status & Priority Badges */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <StatusChip status={p.status} />
                  <PriorityBadge priority={p.priority} />
                  {p.status !== 'completed' && p.status !== 'delayed' && (
                    <HealthBadge health={p.health} />
                  )}
                  {p.blockers.length > 0 && (
                    <span className="flex items-center gap-1 rounded-md bg-red-500/15 border border-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                      <AlertTriangle className="h-3 w-3" />
                      {p.blockers.length} Blocker
                    </span>
                  )}
                </div>

                {/* Hours Burn & Delivery Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className={muted}>Hours: {p.usedHours}h / {p.estHours}h</span>
                    <span className={`font-semibold tabular-nums ${p.burnPct > 90 ? 'text-amber-400' : muted}`}>
                      {p.burnPct}% burned
                    </span>
                  </div>
                  <div className={`h-1.5 w-full overflow-hidden rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.burnPct > 100 ? 'bg-red-500' : p.burnPct > 80 ? 'bg-amber-500' : 'bg-violet-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, p.burnPct))}%` }}
                    />
                  </div>
                </div>

                {/* Meta Counts: PTDs & WOs */}
                <div className={`mt-3 flex items-center justify-between text-xs ${muted}`}>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-zinc-500/10 px-1.5 py-0.5 text-[11px]">
                      {p.ptds.length} PTD{p.ptds.length !== 1 ? 's' : ''}
                    </span>
                    <span className="rounded bg-zinc-500/10 px-1.5 py-0.5 text-[11px]">
                      {p.workOrders.length} WO{p.workOrders.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className={`text-[11px] font-medium ${left !== null && left < 0 ? 'text-red-400 font-bold' : ''}`}>
                    {left === null
                      ? 'No deadline'
                      : left < 0
                        ? `${-left}d overdue`
                        : `${left}d remaining`}
                  </span>
                </div>

                {/* Card Footer: Team avatars + Open Project */}
                <div
                  className={`mt-3 pt-2.5 border-t flex items-center justify-between ${
                    dark ? 'border-zinc-800/80' : 'border-zinc-200/80'
                  }`}
                >
                  {memberStack(p.teamMembers)}
                  <span className="flex items-center gap-1 text-xs font-semibold text-violet-400 group-hover:text-violet-300">
                    Open Workspace <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Main Content: TABLE VIEW */
        <div className={`mt-4 overflow-x-auto rounded-2xl border ${panel}`}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className={`border-b text-xs uppercase tracking-wider ${muted}`}>
                <th className="px-4 py-3 font-medium">Project & Client</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Delivery Progress</th>
                <th className="px-4 py-3 font-medium">Hours (Used / Est)</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Status & Health</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const left = daysLeft(p);
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedProject(p.id)}
                    className={`border-b last:border-0 cursor-pointer transition-colors ${
                      dark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className={`font-bold ${heading}`}>{p.name}</div>
                      <div className="text-xs text-violet-400">{p.client}</div>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={p.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-16 overflow-hidden rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }}
                          />
                        </div>
                        <span className={`text-xs tabular-nums font-bold ${heading}`}>{p.progress}%</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-xs tabular-nums ${muted}`}>
                      <span className={`font-semibold ${heading}`}>{p.usedHours}h</span> / {p.estHours}h
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      <div className={heading}>{p.dueDate || '—'}</div>
                      <div className={`text-[10px] ${left !== null && left < 0 ? 'text-red-400 font-bold' : muted}`}>
                        {left === null ? '' : left < 0 ? `${-left}d overdue` : `${left}d remaining`}
                      </div>
                    </td>
                    <td className="px-4 py-3">{memberStack(p.teamMembers)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusChip status={p.status} />
                        {p.status !== 'completed' && p.status !== 'delayed' && (
                          <HealthBadge health={p.health} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
        <div className={`mt-6 rounded-2xl border py-12 text-center text-sm ${panel} ${muted}`}>
          No projects match the selected criteria.
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* NEW PROJECT MODAL */}
      {/* ---------------------------------------------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-fade-in">
          <div
            className={`w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl transition-all ${
              dark ? 'border-zinc-800 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold">Create New Project</h3>
                <p className={`text-xs ${muted}`}>Set up a new project engagement and assign initial team members.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`rounded-lg p-1.5 cursor-pointer ${
                  dark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${muted}`}>
                  Project Name *
                </label>
                <input
                  required
                  placeholder="e.g. Mobile Banking App v2"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className={inputCls(dark)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${muted}`}>
                    Client Name *
                  </label>
                  <input
                    required
                    placeholder="e.g. Zenith Bank"
                    value={newProject.client}
                    onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                    className={inputCls(dark)}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${muted}`}>
                    Priority
                  </label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                    className={inputCls(dark)}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${muted}`}>
                    Target Due Date
                  </label>
                  <input
                    type="date"
                    value={newProject.dueDate}
                    onChange={(e) => setNewProject({ ...newProject, dueDate: e.target.value })}
                    className={inputCls(dark)}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${muted}`}>
                    Initial Status
                  </label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                    className={inputCls(dark)}
                  >
                    <option value="active">Active</option>
                    <option value="not-started">Not Started</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${muted}`}>
                  Assign Team Members
                </label>
                <div className="flex flex-wrap gap-2">
                  {developers.map((dev) => {
                    const isSelected = newProject.team.includes(dev.id);
                    return (
                      <button
                        type="button"
                        key={dev.id}
                        onClick={() => toggleTeamMember(dev.id)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                          isSelected
                            ? 'border-violet-500 bg-violet-500 text-white shadow-xs'
                            : dark
                              ? 'border-zinc-800 bg-zinc-800 text-zinc-300 hover:border-zinc-700'
                              : 'border-zinc-200 bg-zinc-100 text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        {dev.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${muted}`}>
                  Description & Objectives
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline key goals, deliverables, and scope..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className={inputCls(dark)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer ${
                    dark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500 cursor-pointer shadow-md shadow-violet-500/20"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}