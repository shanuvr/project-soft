import { useState } from 'react';
import {
  X,
  Clock,
  Trash2,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { PriorityBadge, WoStatusBadge } from '../badges.jsx';
import { useApp } from '../../data/context.js';

export default function WorkOrderDetailDrawer({
  workOrderId,
  dark,
  onClose,
}) {
  const {
    db,
    currentUser,
    deleteWorkOrder,
    reassignWorkOrder,
  } = useApp();

  const wo = db.workOrders.find((w) => w.id === workOrderId);
  const developers = (db.users || []).filter((u) => u.role === 'dev' || u.role === 'senior-dev' || u.role === 'junior-dev' || !u.role || u.role === 'pm');

  const [newAssigneeId, setNewAssigneeId] = useState(() => {
    // Pick another developer by default if current assignee is wo.assignee
    const otherDev = developers.find((d) => d.id !== wo?.assignee);
    return otherDev?.id || wo?.assignee || '';
  });
  const [reassignedSuccess, setReassignedSuccess] = useState(false);

  if (!wo) return null;

  const project = db.projects.find((p) => p.id === wo.projectId);
  const assignee = db.users.find((u) => u.id === wo.assignee);

  const isPm = currentUser?.role === 'pm' || currentUser?.role === 'admin';

  const estHours = Math.round((Number(wo.estimatedHours) || 0) * 100) / 100;
  const actHours = Math.round((Number(wo.actualHours) || 0) * 100) / 100;
  const remainingHours = Math.max(0, Math.round((estHours - actHours) * 100) / 100);

  const borderCls = dark ? 'border-zinc-800' : 'border-zinc-200';
  const bgPanel = dark ? 'bg-zinc-900/95 text-zinc-100' : 'bg-white text-zinc-800';
  const mutedText = dark ? 'text-zinc-400' : 'text-zinc-500';
  const headingText = dark ? 'text-zinc-100' : 'text-zinc-800';

  const handleReassign = () => {
    if (!newAssigneeId) return;
    reassignWorkOrder(wo.id, newAssigneeId);
    setReassignedSuccess(true);
    setTimeout(() => setReassignedSuccess(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className={`flex h-full w-full max-w-2xl flex-col shadow-2xl transition-all ${bgPanel}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className={`flex items-center justify-between border-b px-6 py-4 ${borderCls}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-violet-500 uppercase tracking-wider">
                  {wo.id}
                </span>
                <WoStatusBadge status={wo.status} />
                <PriorityBadge priority={wo.priority} />
              </div>
              <h2 className={`mt-1 text-lg font-bold truncate leading-tight ${headingText}`}>
                {wo.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPm && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${wo.title}"?`)) {
                    deleteWorkOrder(wo.id);
                    onClose();
                  }
                }}
                className={`rounded-lg p-2 transition-colors cursor-pointer text-zinc-400 hover:text-red-400 ${
                  dark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                }`}
                title="Delete Work Order"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className={`rounded-lg p-2 transition-colors cursor-pointer ${
                dark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-600'
              }`}
              title="Close [Esc]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body — single scrollable view, no tabs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* REJECTION BANNER & REASSIGNMENT CONTROLS */}
          {wo.status === 'rejected' && (
            <div
              className={`rounded-2xl border p-4.5 transition-all ${
                dark
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                  : 'border-rose-200 bg-rose-50/90 text-rose-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-rose-400">
                      Work Order Assignment Rejected
                    </h3>
                    {wo.rejectedDate && (
                      <span className="text-[11px] font-mono text-rose-400/80">
                        {wo.rejectedDate}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-rose-300/80' : 'text-rose-700'}`}>
                    Developer <strong className="font-semibold">{assignee?.name || 'Developer'}</strong> rejected this assignment.
                  </p>

                  {/* Rejection Remark Card */}
                  <div
                    className={`mt-3 rounded-xl border p-3 text-xs leading-relaxed ${
                      dark ? 'border-rose-500/30 bg-black/40 text-rose-200' : 'border-rose-200 bg-white text-rose-900'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1">
                      Developer's Rejection Remarks:
                    </div>
                    <div className="italic font-medium">"{wo.rejectionRemark || 'No detailed reason provided.'}"</div>
                  </div>

                  {/* Reassignment Controls for PM */}
                  {isPm && (
                    <div className="mt-4 pt-3 border-t border-rose-500/20">
                      <div className="text-xs font-bold text-rose-300 mb-2 flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5" />
                        Reassign to another Developer:
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                          value={newAssigneeId}
                          onChange={(e) => setNewAssigneeId(e.target.value)}
                          className={`flex-1 rounded-xl border px-3 py-2 text-xs outline-none ${
                            dark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-800'
                          }`}
                        >
                          {developers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.id === wo.assignee ? '(Previous Dev)' : `(${d.title || d.role})`}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleReassign}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-violet-500 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Reassign Work Order</span>
                        </button>
                      </div>

                      {reassignedSuccess && (
                        <div className="mt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Work order reassigned successfully! Status changed to Assigned.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PENDING ACCEPTANCE BANNER */}
          {wo.status === 'assigned' && (
            <div
              className={`rounded-2xl border p-4 transition-all ${
                dark
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                  : 'border-blue-200 bg-blue-50 text-blue-900'
              }`}
            >
              <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-400">
                      Pending Developer Acceptance
                    </h4>
                    <p className={`text-[11px] ${dark ? 'text-blue-300/80' : 'text-blue-700'}`}>
                      Assigned to <strong className="font-semibold">{assignee?.name || 'Developer'}</strong>. The developer can accept or reject this assignment with remarks.
                    </p>
                  </div>
                </div>

                {/* Quick Reassign option if needed */}
                {isPm && (
                  <div className="flex items-center gap-2">
                    <select
                      value={newAssigneeId}
                      onChange={(e) => setNewAssigneeId(e.target.value)}
                      className={`rounded-xl border px-2.5 py-1.5 text-xs outline-none ${
                        dark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-800'
                      }`}
                    >
                      {developers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleReassign}
                      className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-all cursor-pointer whitespace-nowrap"
                    >
                      Reassign
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={`rounded-xl border p-3 ${borderCls}`}>
              <span className={`text-[11px] font-medium ${mutedText}`}>Project</span>
              <div className={`mt-1 font-semibold text-xs truncate ${headingText}`}>
                {project?.name || '—'}
              </div>
            </div>
            <div className={`rounded-xl border p-3 ${borderCls}`}>
              <span className={`text-[11px] font-medium ${mutedText}`}>Assignee</span>
              <div className={`mt-1 font-semibold text-xs truncate ${headingText}`}>
                {assignee?.name || 'Unassigned'}
              </div>
            </div>
            <div className={`rounded-xl border p-3 ${borderCls}`}>
              <span className={`text-[11px] font-medium ${mutedText}`}>Start Date</span>
              <div className={`mt-1 font-semibold text-xs tabular-nums ${headingText}`}>
                {wo.startDate || '—'}
              </div>
            </div>
            <div className={`rounded-xl border p-3 ${borderCls}`}>
              <span className={`text-[11px] font-medium ${mutedText}`}>Due Date</span>
              <div className={`mt-1 font-semibold text-xs tabular-nums ${headingText}`}>
                {wo.dueDate || '—'}
              </div>
            </div>
          </div>

          {/* Hours Summary */}
          <div className={`rounded-2xl border p-4.5 ${borderCls}`}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-violet-500" />
              <h4 className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
                Time Tracking
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className={`rounded-xl border p-3 text-center ${borderCls}`}>
                <span className={`text-[11px] ${mutedText}`}>Estimated</span>
                <div className={`mt-1 text-xl font-bold tabular-nums ${headingText}`}>
                  {estHours}h
                </div>
              </div>
              <div className={`rounded-xl border p-3 text-center ${borderCls}`}>
                <span className={`text-[11px] ${mutedText}`}>Logged</span>
                <div className="mt-1 text-xl font-bold tabular-nums text-violet-500">
                  {actHours}h
                </div>
              </div>
              <div className={`rounded-xl border p-3 text-center ${borderCls}`}>
                <span className={`text-[11px] ${mutedText}`}>Remaining</span>
                <div className={`mt-1 text-xl font-bold tabular-nums ${headingText}`}>
                  {remainingHours}h
                </div>
              </div>
            </div>
          </div>

          {/* Work Progress — read-only on PM side; set by the assigned developer */}
          <div className={`rounded-2xl border p-4.5 ${borderCls}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                <h4 className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
                  Work Progress
                </h4>
              </div>
              <span className="text-sm font-bold text-violet-500 tabular-nums">
                {wo.progress ?? 0}%
              </span>
            </div>

            <div className={`h-2 w-full overflow-hidden rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
              <div
                className={`h-full rounded-full transition-all ${
                  (wo.progress ?? 0) >= 100
                    ? 'bg-emerald-500'
                    : (wo.progress ?? 0) >= 50
                    ? 'bg-violet-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${wo.progress ?? 0}%` }}
              />
            </div>

            <p className={`mt-2.5 text-[11px] ${mutedText}`}>
              Updated by {assignee?.name || 'the assigned developer'} as work proceeds.
            </p>
          </div>

          {/* Description */}
          <div className={`rounded-2xl border p-4.5 ${borderCls}`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
              Description & Requirements
            </h4>
            <p className={`mt-2 text-sm leading-relaxed ${headingText}`}>
              {wo.description || 'No detailed description provided.'}
            </p>
          </div>


          {/* Dependencies Section */}
          {wo.dependencies && wo.dependencies.length > 0 && (
            <div className={`rounded-2xl border p-4.5 ${borderCls}`}>
              <h4 className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
                Dependencies (Work Orders this task relies on)
              </h4>
              <div className="mt-3 space-y-2">
                {wo.dependencies.map((depId) => {
                  const dep = db.workOrders.find((w) => w.id === depId);
                  return (
                    <div
                      key={depId}
                      className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${borderCls}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-violet-500">{depId}</span>
                        <span className={`font-medium ${headingText}`}>
                          {dep?.title || 'External task'}
                        </span>
                      </div>
                      {dep && <WoStatusBadge status={dep.status} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
