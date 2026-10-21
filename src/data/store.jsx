import { useEffect, useState } from 'react';
import { AppContext } from './context';
import { createSeed } from './seed';

const DB_KEY = 'project-soft:db';
const SESSION_KEY = 'project-soft:session';
const SEED_VERSION = 31;

function readKey(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeKey(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — ignore
  }
}

function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function makeNotification(type, title, opts = {}) {
  return {
    id: uid('n'),
    type,
    title,
    actor: opts.actor || '',
    date: opts.date || '',
    time: opts.time || '',
    projectId: opts.projectId || null,
    workOrderId: opts.workOrderId || null,
    issueId: opts.issueId || null,
    read: false,
  };
}

let _woCounter = 0;
function nextWoId(existingWorkOrders) {
  if (_woCounter === 0 && existingWorkOrders?.length) {
    const nums = existingWorkOrders
      .map((w) => {
        const m = w.id.match(/WORK-(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(Boolean);
    _woCounter = nums.length ? Math.max(...nums) : 1000;
  }
  if (_woCounter === 0) _woCounter = 1000;
  _woCounter++;
  return `WORK-${_woCounter}`;
}

function loadDb() {
  const persisted = readKey(DB_KEY) || readKey('system-soft:db');
  if (persisted && persisted._seedVersion === SEED_VERSION) return persisted;
  if (persisted && persisted._seedVersion !== SEED_VERSION) {
    console.warn(
      `[project-soft] Seed data updated (version ${persisted._seedVersion} -> ${SEED_VERSION}); stored db was reset to the new seed.`,
    );
  }
  return createSeed();
}

export function AppProvider({ children }) {
  const [db, setDb] = useState(loadDb);
  const [currentUser, setCurrentUser] = useState(() => readKey(SESSION_KEY));

  // Persist db to localStorage whenever it changes
  useEffect(() => {
    writeKey(DB_KEY, db);
  }, [db]);


  const login = async (username, password) => {
    const trimmedUser = (username || '').trim();
    const coreUrl = (import.meta.env.VITE_CORE_API_URL || '').replace(/\/$/, '');

    let coreError = null;
    try {
      const response = await fetch(`${coreUrl}/api/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedUser,
          password: password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const coreUser = data.user || {};
        const enabledApps = coreUser.enabled_apps || [];
        const hasAccess = enabledApps.includes('project-soft') || coreUser.is_superuser;

        if (!hasAccess) {
          throw new Error('Your account does not have access to Project Soft. Contact your administrator.');
        }

        const grant = (coreUser.app_access || []).find((a) => a.app === 'project-soft');
        let roleName = (grant?.role || '').toLowerCase();
        if (!roleName && coreUser.is_superuser) {
          roleName = 'project manager';
        }

        const isPm = roleName.includes('manager') || roleName === 'pm';
        const role = isPm ? 'pm' : 'dev';
        const title = isPm ? 'Project Manager' : 'Developer';

        const user = {
          id: `core-${coreUser.id}`,
          core_id: coreUser.id,
          username: coreUser.email,
          name: coreUser.name || coreUser.email,
          email: coreUser.email,
          role,
          title,
          token: data.access,
          refresh: data.refresh,
        };

        setCurrentUser(user);
        writeKey(SESSION_KEY, user);

        setDb((prev) => {
          if (prev.users.some((u) => u.id === user.id || u.email === user.email)) {
            return prev;
          }
          return {
            ...prev,
            users: [...prev.users, user],
          };
        });

        return user;
      } else {
        const errJson = await response.json().catch(() => null);
        const raw = errJson?.detail ?? errJson?.non_field_errors ?? errJson?.message ?? errJson?.error ?? (errJson && typeof errJson === 'object' ? Object.values(errJson).flat() : '');
        const detail = Array.isArray(raw) ? raw.map((x) => (typeof x === 'string' ? x : x?.message || '')).filter(Boolean).join(' ') : (typeof raw === 'string' ? raw : '');
        if (detail && !detail.toLowerCase().includes('no active account')) {
          coreError = new Error(detail);
        }
      }
    } catch (err) {
      if (err.message && (err.message.includes('does not have access') || err.message.includes('Account is inactive'))) {
        throw err;
      }
      coreError = err;
    }

    // Fallback: check local demo users (e.g. admin, rahul)
    const localUser = db.users.find(
      (u) => u.username === trimmedUser.toLowerCase() && u.password === password,
    );
    if (localUser) {
      setCurrentUser(localUser);
      writeKey(SESSION_KEY, localUser);
      return localUser;
    }

    if (coreError && coreError.message && !coreError.message.includes('fetch') && !(coreError instanceof TypeError)) {
      throw coreError;
    }

    throw new Error('Invalid username or password');
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const resetDb = () => {
    setDb(createSeed());
  };

  const updatePtd = (id, patch) => {
    setDb((prev) => ({
      ...prev,
      ptds: prev.ptds.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const syncDecisionToAccounts = async (target, action, remark = '') => {
    const ptdId = target?.ptdId || target?.id;
    const orderId = target?.orderId;
    const accountsUrl = (import.meta.env.VITE_ACCOUNTS_API_URL || '').replace(/\/$/, '');
    try {
      await fetch('/api/ptds/decision/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ptdId,
          orderId,
          action,
          remark,
          decidedBy: currentUser?.name || 'Project Manager',
        }),
      });
      if (accountsUrl) {
        await fetch(`${accountsUrl}/api/ptda/external-decision/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ptdId,
            orderId,
            action,
            remark,
            decidedBy: currentUser?.name || 'Project Manager',
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[project-soft] Failed to sync decision to accounts soft:', err);
    }
  };

  // Sync assigned PTD requests from Project Soft backend / Account Soft
  useEffect(() => {
    const fetchIncomingFromAccounts = async () => {
      const accountsUrl = (import.meta.env.VITE_ACCOUNTS_API_URL || '').replace(/\/$/, '');
      try {
        let res = await fetch('/api/ptds/');
        if (!res.ok && accountsUrl) {
          res = await fetch(`${accountsUrl}/api/ptda/external-requests/`);
        }
        if (!res.ok) return;
        const incoming = await res.json();
        if (!Array.isArray(incoming)) return;

        setDb((prev) => {
          const existingMap = new Map((prev.ptds || []).map((p) => [p.id, p]));
          const merged = incoming.map((item) => {
            const existing = existingMap.get(item.id) || {};
            return {
              ...existing,
              ...item,
              projectId: item.projectId || item.orderId || existing.projectId || null,
            };
          });

          const prevPtds = prev.ptds || [];
          const isSame =
            prevPtds.length === merged.length &&
            merged.every((m, idx) => {
              const p = prevPtds[idx];
              return (
                p &&
                p.id === m.id &&
                p.status === m.status &&
                p.projectId === m.projectId &&
                p.rejectionRemark === m.rejectionRemark &&
                p.decisionStatus === m.decisionStatus
              );
            });

          if (isSame) return prev;
          return {
            ...prev,
            ptds: merged,
          };
        });
      } catch {
        // Soft error if offline
      }
    };

    fetchIncomingFromAccounts();
    const timer = setInterval(fetchIncomingFromAccounts, 4000);
    return () => clearInterval(timer);
  }, []);

  // Load and sync real projects from backend
  useEffect(() => {
    const fetchProjectsFromDb = async () => {
      try {
        const res = await fetch('/api/projects/');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setDb((prev) => {
            const prevProj = prev.projects || [];
            const isSame =
              prevProj.length === data.length &&
              data.every((d, i) => {
                const p = prevProj[i];
                return (
                  p &&
                  p.id === d.id &&
                  p.status === d.status &&
                  p.name === d.name &&
                  (p.team || []).length === (d.team || []).length
                );
              });
            if (isSame) return prev;
            return {
              ...prev,
              projects: data,
            };
          });
        }
      } catch (err) {
        console.warn('[project-soft] Failed to fetch projects from backend:', err);
      }
    };
    fetchProjectsFromDb();
    const timer = setInterval(fetchProjectsFromDb, 4000);
    return () => clearInterval(timer);
  }, []);

  // Load and sync work orders from MySQL backend
  useEffect(() => {
    const fetchWorkOrdersFromDb = async () => {
      try {
        const res = await fetch('/api/work-orders/');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setDb((prev) => {
            const prevWos = prev.workOrders || [];
            const isSame =
              prevWos.length === data.length &&
              data.every((d, i) => {
                const p = prevWos[i];
                return (
                  p &&
                  p.id === d.id &&
                  p.status === d.status &&
                  p.assignee === d.assignee &&
                  p.actualHours === d.actualHours &&
                  p.estimatedHours === d.estimatedHours &&
                  p.progress === d.progress &&
                  p.projectId === d.projectId &&
                  p.ptdId === d.ptdId &&
                  p.rejectionRemark === d.rejectionRemark
                );
              });
            if (isSame) return prev;
            return {
              ...prev,
              workOrders: data,
            };
          });
        }
      } catch (err) {
        console.warn('[project-soft] Failed to fetch work orders from MySQL:', err);
      }
    };
    fetchWorkOrdersFromDb();
    const timer = setInterval(fetchWorkOrdersFromDb, 4000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real developers from SystemSoft Core
  useEffect(() => {
    const fetchDevelopers = async () => {
      try {
        const res = await fetch('/api/developers/');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setDb((prev) => {
            const prevUsers = prev.users || [];
            const nonDevs = prevUsers.filter((u) => u.role !== 'dev');
            const prevDevs = prevUsers.filter((u) => u.role === 'dev');
            const isSame =
              prevDevs.length === data.length &&
              data.every((d, i) => {
                const p = prevDevs[i];
                return p && p.id === d.id && p.name === d.name && p.email === d.email && p.title === d.title;
              });
            if (isSame) return prev;
            return {
              ...prev,
              users: [...nonDevs, ...data],
            };
          });
        }
      } catch (err) {
        console.warn('[project-soft] Failed to fetch developers from SystemSoft Core:', err);
      }
    };
    fetchDevelopers();
    const timer = setInterval(fetchDevelopers, 10000);
    return () => clearInterval(timer);
  }, []);

  // Load and sync daily report entries from MySQL backend
  useEffect(() => {
    const fetchReportEntriesFromDb = async () => {
      try {
        const res = await fetch('/api/report-entries/');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setDb((prev) => {
            const prevEntries = prev.reportEntries || [];
            const isSame =
              prevEntries.length === data.length &&
              data.every((d, i) => {
                const p = prevEntries[i];
                return (
                  p &&
                  p.id === d.id &&
                  p.userId === d.userId &&
                  p.workOrderId === d.workOrderId &&
                  p.date === d.date &&
                  p.time === d.time &&
                  p.hours === d.hours &&
                  p.notes === d.notes
                );
              });
            if (isSame) return prev;
            return {
              ...prev,
              reportEntries: data,
            };
          });
        }
      } catch (err) {
        console.warn('[project-soft] Failed to fetch report entries from backend:', err);
      }
    };
    fetchReportEntriesFromDb();
    const timer = setInterval(fetchReportEntriesFromDb, 4000);
    return () => clearInterval(timer);
  }, []);

  const acceptPtd = (id) => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const target = (db.ptds || []).find((p) => p.id === id);
    if (target) {
      syncDecisionToAccounts(target, 'accept');
    }
    setDb((prev) => {
      const t = prev.ptds.find((p) => p.id === id);
      if (!t) return prev;
      return {
        ...prev,
        ptds: prev.ptds.map((p) =>
          p.id === id
            ? {
                ...p,
                status: 'not-started',
                acceptedDate: today,
                acceptedBy: currentUser?.name || 'Project Manager',
                rejectionRemark: undefined,
              }
            : p,
        ),
        notifications: [
          makeNotification(
            'approval',
            `PTD "${t.ref} · ${t.name}" was accepted by PM ${currentUser?.name || ''}`,
            {
              actor: currentUser?.name || 'Project Manager',
              date: today,
              time,
              projectId: t.projectId || null,
            },
          ),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'Project Manager',
            text: `accepted incoming PTD "${t.ref} · ${t.name}" from external system`,
            projectId: t.projectId || null,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const rejectPtd = (id, remark = '') => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const target = (db.ptds || []).find((p) => p.id === id);
    const cleanRemark = remark.trim() || 'No specific remark provided.';
    if (target) {
      syncDecisionToAccounts(target, 'reject', cleanRemark);
    }
    setDb((prev) => {
      const t = prev.ptds.find((p) => p.id === id);
      if (!t) return prev;
      return {
        ...prev,
        ptds: prev.ptds.map((p) =>
          p.id === id
            ? {
                ...p,
                status: 'rejected',
                rejectedDate: today,
                rejectedBy: currentUser?.name || 'Project Manager',
                rejectionRemark: cleanRemark,
              }
            : p,
        ),
        notifications: [
          makeNotification(
            'issue',
            `PTD "${t.ref} · ${t.name}" was rejected by PM (${cleanRemark})`,
            {
              actor: currentUser?.name || 'Project Manager',
              date: today,
              time,
              projectId: t.projectId || null,
            },
          ),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'Project Manager',
            text: `rejected incoming PTD "${t.ref} · ${t.name}" (Remark: ${cleanRemark})`,
            projectId: t.projectId || null,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const reopenPtdRequest = (id) => {
    const target = (db.ptds || []).find((p) => p.id === id);
    if (target) {
      syncDecisionToAccounts(target, 'reopen');
    }
    setDb((prev) => ({
      ...prev,
      ptds: prev.ptds.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'requested',
              rejectionRemark: undefined,
              rejectedDate: undefined,
              rejectedBy: undefined,
            }
          : p,
      ),
    }));
  };

  const createWorkOrders = async (ptdId, rows) => {
    const clean = rows.filter((r) => r.title && r.title.trim());
    if (!clean.length) return 0;
    const now = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const targetPtd = (db.ptds || []).find((p) => p.id === ptdId);
    const projectId = targetPtd?.projectId || targetPtd?.orderId || null;
    const newWorkOrders = clean.map((r) => ({
      id: nextWoId(db.workOrders),
      title: r.title.trim(),
      description: r.description?.trim() || '',
      projectId,
      ptdId,
      assignee: r.assignee || null,
      priority: r.priority || 'medium',
      startDate: r.startDate || now,
      dueDate: r.dueDate || '',
      estimatedHours: Number(r.estimatedHours) || 0,
      actualHours: 0,
      progress: 0,
      status: 'assigned',
      dependencies: [],
      comments: [],
      reviewHistory: [],
      files: [],
    }));

    try {
      const res = await fetch('/api/work-orders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorkOrders),
      });
      if (res.ok) {
        const saved = await res.json();
        const savedList = Array.isArray(saved) ? saved : [saved];
        savedList.forEach((sw, i) => {
          if (newWorkOrders[i]) {
            newWorkOrders[i].id = sw.id;
          }
        });
      }
    } catch (err) {
      console.warn('[project-soft] Failed to save work orders to MySQL:', err);
    }

    const totalHours = newWorkOrders.reduce((s, w) => s + w.estimatedHours, 0);
    setDb((prev) => {
      const allWos = [...prev.workOrders, ...newWorkOrders];
      const ptdWos = allWos.filter((w) => w.ptdId === ptdId);
      const calcProgress = ptdWos.length
        ? Math.round(ptdWos.reduce((s, w) => s + (Number(w.progress) || 0), 0) / ptdWos.length)
        : 0;

      return {
        ...prev,
        workOrders: allWos,
        ptds: prev.ptds.map((p) =>
          p.id === ptdId
            ? {
                ...p,
                allocatedHours: (p.allocatedHours || 0) + totalHours,
                progress: calcProgress,
                status: p.status === 'received' || p.status === 'not-started' ? 'in-progress' : p.status,
              }
            : p,
        ),
        notifications: [
          makeNotification('assignment', `${newWorkOrders.length} new work order${newWorkOrders.length > 1 ? 's' : ''} created in PTD "${(prev.ptds.find((p) => p.id === ptdId) || {}).name || ptdId}"`, {
            actor: currentUser?.name || 'Project Manager',
            date: now,
            time,
            projectId,
            workOrderId: newWorkOrders[0]?.id || null,
          }),
          ...(prev.notifications || []),
        ],
      };
    });
    return newWorkOrders.length;
  };

  const createSingleWorkOrder = async (data) => {
    const now = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const id = nextWoId(db.workOrders);
    const targetPtd = (db.ptds || []).find((p) => p.id === data.ptdId);
    const projectId = data.projectId || targetPtd?.projectId || targetPtd?.orderId || null;
    const newWo = {
      id,
      title: data.title?.trim() || 'Untitled Work Order',
      description: data.description?.trim() || '',
      projectId,
      ptdId: data.ptdId || null,
      assignee: data.assignee || 'u2',
      priority: data.priority || 'medium',
      startDate: data.startDate || now,
      dueDate: data.dueDate || '',
      estimatedHours: Number(data.estimatedHours) || 0,
      actualHours: 0,
      progress: 0,
      status: 'assigned',
      dependencies: data.dependencies || [],
      comments: [],
      reviewHistory: [],
      files: [],
    };

    try {
      const res = await fetch('/api/work-orders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWo),
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved && saved.id) newWo.id = saved.id;
      }
    } catch (err) {
      console.warn('[project-soft] Failed to save single work order to MySQL:', err);
    }

    setDb((prev) => {
      const allWos = [...prev.workOrders, newWo];
      const ptdWos = allWos.filter((w) => w.ptdId === newWo.ptdId);
      const calcProgress = ptdWos.length
        ? Math.round(ptdWos.reduce((s, w) => s + (Number(w.progress) || 0), 0) / ptdWos.length)
        : 0;

      const targetPtd = prev.ptds.find((p) => p.id === newWo.ptdId);
      const targetDev = prev.users.find((u) => u.id === newWo.assignee);

      return {
        ...prev,
        workOrders: allWos,
        ptds: newWo.ptdId
          ? prev.ptds.map((p) =>
              p.id === newWo.ptdId
                ? {
                    ...p,
                    allocatedHours: (p.allocatedHours || 0) + newWo.estimatedHours,
                    progress: calcProgress,
                    status: p.status === 'received' || p.status === 'not-started' ? 'in-progress' : p.status,
                  }
                : p,
            )
          : prev.ptds,
        notifications: [
          makeNotification(
            'assignment',
            `Work Order "${newWo.id} · ${newWo.title}" assigned to ${targetDev?.name || 'Developer'} in PTD "${targetPtd?.name || targetPtd?.ref || 'PTD'}"`,
            {
              actor: currentUser?.name || 'Project Manager',
              date: now,
              time,
              projectId: newWo.projectId,
              workOrderId: newWo.id,
            },
          ),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: now,
            time,
            actor: currentUser?.name || 'Project Manager',
            projectId: newWo.projectId,
            text: `assigned Work Order "${newWo.id} · ${newWo.title}" to ${targetDev?.name || 'Developer'}`,
          },
          ...(prev.activity || []),
        ],
      };
    });
    return newWo.id;
  };

  const acceptWorkOrder = (id) => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    fetch(`/api/work-orders/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'not-started',
        acceptedDate: today,
        acceptedBy: currentUser?.id,
      }),
    }).catch((err) => console.warn('[project-soft] Failed to accept work order in MySQL:', err));

    setDb((prev) => {
      const target = prev.workOrders.find((w) => w.id === id);
      if (!target) return prev;
      const project = prev.projects.find((p) => p.id === target.projectId);
      return {
        ...prev,
        workOrders: prev.workOrders.map((w) =>
          w.id === id
            ? {
                ...w,
                status: 'not-started',
                acceptedDate: today,
                acceptedBy: currentUser?.id,
                rejectionRemark: undefined,
                rejectedDate: undefined,
                rejectedBy: undefined,
              }
            : w,
        ),
        notifications: [
          makeNotification(
            'approval',
            `${currentUser?.name || 'Developer'} accepted Work Order "${target.id} · ${target.title}"${project ? ` in ${project.name}` : ''}`,
            {
              actor: currentUser?.name || 'Developer',
              date: today,
              time,
              projectId: target.projectId,
              workOrderId: target.id,
            },
          ),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'Developer',
            projectId: target.projectId,
            text: `accepted assigned Work Order "${target.id} · ${target.title}"`,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const rejectWorkOrder = (id, remark = '') => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const cleanRemark = remark.trim() || 'No specific remark provided.';
    fetch(`/api/work-orders/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'rejected',
        rejectedDate: today,
        rejectedBy: currentUser?.id,
        rejectionRemark: cleanRemark,
      }),
    }).catch((err) => console.warn('[project-soft] Failed to reject work order in MySQL:', err));

    setDb((prev) => {
      const target = prev.workOrders.find((w) => w.id === id);
      if (!target) return prev;
      return {
        ...prev,
        workOrders: prev.workOrders.map((w) =>
          w.id === id
            ? {
                ...w,
                status: 'rejected',
                rejectedDate: today,
                rejectedBy: currentUser?.id,
                rejectionRemark: cleanRemark,
              }
            : w,
        ),
        notifications: [
          makeNotification(
            'issue',
            `${currentUser?.name || 'Developer'} rejected Work Order "${target.id} · ${target.title}" (Remark: ${cleanRemark})`,
            {
              actor: currentUser?.name || 'Developer',
              date: today,
              time,
              projectId: target.projectId,
              workOrderId: target.id,
            },
          ),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'Developer',
            projectId: target.projectId,
            text: `rejected assigned Work Order "${target.id} · ${target.title}" (Remark: ${cleanRemark})`,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const reassignWorkOrder = (id, newAssigneeId) => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    fetch(`/api/work-orders/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignee: newAssigneeId,
        status: 'assigned',
      }),
    }).catch((err) => console.warn('[project-soft] Failed to reassign work order in MySQL:', err));

    setDb((prev) => {
      const target = prev.workOrders.find((w) => w.id === id);
      if (!target) return prev;
      const newDev = prev.users.find((u) => u.id === newAssigneeId);
      const project = prev.projects.find((p) => p.id === target.projectId);
      return {
        ...prev,
        workOrders: prev.workOrders.map((w) =>
          w.id === id
            ? {
                ...w,
                assignee: newAssigneeId,
                status: 'assigned',
                rejectionRemark: undefined,
                rejectedDate: undefined,
                rejectedBy: undefined,
              }
            : w,
        ),
        notifications: [
          makeNotification(
            'assignment',
            `Work Order "${target.id} · ${target.title}" reassigned to ${newDev?.name || 'Developer'}${project ? ` in ${project.name}` : ''}`,
            {
              actor: currentUser?.name || 'Project Manager',
              date: today,
              time,
              projectId: target.projectId,
              workOrderId: target.id,
            },
          ),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'Project Manager',
            projectId: target.projectId,
            text: `reassigned Work Order "${target.id} · ${target.title}" to ${newDev?.name || 'Developer'}`,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const updateWorkOrderStatus = async (id, status) => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const doneStatus = status === 'completed' || status === 'done';
    const autoProgress = doneStatus ? 100 : undefined;

    fetch(`/api/work-orders/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        ...(autoProgress !== undefined ? { progress: autoProgress } : {}),
      }),
    }).catch((err) => console.warn('[project-soft] Failed to update status in MySQL:', err));

    setDb((prev) => {
      const target = prev.workOrders.find((w) => w.id === id);
      if (!target) return prev;
      const project = prev.projects.find((p) => p.id === target.projectId);
      const targetProgress = doneStatus ? 100 : target.progress;
      const verb = doneStatus ? 'completed' : status === 'in-progress' ? 'started' : `set to ${status.replaceAll('-', ' ')}`;

      const workOrders = prev.workOrders.map((w) =>
        w.id === id ? { ...w, status, progress: targetProgress } : w,
      );
      const ptdWos = workOrders.filter((w) => w.ptdId === target.ptdId);
      const calcProgress = ptdWos.length
        ? Math.round(ptdWos.reduce((s, w) => s + (Number(w.progress) || 0), 0) / ptdWos.length)
        : 0;

      return {
        ...prev,
        workOrders,
        ptds: prev.ptds.map((p) =>
          p.id === target.ptdId
            ? {
                ...p,
                progress: calcProgress,
              }
            : p,
        ),
        notifications: [
          makeNotification('status', `${currentUser?.name || 'User'} ${verb} "${target.title}"${project ? ` in ${project.name}` : ''}`, {
            actor: currentUser?.name || 'User',
            date: today,
            time,
            projectId: target.projectId,
            workOrderId: target.id,
          }),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'User',
            projectId: target.projectId,
            text: `${currentUser?.name || 'User'} set "${target.title}" to ${status.replaceAll('-', ' ')}${
              project ? ` in ${project.name}` : ''
            }`,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const updateWorkOrder = async (id, patch) => {
    fetch(`/api/work-orders/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch((err) => console.warn('[project-soft] Failed to update work order in MySQL:', err));

    setDb((prev) => {
      const target = prev.workOrders.find((w) => w.id === id);
      if (!target) return prev;
      const workOrders = prev.workOrders.map((w) => (w.id === id ? { ...w, ...patch } : w));
      const ptdWos = workOrders.filter((w) => w.ptdId === target.ptdId);
      const calcProgress = ptdWos.length
        ? Math.round(ptdWos.reduce((s, w) => s + (Number(w.progress) || 0), 0) / ptdWos.length)
        : 0;

      return {
        ...prev,
        workOrders,
        ptds: prev.ptds.map((p) =>
          p.id === target.ptdId
            ? {
                ...p,
                allocatedHours: ptdWos.reduce((s, w) => s + (w.estimatedHours || 0), 0),
                usedHours: ptdWos.reduce((s, w) => s + (w.actualHours || 0), 0),
                progress: calcProgress,
              }
            : p,
        ),
      };
    });
  };

  const deleteWorkOrder = async (id) => {
    fetch(`/api/work-orders/${id}/`, {
      method: 'DELETE',
    }).catch((err) => console.warn('[project-soft] Failed to delete work order from MySQL:', err));

    setDb((prev) => {
      const target = prev.workOrders.find((w) => w.id === id);
      if (!target) return prev;
      const ptdWos = prev.workOrders.filter((w) => w.ptdId === target.ptdId && w.id !== id);
      const calcProgress = ptdWos.length
        ? Math.round(ptdWos.reduce((s, w) => s + (Number(w.progress) || 0), 0) / ptdWos.length)
        : 0;

      return {
        ...prev,
        workOrders: prev.workOrders.filter((w) => w.id !== id),
        ptds: prev.ptds.map((p) =>
          p.id === target.ptdId
            ? {
                ...p,
                allocatedHours: ptdWos.reduce((s, w) => s + (w.estimatedHours || 0), 0),
                usedHours: ptdWos.reduce((s, w) => s + (w.actualHours || 0), 0),
                progress: calcProgress,
                status: ptdWos.length === 0 && p.status === 'in-progress' ? 'not-started' : p.status,
              }
            : p,
        ),
      };
    });
  };

  const createProject = (projectData) => {
    const id = uid('p');
    const today = new Date().toISOString().slice(0, 10);
    const newProject = {
      id,
      name: projectData.name.trim(),
      client: projectData.client?.trim() || 'Internal',
      pm: projectData.pm || currentUser?.id || 'u1',
      status: projectData.status || 'not-started',
      priority: projectData.priority || 'medium',
      startDate: projectData.startDate || today,
      dueDate: projectData.dueDate || '',
      team: projectData.team || [],
      description: projectData.description?.trim() || '',
    };
    const defaultMilestones = [
      { id: uid('m'), projectId: id, name: 'Requirement', status: 'pending' },
      { id: uid('m'), projectId: id, name: 'UI Design', status: 'pending' },
      { id: uid('m'), projectId: id, name: 'Development', status: 'pending' },
      { id: uid('m'), projectId: id, name: 'Testing', status: 'pending' },
      { id: uid('m'), projectId: id, name: 'Deployment', status: 'pending' },
    ];
    setDb((prev) => ({
      ...prev,
      projects: [newProject, ...prev.projects],
      milestones: [...(prev.milestones || []), ...defaultMilestones],
      activity: [
        {
          id: uid('a'),
          date: today,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          actor: currentUser?.name || 'Project Manager',
          projectId: id,
          text: `created new project "${newProject.name}"`,
        },
        ...(prev.activity || []),
      ],
    }));
    return id;
  };

  const updateProject = (id, patch) => {
    setDb((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const deleteProject = (id) => {
    setDb((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
      ptds: prev.ptds.filter((t) => t.projectId !== id),
      workOrders: prev.workOrders.filter((w) => w.projectId !== id),
      milestones: (prev.milestones || []).filter((m) => m.projectId !== id),
      activity: (prev.activity || []).filter((a) => a.projectId !== id),
    }));
  };

  const updateMilestone = (id, patch) => {
    setDb((prev) => ({
      ...prev,
      milestones: (prev.milestones || []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  };

  const raiseBlocker = (blockerData) => {
    const id = uid('b');
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const targetWo = db.workOrders.find((w) => w.id === blockerData.workOrderId);
    const newBlocker = {
      id,
      description: blockerData.description.trim(),
      projectId: blockerData.projectId || targetWo?.projectId || null,
      workOrderId: blockerData.workOrderId || null,
      developerId: blockerData.developerId || currentUser?.id || 'u2',
      priority: blockerData.priority || 'high',
      type: blockerData.type || 'Technical issue',
      dateRaised: today,
      status: 'open',
    };
    setDb((prev) => ({
      ...prev,
      blockers: [newBlocker, ...(prev.blockers || [])],
      activity: [
        {
          id: uid('a'),
          date: today,
          time,
          actor: currentUser?.name || 'Developer',
          projectId: newBlocker.projectId,
          text: `raised blocker: "${newBlocker.description}"`,
        },
        ...(prev.activity || []),
      ],
    }));
  };

  const logHours = (workOrderId, hours, note = '') => {
    const hrs = Math.round((Number(hours) || 0) * 100) / 100;
    if (hrs <= 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const targetWo = db.workOrders.find((w) => w.id === workOrderId);
    if (!targetWo) return;

    const newActualHours = Math.round(((Number(targetWo.actualHours) || 0) + hrs) * 100) / 100;
    fetch(`/api/work-orders/${workOrderId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualHours: newActualHours }),
    }).catch((err) => console.warn('[project-soft] Failed to sync actualHours to MySQL:', err));

    setDb((prev) => {
      const updatedWorkOrders = prev.workOrders.map((w) =>
        w.id === workOrderId
          ? { ...w, actualHours: newActualHours }
          : w,
      );
      const ptdWos = updatedWorkOrders.filter((w) => w.ptdId === targetWo.ptdId);
      const usedHours = Math.round(ptdWos.reduce((s, w) => s + (Number(w.actualHours) || 0), 0) * 100) / 100;

      return {
        ...prev,
        workOrders: updatedWorkOrders,
        ptds: prev.ptds.map((p) => (p.id === targetWo.ptdId ? { ...p, usedHours } : p)),
        notifications: [
          makeNotification('hours', `${currentUser?.name || 'Developer'} logged ${hrs}h on "${targetWo.title}"${note ? ` (${note})` : ''}`, {
            actor: currentUser?.name || 'Developer',
            date: today,
            time,
            projectId: targetWo.projectId,
            workOrderId: targetWo.id,
          }),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'Developer',
            projectId: targetWo.projectId,
            text: `logged ${hrs}h on "${targetWo.title}"${note ? ` (${note})` : ''}`,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const toggleWorkOrderChecklist = (workOrderId, checklistItemId) => {
    setDb((prev) => ({
      ...prev,
      workOrders: prev.workOrders.map((w) => {
        if (w.id !== workOrderId) return w;
        return {
          ...w,
          checklist: (w.checklist || []).map((c) => (c.id === checklistItemId ? { ...c, done: !c.done } : c)),
        };
      }),
    }));
  };

  const addWorkOrderChecklistItem = (workOrderId, title) => {
    if (!title?.trim()) return;
    setDb((prev) => ({
      ...prev,
      workOrders: prev.workOrders.map((w) => {
        if (w.id !== workOrderId) return w;
        return {
          ...w,
          checklist: [...(w.checklist || []), { id: uid('c'), title: title.trim(), done: false }],
        };
      }),
    }));
  };

  const deleteWorkOrderChecklistItem = (workOrderId, checklistItemId) => {
    setDb((prev) => ({
      ...prev,
      workOrders: prev.workOrders.map((w) => {
        if (w.id !== workOrderId) return w;
        return {
          ...w,
          checklist: (w.checklist || []).filter((c) => c.id !== checklistItemId),
        };
      }),
    }));
  };

  const addWorkOrderComment = (workOrderId, text) => {
    if (!text?.trim()) return;
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const newComment = {
      id: uid('cm'),
      author: currentUser?.name || 'User',
      time: `Today, ${time}`,
      text: text.trim(),
    };

    setDb((prev) => ({
      ...prev,
      workOrders: prev.workOrders.map((w) => {
        if (w.id !== workOrderId) return w;
        return {
          ...w,
          comments: [...(w.comments || []), newComment],
        };
      }),
    }));
  };

  const submitWorkOrderForReview = (workOrderId, note = '') => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const reviewEntry = {
      id: uid('rh'),
      date: today,
      reviewer: currentUser?.name || 'Developer',
      decision: 'submitted',
      note: note.trim() || 'Submitted for PM review',
    };

    setDb((prev) => {
      const target = prev.workOrders.find((w) => w.id === workOrderId);
      if (!target) return prev;
      return {
        ...prev,
        workOrders: prev.workOrders.map((w) =>
          w.id === workOrderId
            ? {
                ...w,
                status: 'submitted-review',
                reviewHistory: [reviewEntry, ...(w.reviewHistory || [])],
              }
            : w,
        ),
        notifications: [
          makeNotification('review', `Work order "${target.title}" submitted for review by ${currentUser?.name || 'Developer'}`, {
            actor: currentUser?.name || 'Developer',
            date: today,
            time,
            projectId: target.projectId,
            workOrderId: target.id,
          }),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'Developer',
            projectId: target.projectId,
            text: `submitted "${target.title}" for review`,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const reviewWorkOrder = (workOrderId, decision, feedbackNote = '') => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const isApproved = decision === 'approved';
    const newStatus = isApproved ? 'completed' : 'changes-requested';

    const reviewEntry = {
      id: uid('rh'),
      date: today,
      reviewer: currentUser?.name || 'Project Manager',
      decision,
      note: feedbackNote.trim() || (isApproved ? 'Approved by PM' : 'Changes requested by PM'),
    };

    setDb((prev) => {
      const target = prev.workOrders.find((w) => w.id === workOrderId);
      if (!target) return prev;
      return {
        ...prev,
        workOrders: prev.workOrders.map((w) =>
          w.id === workOrderId
            ? {
                ...w,
                status: newStatus,
                reviewHistory: [reviewEntry, ...(w.reviewHistory || [])],
              }
            : w,
        ),
        notifications: [
          makeNotification(
            isApproved ? 'approval' : 'changes',
            isApproved
              ? `Work order "${target.title}" was approved by PM!`
              : `Changes requested on "${target.title}"${feedbackNote ? `: ${feedbackNote}` : ''}`,
            {
              actor: currentUser?.name || 'Project Manager',
              date: today,
              time,
              projectId: target.projectId,
              workOrderId: target.id,
            },
          ),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'Project Manager',
            projectId: target.projectId,
            text: `${isApproved ? 'approved' : 'requested changes on'} "${target.title}"`,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const resolveBlocker = (blockerId, resolution = 'Resolved') => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    setDb((prev) => {
      const target = prev.blockers.find((b) => b.id === blockerId);
      if (!target) return prev;
      return {
        ...prev,
        blockers: prev.blockers.map((b) =>
          b.id === blockerId ? { ...b, status: 'resolved', resolution, resolvedDate: today } : b,
        ),
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'User',
            projectId: target.projectId,
            text: `resolved blocker: "${target.description}"`,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const addWorkOrderFile = (workOrderId, fileData) => {
    const today = new Date().toISOString().slice(0, 10);
    const newFile = {
      id: uid('f'),
      name: fileData.name,
      size: fileData.size || '500 KB',
      uploadedBy: currentUser?.name || 'User',
      date: today,
    };

    setDb((prev) => ({
      ...prev,
      workOrders: prev.workOrders.map((w) => {
        if (w.id !== workOrderId) return w;
        return {
          ...w,
          files: [...(w.files || []), newFile],
        };
      }),
    }));
  };

  const addFile = (fileData) => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const name = (fileData.name || '').trim();
    if (!name) return;
    const project = db.projects.find((p) => p.id === fileData.projectId);
    const newFile = {
      id: uid('f'),
      name,
      type: fileData.type || 'Document',
      size: fileData.size?.trim() || '—',
      client: fileData.client?.trim() || project?.client || '',
      projectId: fileData.projectId || null,
      ptdId: fileData.ptdId || null,
      workOrderId: fileData.workOrderId || null,
      uploadedBy: fileData.uploadedBy || currentUser?.name || 'User',
      date: today,
      version: fileData.version || 1,
      source: fileData.source || 'manual',
      orderId: fileData.orderId || null,
    };

    setDb((prev) => ({
      ...prev,
      files: [newFile, ...(prev.files || [])],
      activity: [
        {
          id: uid('a'),
          date: today,
          time,
          actor: currentUser?.name || 'User',
          projectId: newFile.projectId,
          text: `uploaded file "${name}"${project ? ` for ${project.name}` : ''}`,
        },
        ...(prev.activity || []),
      ],
    }));
  };

  const deleteFile = (id) => {
    setDb((prev) => ({
      ...prev,
      files: (prev.files || []).filter((f) => f.id !== id),
    }));
  };

  const reportIssue = (data) => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const project = db.projects.find((p) => p.id === data.projectId);
    const dev = db.users.find((u) => u.id === data.assignedTo);
    const title = (data.title || '').trim();
    if (!title) return;

    const newIssue = {
      id: uid('iss'),
      projectId: data.projectId || null,
      workOrderId: data.workOrderId || null,
      title,
      category: data.category || 'Functional',
      priority: data.priority || 'medium',
      description: (data.description || '').trim(),
      screenshot: data.screenshot || null,
      screenshotName: data.screenshotName || '',
      reportedBy: currentUser?.name || 'User',
      reportedById: currentUser?.id || null,
      assignedTo: data.assignedTo || 'u2',
      status: 'open',
      dateReported: today,
      timeReported: time,
      resolution: '',
      resolvedDate: null,
    };

    setDb((prev) => ({
      ...prev,
      issues: [newIssue, ...(prev.issues || [])],
      notifications: [
        makeNotification('issue', `New issue "${newIssue.title}" assigned to ${dev?.name || 'a developer'}${project ? ` in ${project.name}` : ''}`, {
          actor: currentUser?.name || 'User',
          date: today,
          time,
          projectId: newIssue.projectId,
          issueId: newIssue.id,
        }),
        ...(prev.notifications || []),
      ],
      activity: [
        {
          id: uid('a'),
          date: today,
          time,
          actor: currentUser?.name || 'User',
          projectId: newIssue.projectId,
          text: `reported issue "${newIssue.title}"`,
        },
        ...(prev.activity || []),
      ],
    }));
  };

  const updateIssueStatus = (id, status, note = '') => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    setDb((prev) => {
      const target = (prev.issues || []).find((i) => i.id === id);
      if (!target) return prev;
      return {
        ...prev,
        issues: (prev.issues || []).map((i) =>
          i.id === id
            ? {
                ...i,
                status,
                resolution: note.trim() || i.resolution,
                resolvedDate: status === 'resolved' || status === 'closed' ? today : i.resolvedDate,
              }
            : i,
        ),
        notifications: [
          makeNotification('issue', `Issue "${target.title}" marked as ${status.replaceAll('-', ' ')} by ${currentUser?.name || 'User'}`, {
            actor: currentUser?.name || 'User',
            date: today,
            time,
            projectId: target.projectId,
            issueId: target.id,
          }),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'User',
            projectId: target.projectId,
            text: `marked issue "${target.title}" as ${status.replaceAll('-', ' ')}`,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const sendMessage = (toId, text, attachment = null) => {
    const body = ('' + (text || '')).trim();
    const att = attachment && attachment.name ? attachment : null;
    if ((!body && !att) || !toId || toId === currentUser?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const conv = [currentUser.id, toId].sort().join(':');
    const msg = {
      id: uid('m'),
      conv,
      from: currentUser.id,
      to: toId,
      text: body,
      attachment: att,
      date: today,
      time,
      read: false,
    };
    setDb((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), msg],
    }));
  };

  const markConversationRead = (peerId) => {
    if (!peerId) return;
    setDb((prev) => ({
      ...prev,
      messages: (prev.messages || []).map((m) =>
        m.to === currentUser?.id && m.from === peerId ? { ...m, read: true } : m,
      ),
    }));
  };

  const markNotificationRead = (id) => {
    setDb((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  };

  const markAllNotificationsRead = () => {
    setDb((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) => (n.read ? n : { ...n, read: true })),
    }));
  };

  const addReportEntry = async ({ date, hours, workOrderId, notes }) => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (!currentUser?.id) return;
    const cleanHours = Math.max(0, Number(hours) || 0);
    const cleanNotes = (notes || '').trim();
    if (cleanHours <= 0 && !cleanNotes) return;

    const payload = {
      userId: currentUser.id,
      date: date || today,
      time,
      hours: cleanHours,
      workOrderId: workOrderId || null,
      notes: cleanNotes,
    };

    let entry = { ...payload, id: uid('re') };
    try {
      const res = await fetch('/api/report-entries/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        entry = await res.json();
      }
    } catch (err) {
      console.warn('[project-soft] Failed to save report entry:', err);
    }

    setDb((prev) => {
      const wo = (prev.workOrders || []).find((w) => w.id === entry.workOrderId) || null;
      return {
        ...prev,
        reportEntries: [entry, ...(prev.reportEntries || []).filter((e) => e.id !== entry.id)],
        notifications: [
          makeNotification(
            'report',
            `${currentUser?.name || 'User'} submitted a daily report (${entry.hours}h)${wo ? ` on "${wo.title}"` : ''}`,
            { actor: currentUser?.name || 'User', date: today, time, workOrderId: entry.workOrderId || null },
          ),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'User',
            projectId: wo?.projectId || null,
            text:
              entry.hours > 0
                ? `submitted a daily report entry (${entry.hours}h)${wo ? ` on "${wo.title}"` : ''}`
                : `submitted a report note${wo ? ` on "${wo.title}"` : ''}`,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const submitDailyReport = async ({ date, entries }) => {
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (!currentUser?.id) return;
    const clean = (entries || [])
      .map((entry) => ({
        workOrderId: entry.workOrderId || null,
        hours: Math.max(0, Number(entry.hours) || 0),
        notes: ((entry.notes || entry.description) || '').trim(),
      }))
      .filter((entry) => entry.hours > 0 || entry.notes);
    if (!clean.length) return;
    const reportDate = date || today;

    const payload = clean.map((entry) => ({
      userId: currentUser.id,
      date: reportDate,
      time,
      hours: entry.hours,
      workOrderId: entry.workOrderId,
      notes: entry.notes,
    }));

    let savedList = payload.map((p) => ({ ...p, id: uid('re') }));
    try {
      const res = await fetch('/api/report-entries/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        savedList = Array.isArray(data) ? data : [data];
      }
    } catch (err) {
      console.warn('[project-soft] Failed to save daily report batch to backend:', err);
    }

    const totalHours = clean.reduce((s, entry) => s + entry.hours, 0);
    const firstWo = clean.map((e) => e.workOrderId).filter(Boolean).length
      ? ` (${clean.filter((e) => e.workOrderId).length} linked work orders)`
      : '';

    const hoursByWo = {};
    savedList.forEach((entry) => {
      if (entry.workOrderId && entry.hours > 0) {
        hoursByWo[entry.workOrderId] = (hoursByWo[entry.workOrderId] || 0) + entry.hours;
      }
    });

    setDb((prev) => {
      const updatedWos = Object.keys(hoursByWo).length
        ? (prev.workOrders || []).map((w) =>
            hoursByWo[w.id]
              ? { ...w, actualHours: Math.round(((w.actualHours || 0) + hoursByWo[w.id]) * 100) / 100 }
              : w,
          )
        : prev.workOrders;

      return {
        ...prev,
        workOrders: updatedWos,
        reportEntries: [
          ...savedList,
          ...(prev.reportEntries || []).filter((e) => !savedList.some((s) => s.id === e.id)),
        ],
        notifications: [
          makeNotification(
            'report',
            `${currentUser?.name || 'User'} submitted a daily report — ${clean.length} entries, ${totalHours}h${firstWo}`,
            { actor: currentUser?.name || 'User', date: today, time, workOrderId: savedList[0]?.workOrderId || null },
          ),
          ...(prev.notifications || []),
        ],
        activity: [
          {
            id: uid('a'),
            date: today,
            time,
            actor: currentUser?.name || 'User',
            text: `submitted a daily report (${clean.length} entries, ${totalHours}h)`,
            projectId: null,
          },
          ...(prev.activity || []),
        ],
      };
    });
  };

  const deleteReportEntry = async (id) => {
    const target = (db.reportEntries || []).find((e) => e.id === id);
    try {
      await fetch(`/api/report-entries/${id}/`, { method: 'DELETE' });
    } catch (err) {
      console.warn('[project-soft] Failed to delete report entry from backend:', err);
    }
    setDb((prev) => {
      let updatedWos = prev.workOrders;
      if (target?.workOrderId && target?.hours > 0) {
        updatedWos = (prev.workOrders || []).map((w) =>
          w.id === target.workOrderId
            ? { ...w, actualHours: Math.max(0, Math.round(((w.actualHours || 0) - target.hours) * 100) / 100) }
            : w,
        );
      }
      return {
        ...prev,
        workOrders: updatedWos,
        reportEntries: (prev.reportEntries || []).filter((e) => e.id !== id),
      };
    });
  };

  return (
    <AppContext.Provider
      value={{
        db,
        currentUser,
        login,
        logout,
        resetDb,
        updatePtd,
        acceptPtd,
        rejectPtd,
        reopenPtdRequest,
        createWorkOrders,
        createSingleWorkOrder,
        acceptWorkOrder,
        rejectWorkOrder,
        reassignWorkOrder,
        updateWorkOrder,
        updateWorkOrderStatus,
        deleteWorkOrder,
        toggleWorkOrderChecklist,
        addWorkOrderChecklistItem,
        deleteWorkOrderChecklistItem,
        addWorkOrderComment,
        submitWorkOrderForReview,
        reviewWorkOrder,
        createProject,
        updateProject,
        deleteProject,
        updateMilestone,
        raiseBlocker,
        resolveBlocker,
        logHours,
        addWorkOrderFile,
        addFile,
        deleteFile,
        reportIssue,
        updateIssueStatus,
        sendMessage,
        markConversationRead,
        markNotificationRead,
        markAllNotificationsRead,
        addReportEntry,
        submitDailyReport,
        deleteReportEntry,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}