import { useState, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useApp } from '../data/context.js';
import { PtdStatusBadge, PriorityBadge, WoStatusBadge } from './badges.jsx';

const inputCls = (dark) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-violet-500 ${
    dark
      ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500'
      : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400'
  }`;

function emptyRow(devs) {
  return {
    title: '',
    description: '',
    estimatedHours: '',
    assignee: devs[0]?.id || '',
    priority: 'medium',
    startDate: '',
    dueDate: '',
  };
}

function ProgressBar({ value, dark }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
      <div
        className="h-full rounded-full bg-violet-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function DetailedPtd({ dark, ptdId, onBack }) {
  const { db, createWorkOrders, updateWorkOrder, deleteWorkOrder } = useApp();
  const ptd = db.ptds.find((p) => p.id === ptdId);

  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [rows, setRows] = useState(() => [emptyRow(db.users.filter((u) => u.role === 'dev'))]);

  const panel = dark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-white/80';
  const heading = dark ? 'text-zinc-200' : 'text-zinc-800';
  const muted = dark ? 'text-zinc-500' : 'text-zinc-500';
  const rowHover = dark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50';

  const toggleMenu = (id, evt) => {
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPos(null);
      return;
    }
    const rect = evt.currentTarget.getBoundingClientRect();
    const menuHeight = 85;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < menuHeight && rect.top > menuHeight;

    setMenuPos({
      top: showAbove ? rect.top - menuHeight : rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setOpenMenuId(id);
  };

  useEffect(() => {
    const handleScrollOrResize = () => {
      if (openMenuId) {
        setOpenMenuId(null);
        setMenuPos(null);
      }
    };
    if (openMenuId) {
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openMenuId]);

  if (!ptd) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <p className="text-sm text-zinc-500">PTD not found.</p>
      </div>
    );
  }

  const coreDevs = db.users.filter((u) => u.role === 'dev' && u.id?.startsWith('core-'));
  const devs = coreDevs.length > 0 ? coreDevs : db.users.filter((u) => u.role === 'dev');
  const usersById = Object.fromEntries(db.users.map((u) => [u.id, u]));
  const woList = db.workOrders.filter((w) => w.ptdId === ptdId);

  const remaining = Math.max(
    0,
    (ptd.estimatedHours || 0) - (ptd.allocatedHours || 0) - (ptd.usedHours || 0),
  );
  const batchHours = rows.reduce((s, r) => s + (Number(r.estimatedHours) || 0), 0);

  const updateRow = (i, patch) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const openCreate = () => {
    setEditingId(null);
    setRows([emptyRow(devs)]);
    setShowEditor(true);
  };

  const openEdit = (wo) => {
    setEditingId(wo.id);
    setRows([
      {
        title: wo.title || '',
        description: wo.description || '',
        estimatedHours: wo.estimatedHours ?? '',
        assignee: wo.assignee || devs[0]?.id || '',
        priority: wo.priority || 'medium',
        startDate: wo.startDate || '',
        dueDate: wo.dueDate || '',
      },
    ]);
    setShowEditor(true);
  };

  const saveRows = async () => {
    if (editingId) {
      const r = rows[0];
      if (r && r.title?.trim()) {
        await updateWorkOrder(editingId, {
          title: r.title.trim(),
          description: r.description?.trim() || '',
          estimatedHours: Number(r.estimatedHours) || 0,
          assignee: r.assignee,
          priority: r.priority || 'medium',
          startDate: r.startDate || '',
          dueDate: r.dueDate || '',
        });
      }
    } else {
      const created = await createWorkOrders(ptdId, rows);
      if (!created) return;
    }
    setEditingId(null);
    setRows([emptyRow(devs)]);
    setShowEditor(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
      {openMenuId && (
        <div
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => {
            setOpenMenuId(null);
            setMenuPos(null);
          }}
        />
      )}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back to PTDs
      </button>

      {/* Header */}
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className={`text-2xl font-bold ${heading}`}>
            <span className="text-violet-500">{ptd.ref}</span> · {ptd.name}
          </h1>
          <PtdStatusBadge status={ptd.status} />
        </div>
        <div className="mt-3 max-w-md">
          <ProgressBar value={ptd.progress} dark={dark} />
        </div>
      </div>

      {/* Info + hours */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`rounded-2xl border p-5 lg:col-span-2 ${panel}`}>
          <h2 className={`mb-2 text-sm font-semibold ${heading}`}>Description</h2>
          <p className={`text-sm leading-relaxed ${muted}`}>{ptd.description || '—'}</p>
          <div className={`mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs ${muted}`}>
            <span>
              Received: <span className={heading}>{ptd.receivedDate || '—'}</span>
            </span>
            <span>
              Deadline: <span className={heading}>{ptd.deadline || '—'}</span>
            </span>
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${panel}`}>
          <h2 className={`mb-3 text-sm font-semibold ${heading}`}>Man-Hours</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className={muted}>Total</dt>
              <dd className={`font-semibold tabular-nums ${heading}`}>{ptd.estimatedHours}h</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className={muted}>Allocated</dt>
              <dd className="font-semibold text-violet-500 tabular-nums">{ptd.allocatedHours}h</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className={muted}>Used</dt>
              <dd className={`font-semibold tabular-nums ${heading}`}>{ptd.usedHours}h</dd>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <dt className={muted}>Remaining</dt>
              <dd className={`font-semibold tabular-nums ${heading}`}>{remaining}h</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Work orders */}
      <div className={`mt-5 rounded-2xl border ${panel}`}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className={`text-sm font-semibold ${heading}`}>
            Work Orders <span className={`text-xs font-normal ${muted}`}>({woList.length})</span>
          </h2>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-600 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Work Orders
          </button>
        </div>

        {woList.length === 0 ? (
          <div className={`px-5 py-10 text-center text-sm ${muted}`}>
            No work orders yet — click "Add Work Orders" to split this PTD and assign man-hours.
          </div>
        ) : (
          <>
            {/* Work order cards (mobile) */}
            <div className="flex flex-col gap-2.5 p-3 sm:hidden">
              {woList.map((w) => (
                <div key={w.id} className={`rounded-xl border p-3 ${dark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className={`text-sm font-medium leading-tight ${heading}`}>{w.title}</div>
                      <div className={`mt-0.5 truncate text-xs ${muted}`}>{w.description || '—'}</div>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => toggleMenu(w.id, e)}
                        className={`rounded-md p-1.5 cursor-pointer ${
                          dark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-violet-400' : 'text-zinc-500 hover:bg-zinc-200 hover:text-violet-600'
                        }`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenuId === w.id && menuPos && (
                        <div
                          style={{
                            position: 'fixed',
                            top: `${menuPos.top}px`,
                            right: `${menuPos.right}px`,
                          }}
                          className={`z-50 w-36 overflow-hidden rounded-lg border py-1 shadow-lg ${
                            dark
                              ? 'border-zinc-700 bg-zinc-900 shadow-black/50'
                              : 'border-zinc-200 bg-white shadow-zinc-400/30'
                          }`}
                        >
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              setMenuPos(null);
                              openEdit(w);
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-xs cursor-pointer ${
                              dark
                                ? 'text-zinc-300 hover:bg-zinc-800'
                                : 'text-zinc-700 hover:bg-zinc-100'
                            }`}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              setMenuPos(null);
                              deleteWorkOrder(w.id);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${muted}`}>
                    <span>
                      Assignee: <span className={heading}>{usersById[w.assignee]?.name || '—'}</span>
                    </span>
                    <span>
                      Est{' '}
                      <span className={`font-semibold tabular-nums ${heading}`}>{w.estimatedHours}h</span>
                    </span>
                    <span>
                      Used{' '}
                      <span className={`font-semibold tabular-nums ${heading}`}>{w.actualHours}h</span>
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${Math.min(100, Math.max(0, w.progress ?? 0))}%` }}
                      />
                    </div>
                    <span className={`shrink-0 text-xs font-medium tabular-nums ${heading}`}>{w.progress ?? 0}%</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PriorityBadge priority={w.priority} />
                      <WoStatusBadge status={w.status} />
                    </div>
                    <span className={`shrink-0 text-xs tabular-nums ${muted}`}>Due {w.dueDate || '—'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Work order table (desktop) */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr className={`border-b text-xs uppercase tracking-wide ${muted}`}>
                  <th className="px-5 py-2.5 font-medium">Work Order</th>
                  <th className="px-5 py-2.5 font-medium">Assignee</th>
                  <th className="px-5 py-2.5 font-medium">Est</th>
                  <th className="px-5 py-2.5 font-medium">Actual</th>
                  <th className="px-5 py-2.5 font-medium">Progress</th>
                  <th className="px-5 py-2.5 font-medium">Priority</th>
                  <th className="px-5 py-2.5 font-medium">Due</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {woList.map((w) => (
                  <tr key={w.id} className={`border-b last:border-0 transition-colors ${rowHover}`}>
                    <td className="px-5 py-3">
                      <div className={`font-medium ${heading}`}>{w.title}</div>
                      <div className={`mt-0.5 max-w-[260px] truncate text-xs ${muted}`}>
                        {w.description || '—'}
                      </div>
                    </td>
                    <td className={`px-5 py-3 ${muted}`}>{usersById[w.assignee]?.name || '—'}</td>
                    <td className={`px-5 py-3 font-semibold tabular-nums ${heading}`}>{w.estimatedHours}h</td>
                    <td className={`px-5 py-3 font-semibold tabular-nums ${heading}`}>{w.actualHours}h</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-16 overflow-hidden rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${Math.min(100, Math.max(0, w.progress ?? 0))}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium tabular-nums ${heading}`}>{w.progress ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <PriorityBadge priority={w.priority} />
                    </td>
                    <td className={`px-5 py-3 text-xs tabular-nums ${muted}`}>{w.dueDate || '—'}</td>
                    <td className="px-5 py-3">
                      <WoStatusBadge status={w.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="relative">
                        <button
                          onClick={(e) => toggleMenu(w.id, e)}
                          className={`rounded-md p-1.5 cursor-pointer ${
                            dark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-violet-400' : 'text-zinc-500 hover:bg-zinc-200 hover:text-violet-600'
                          }`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {openMenuId === w.id && menuPos && (
                          <div
                            style={{
                              position: 'fixed',
                              top: `${menuPos.top}px`,
                              right: `${menuPos.right}px`,
                            }}
                            className={`z-50 w-36 overflow-hidden rounded-lg border py-1 shadow-lg ${
                              dark
                                ? 'border-zinc-700 bg-zinc-900 shadow-black/50'
                                : 'border-zinc-200 bg-white shadow-zinc-400/30'
                            }`}
                          >
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                setMenuPos(null);
                                openEdit(w);
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-xs cursor-pointer ${
                                dark
                                  ? 'text-zinc-300 hover:bg-zinc-800'
                                  : 'text-zinc-700 hover:bg-zinc-100'
                              }`}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                setMenuPos(null);
                                deleteWorkOrder(w.id);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Batch work-order editor drawer */}
      <div
        onClick={() => {
          setEditingId(null);
          setShowEditor(false);
        }}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          showEditor ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-label="Add work orders"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xl transform flex-col transition-transform duration-300 ${
          dark ? 'border-l border-zinc-800 bg-zinc-900' : 'border-l border-zinc-200 bg-white'
        } ${showEditor ? 'translate-x-0' : 'pointer-events-none translate-x-full'}`}
      >
        <div
          className={`flex items-center justify-between border-b px-5 py-4 ${
            dark ? 'border-zinc-800' : 'border-zinc-200'
          }`}
        >
          <h2 className={`text-sm font-semibold ${heading}`}>
            {editingId ? 'Edit Work Order' : 'Add Work Orders'}{' '}
            <span className={`text-xs font-normal ${muted}`}>· {ptd.ref}</span>
          </h2>
          <button
            onClick={() => {
              setEditingId(null);
              setShowEditor(false);
            }}
            className={`rounded-md p-1.5 cursor-pointer ${
              dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!editingId && (
            <div className={`mb-4 rounded-xl border p-3 ${dark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className={muted}>Available man-hours · {ptd.ref}</span>
                <span className={`font-semibold tabular-nums ${batchHours > remaining ? 'text-red-400' : heading}`}>
                  {Math.max(0, remaining - batchHours)}h
                  <span className={`font-normal ${muted}`}> available</span>
                </span>
              </div>
              <ProgressBar
                value={ptd.estimatedHours > 0 ? (Math.max(0, remaining - batchHours) / ptd.estimatedHours) * 100 : 0}
                dark={dark}
              />
              <div className={`mt-1.5 text-xs ${batchHours > remaining ? 'text-red-400' : muted}`}>
                {batchHours > remaining
                  ? `This batch exceeds the available time by ${batchHours - remaining}h.`
                  : `Allocating ${batchHours}h of ${remaining}h available this batch.`}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {rows.map((r, i) => (
              <div
                key={i}
                className={`rounded-xl border p-3 ${dark ? 'border-zinc-800' : 'border-zinc-200'}`}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className={`col-span-2 text-xs ${muted}`}>
                    Work order title *
                    <input
                      className={`mt-1 ${inputCls(dark)}`}
                      value={r.title}
                      onChange={(e) => updateRow(i, { title: e.target.value })}
                      placeholder="e.g. Build login page UI"
                    />
                  </label>
                  <label className={`text-xs ${muted}`}>
                    Est. man-hours
                    <input
                      type="number"
                      min="0"
                      className={`mt-1 ${inputCls(dark)}`}
                      value={r.estimatedHours}
                      onChange={(e) => updateRow(i, { estimatedHours: e.target.value })}
                      placeholder="16"
                    />
                  </label>
                  <label className={`text-xs ${muted}`}>
                    Developer
                    <select
                      className={`mt-1 ${inputCls(dark)}`}
                      value={r.assignee}
                      onChange={(e) => updateRow(i, { assignee: e.target.value })}
                    >
                      {devs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} · {d.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={`text-xs ${muted}`}>
                    Priority
                    <select
                      className={`mt-1 ${inputCls(dark)}`}
                      value={r.priority}
                      onChange={(e) => updateRow(i, { priority: e.target.value })}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </label>
                  <label className={`text-xs ${muted}`}>
                    Start date
                    <input
                      type="date"
                      className={`mt-1 ${inputCls(dark)}`}
                      style={{ colorScheme: dark ? 'dark' : 'light' }}
                      value={r.startDate}
                      onChange={(e) => updateRow(i, { startDate: e.target.value })}
                    />
                  </label>
                  <label className={`text-xs ${muted}`}>
                    Due date
                    <input
                      type="date"
                      className={`mt-1 ${inputCls(dark)}`}
                      style={{ colorScheme: dark ? 'dark' : 'light' }}
                      value={r.dueDate}
                      onChange={(e) => updateRow(i, { dueDate: e.target.value })}
                    />
                  </label>
                  <label className={`col-span-2 text-xs ${muted}`}>
                    Description
                    <textarea
                      rows={3}
                      className={`mt-1 resize-none ${inputCls(dark)}`}
                      value={r.description}
                      onChange={(e) => updateRow(i, { description: e.target.value })}
                      placeholder="What does this work order involve?"
                    />
                  </label>
                  <div className="col-span-2 flex items-center">
                    <button
                      onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                      className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!editingId && (
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setRows((prev) => [...prev, emptyRow(devs)])}
                className="flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-xs font-medium text-violet-500 hover:bg-violet-500/10 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add row
              </button>
              <span className={`text-xs ${muted}`}>
                Batch total:{' '}
                <span className="font-semibold text-violet-500 tabular-nums">{batchHours}h</span>
              </span>
            </div>
          )}
        </div>

        <div
          className={`flex items-center justify-end gap-2 border-t px-5 py-4 ${
            dark ? 'border-zinc-800' : 'border-zinc-200'
          }`}
        >
          <button
            onClick={() => {
              setEditingId(null);
              setShowEditor(false);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium cursor-pointer ${
              dark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={saveRows}
            disabled={!rows.some((r) => r.title && r.title.trim())}
            className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <Save className="h-4 w-4" /> {editingId ? 'Save changes' : 'Save all work orders'}
          </button>
        </div>
      </div>
    </div>
  );
}