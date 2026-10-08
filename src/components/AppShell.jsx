import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Power, Bell, RotateCcw } from 'lucide-react';
import PMDock from './PMDock.jsx';
import DevDock from './DevDock.jsx';
import { appsForRole } from '../data/dockConfig.js';
import { useApp } from '../data/context.js';
// PM views
import PMDashboard from '../pm/Dashboard.jsx';
import Projects from '../pm/Projects.jsx';
import PTDApp from '../pm/PTDApp.jsx';
import PMWorkOrders from '../pm/workorders/WorkOrders.jsx';
import PMFiles from '../pm/files/Files.jsx';
import PMIssues from '../pm/issues/Issues.jsx';
import PMCalendar from '../pm/calendar/Calendar.jsx';
import PMReports from '../pm/reports/Reports.jsx';
import PMNotifications from '../pm/notifications/Notifications.jsx';
import PMChat from '../pm/chat/Chat.jsx';

// Dev views
import DevDashboard from '../dev/dashboard/DevDashboard.jsx';
import DevWorkOrders from '../dev/workorders/DevWorkOrders.jsx';
import DevFiles from '../dev/files/DevFiles.jsx';
import DevIssues from '../dev/issues/DevIssues.jsx';
import DevCalendar from '../dev/calendar/DevCalendar.jsx';
import DevNotifications from '../dev/notifications/DevNotifications.jsx';
import DevChat from '../dev/chat/DevChat.jsx';
import DevReports from '../dev/reports/DevReports.jsx';

import Placeholder from '../views/Placeholder.jsx';

const THEME_KEY = 'project-soft:theme';

function getClock() {
  return new Date().toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark';
  } catch {
    return false;
  }
}

const ROLE_LABELS = { pm: 'Project Manager', dev: 'Developer', admin: 'Administrator' };

