import {
  PTD_STATUS_LABELS,
  WO_STATUS_LABELS,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
} from './ptdMeta.js';

const PTD_STATUS_STYLES = {
  requested: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  pending: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  received: 'bg-violet-500/15 text-violet-400',
  'not-started': 'bg-zinc-500/15 text-zinc-400',
  'in-progress': 'bg-amber-500/15 text-amber-400',
  'on-hold': 'bg-orange-500/15 text-orange-400',
  completed: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
};

const WO_STATUS_STYLES = {
  assigned: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  'not-started': 'bg-zinc-500/15 text-zinc-400',
  'in-progress': 'bg-amber-500/15 text-amber-400',
  'submitted-review': 'bg-violet-500/15 text-violet-400',
  'changes-requested': 'bg-orange-500/15 text-orange-400',
  completed: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
};

export function PtdStatusBadge({ status }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
        PTD_STATUS_STYLES[status] || 'bg-zinc-500/15 text-zinc-400'
      }`}
    >
      {PTD_STATUS_LABELS[status] || status}
    </span>
  );
}

export function WoStatusBadge({ status }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
        WO_STATUS_STYLES[status] || 'bg-zinc-500/15 text-zinc-400'
      }`}
    >
      {WO_STATUS_LABELS[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
        PRIORITY_STYLES[priority] || PRIORITY_STYLES.low
      }`}
    >
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
}