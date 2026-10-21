import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Bug,
  CheckCheck,
  Clock,
  RefreshCcw,
  Search,
  Send,
  ThumbsUp,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../../data/context.js';
import { isNotificationForUser } from '../../data/notificationUtils.js';

const TYPE_META = {
  assignment: { label: 'New assignment', icon: UserPlus, accent: 'text-violet-500', box: 'bg-violet-500/15 border-violet-500/25' },
  review: { label: 'Awaiting review', icon: Send, accent: 'text-sky-500', box: 'bg-sky-500/15 border-sky-500/25' },
  approval: { label: 'Approved', icon: ThumbsUp, accent: 'text-emerald-500', box: 'bg-emerald-500/15 border-emerald-500/25' },
  changes: { label: 'Changes requested', icon: RefreshCcw, accent: 'text-amber-500', box: 'bg-amber-500/15 border-amber-500/25' },
  hours: { label: 'Hours logged', icon: Clock, accent: 'text-cyan-500', box: 'bg-cyan-500/15 border-cyan-500/25' },
  issue: { label: 'Issue update', icon: Bug, accent: 'text-rose-500', box: 'bg-rose-500/15 border-rose-500/25' },
  report: { label: 'Report entry', icon: BarChart3, accent: 'text-violet-500', box: 'bg-violet-500/15 border-violet-500/25' },
  status: { label: 'Status update', icon: Activity, accent: 'text-zinc-500', box: 'bg-zinc-500/15 border-zinc-500/25' },
};

const TYPE_DEFAULT = TYPE_META.status;

function fmtGroupLabel(date) {
  if (!date) return 'Unknown';
  const t = new Date(`${date}T00:00:00`);
  const today = new Date();
  const tStr = t.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  if (tStr === todayStr) return 'Today';
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (tStr === yest.toISOString().slice(0, 10)) return 'Yesterday';
  return date;
}

export default function DevNotifications({ dark }) {
  const { currentUser, db, markNotificationRead, markAllNotificationsRead } = useApp();

  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');

  const projectsById = useMemo(
    () => Object.fromEntries((db.projects || []).map((p) => [p.id, p])),
    [db.projects],
  );

  const notifications = useMemo(() => {
    const all = (db.notifications || []).slice();
    const relevant = all.filter((n) => isNotificationForUser(n, currentUser, db));
    return relevant.sort((a, b) => `${b.date || ''}${b.time || ''}`.localeCompare(`${a.date || ''}${a.time || ''}`));
  }, [db.notifications, db.workOrders, db.issues, db.developers, db.users, currentUser]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((n) => {
      if (tab === 'unread' && n.read) return false;
      if (q && !n.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [notifications, tab, query]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      markAllNotificationsRead(unreadIds);
    }
  };

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((n) => {
      const key = fmtGroupLabel(n.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(n);
    });
    return [...map.entries()];
  }, [filtered]);

  const panel = dark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-white/80';
  const heading = dark ? 'text-zinc-200' : 'text-zinc-800';
  const muted = dark ? 'text-zinc-500' : 'text-zinc-500';
  const border = dark ? 'border-zinc-800' : 'border-zinc-200';
  const rowHover = dark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50';
  const inputBg = dark
    ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500 focus:border-violet-500'
    : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400 focus:border-violet-500';

  const renderRow = (n) => {
    const project = projectsById[n.projectId];
    const meta = TYPE_META[n.type] || TYPE_DEFAULT;
    const Icon = meta.icon;
    const unread = !n.read;

    return (
      <button
        key={n.id}
        onClick={() => markNotificationRead(n.id)}
        title={unread ? 'Click to mark as read' : ''}
        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer ${rowHover} ${
          unread ? 'border-violet-500/40' : border
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.box} ${
            dark ? 'text-zinc-100' : 'text-zinc-800'
          }`}
        >
          <Icon className={`h-4 w-4 ${meta.accent}`} />
        </span>

        <div className="min-w-0 flex-1">
          <span className={`block text-xs leading-snug ${unread ? `font-semibold ${heading}` : muted}`}>{n.title}</span>
          <div className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] ${muted}`}>
            {n.actor && <span className="font-semibold">{n.actor}</span>}
            {project && (
              <span className="rounded bg-zinc-500/10 px-1.5 py-0.5 font-semibold">{project.name}</span>
            )}
            <span className="flex items-center gap-1">
              <Icon className={`h-3 w-3 ${meta.accent}`} />
              {meta.label}
            </span>
            {n.workOrderId && (
              <span className="rounded bg-violet-500/10 px-1.5 py-0.5 font-mono font-bold text-violet-400">
                {n.workOrderId}
              </span>
            )}
            {n.issueId && (
              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono font-bold text-rose-400">
                {n.issueId}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {n.time && <span className={`text-[11px] font-bold tabular-nums ${unread ? heading : muted}`}>{n.time}</span>}
          {n.date && <span className={`text-[10px] tabular-nums ${muted}`}>{n.date}</span>}
          {unread && <span className="mt-0.5 h-2 w-2 rounded-full bg-violet-500" />}
        </div>
      </button>
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`}>Notifications</h1>
          <p className={`mt-1 text-xs ${muted}`}>
            {unreadCount > 0
              ? `${unreadCount} unread · assignments, reviews and issue updates from your projects`
              : 'You are all caught up.'}
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 disabled:opacity-40 disabled:hover:text-zinc-500 cursor-pointer"
        >
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </button>
      </div>

      <div className={`mb-4 flex flex-wrap items-center gap-2 rounded-2xl border p-3 ${panel}`}>
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notifications..."
            className={`w-full rounded-xl border pl-8 pr-2 py-1.5 text-xs outline-none transition-all ${inputBg}`}
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-zinc-500/10 p-1">
          {[
            { id: 'all', label: `All (${notifications.length})` },
            { id: 'unread', label: `Unread (${unreadCount})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                tab === t.id
                  ? dark
                    ? 'bg-zinc-200 text-zinc-900'
                    : 'bg-zinc-900 text-white'
                  : dark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl border p-4 sm:p-5 ${panel}`}>
        {groups.length > 0 ? (
          groups.map(([label, items]) => (
            <div key={label}>
              <div className={`flex items-center gap-2 px-1 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>
                {label}
                <span className={`h-px flex-1 ${border}`} />
              </div>
              <div className="mb-3 space-y-2">
                {items.map((n) => renderRow(n))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center">
            <Bell className={`mx-auto h-10 w-10 ${muted}`} />
            <p className={`mt-3 text-sm font-semibold ${heading}`}>No notifications</p>
            <p className={`mt-1 text-xs ${muted}`}>
              {tab === 'unread' ? 'You have no unread notifications.' : 'System events will appear here as a read-only log.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}