export default function AppShell({ initialApp = 'dashboard' }) {
  const navigate = useNavigate();
  const { currentUser, db, logout, resetDb } = useApp();

  const [dark, setDark] = useState(readTheme);
  const [activeApp] = useState(initialApp);
  const [showApps, setShowApps] = useState(false);
  const [navCount, setNavCount] = useState(0);
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => getClock());

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
      document.body.style.backgroundColor = dark ? '#18181b' : '#f4f4f5';
    } catch {
      // ignore
    }
  }, [dark]);

  useEffect(() => {
    const id = setInterval(() => setNow(getClock()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!showApps) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowApps(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showApps]);

  const role = currentUser?.role || 'pm';
  const apps = appsForRole(role);
  const RoleDock = role === 'dev' ? DevDock : PMDock;
  const active = apps.find((a) => a.id === activeApp) || apps[0];
  const filtered = apps.filter((app) =>
    app.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const unread = (db.notifications || []).filter((n) => !n.read).length;
  const chatUnread = (db.messages || []).filter((m) => m.to === currentUser?.id && !m.read).length;

  const renderView = () => {
    if (activeApp === 'dashboard') {
      return role === 'dev' ? <DevDashboard key={navCount} dark={dark} /> : <PMDashboard key={navCount} dark={dark} />;
    }
    if (activeApp === 'ptds' && role !== 'dev') {
      return <PTDApp key={navCount} dark={dark} />;
    }
    if (activeApp === 'projects' && role !== 'dev') {
      return <Projects key={navCount} dark={dark} />;
    }
    if (activeApp === 'workorders') {
      return role === 'dev' ? (
        <DevWorkOrders key={navCount} dark={dark} />
      ) : (
        <PMWorkOrders key={navCount} dark={dark} />
      );
    }
    if (activeApp === 'files') {
      return role === 'dev' ? <DevFiles key={navCount} dark={dark} /> : <PMFiles key={navCount} dark={dark} />;
    }
    if (activeApp === 'issues') {
      return role === 'dev' ? <DevIssues key={navCount} dark={dark} /> : <PMIssues key={navCount} dark={dark} />;
    }
    if (activeApp === 'calendar') {
      return role === 'dev' ? <DevCalendar key={navCount} dark={dark} /> : <PMCalendar key={navCount} dark={dark} />;
    }
    if (activeApp === 'reports') {
      return role === 'dev' ? <DevReports key={navCount} dark={dark} /> : <PMReports key={navCount} dark={dark} />;
    }
    if (activeApp === 'notifications') {
      return role === 'dev' ? <DevNotifications key={navCount} dark={dark} /> : <PMNotifications key={navCount} dark={dark} />;
    }
    if (activeApp === 'chat') {
      return role === 'dev' ? <DevChat key={navCount} dark={dark} /> : <PMChat key={navCount} dark={dark} />;
    }
    return <Placeholder title={active.name} icon={active.icon} dark={dark} key={active.id} />;
  };

  const panelOn = dark ? 'bg-zinc-950/70 text-zinc-200' : 'bg-white/70 text-zinc-700';
  const panelBorder = dark ? 'border-zinc-800' : 'border-zinc-200';
  const contentOn = dark ? 'text-zinc-400' : 'text-zinc-500';

  const selectApp = (id) => {
    setNavCount((c) => c + 1);
    navigate(`/${role}/apps/${id}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      className={`relative flex h-full w-full max-w-full flex-col font-sans overflow-x-hidden transition-colors duration-300 ${
        dark ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-100 text-zinc-800'
      }`}
    >
      {/* Top panel */}
      <header
        className={`flex items-center justify-between border-b px-3 sm:px-4 py-2 backdrop-blur-md transition-colors ${panelOn} ${panelBorder} shrink-0`}
      >
        <div className="flex items-center gap-2 sm:gap-3 text-sm shrink-0">
          <span className="font-semibold text-violet-500 whitespace-nowrap">Project Soft</span>
          <span className={`hidden md:inline text-xs ${contentOn}`}>Programser International</span>
        </div>
        <div className="hidden sm:block text-xs tabular-nums text-center px-2 truncate">{now}</div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setDark((d) => !d)}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`rounded-md p-1.5 transition-colors cursor-pointer ${
              dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'
            }`}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="flex flex-col items-end leading-tight max-w-[85px] sm:max-w-none">
            <span className={`text-xs font-medium truncate ${contentOn}`}>{currentUser?.name}</span>
            <span className={`hidden sm:inline text-[10px] ${contentOn}`}>{ROLE_LABELS[role] || role}</span>
          </div>
          <button
            onClick={() => navigate(`/${role}/apps/notifications`)}
            title="Notifications"
            className={`relative rounded-md p-1.5 transition-colors cursor-pointer ${
              dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'
            }`}
          >
            {unread + chatUnread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                {unread + chatUnread}
              </span>
            )}
            <Bell className="h-4 w-4" />
          </button>
          <button
            onClick={resetDb}
            title="Reset data to seed"
            className={`rounded-md p-1.5 transition-colors cursor-pointer ${
              dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleLogout}
            title="Log out"
            className={`rounded-md p-1.5 transition-colors cursor-pointer ${
              dark ? 'hover:bg-zinc-800 hover:text-red-400' : 'hover:bg-zinc-200 hover:text-red-500'
            }`}
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Workspace content */}
      <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden min-w-0">{renderView()}</main>

      {/* Bottom dock */}
      <div className="flex w-full max-w-full min-w-0 items-end justify-center px-2 pb-2 pt-0.5 shrink-0">
        <RoleDock
          activeApp={activeApp}
          showApps={showApps}
          dark={dark}
          badges={{ chat: chatUnread }}
          onSelectApp={selectApp}
          onToggleApps={() => setShowApps((s) => !s)}
        />
      </div>

      {/* Show applications overlay */}
      {showApps && (
        <div
          className={`absolute inset-0 z-20 flex flex-col overflow-y-auto p-6 backdrop-blur-2xl transition-colors ${
            dark ? 'bg-zinc-950/80 text-zinc-200' : 'bg-zinc-100/80 text-zinc-800'
          }`}
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Applications</span>
              <button
                onClick={() => setShowApps(false)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  dark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-200 hover:bg-zinc-300'
                }`}
              >
                Close [Esc]
              </button>
            </div>

            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setShowApps(false);
              }}
              placeholder="Search applications..."
              className={`rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors ${
                dark
                  ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500 focus:border-violet-500'
                  : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400 focus:border-violet-500'
              }`}
            />

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {filtered.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setShowApps(false);
                    selectApp(app.id);
                  }}
                  className={`flex flex-col items-center gap-3 rounded-xl border p-6 transition-all cursor-pointer hover:scale-[1.03] ${
                    dark
                      ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-violet-500/50'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50 hover:border-violet-500/50'
                  }`}
                >
                  <app.icon className="h-8 w-8 text-violet-500" />
                  <span className="text-xs font-medium">{app.name}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <span className={`col-span-full py-8 text-center text-sm ${contentOn}`}>
                  No applications match "{query}"
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}