import { useState } from 'react';
import {
  CreditCard,
  Download,
  File,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../data/context.js';

const TYPE_META = {
  Logo: { icon: ImageIcon, cls: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
  'Business Card': { icon: CreditCard, cls: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  'Order Document': { icon: FileText, cls: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  'SRS Document': { icon: FileText, cls: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
  'Voice Clip': { icon: Film, cls: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  Verification: { icon: ShieldCheck, cls: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  Photo: { icon: ImageIcon, cls: 'text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20' },
  Video: { icon: Film, cls: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  Documentation: { icon: FileText, cls: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
  Other: { icon: File, cls: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' },
};
const TYPE_DEFAULT = { icon: File, cls: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' };

const ORDER_STATUS_STYLES = {
  new: 'bg-sky-500/15 text-sky-400 border border-sky-500/20',
  'in-progress': 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  'on-hold': 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  completed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
};

function typeMeta(type) {
  return TYPE_META[type] || TYPE_DEFAULT;
}

function OrderStatusChip({ status }) {
  if (!status) return null;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
        ORDER_STATUS_STYLES[status] || ORDER_STATUS_STYLES.new
      }`}
    >
      {status.replace('-', ' ')}
    </span>
  );
}

export default function Files({ dark }) {
  const { leadsOrders = [], leadsLoading, downloadLeadsFile, refreshLeadsFiles } = useApp();

  const orders = leadsOrders || [];
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const selected = orders.find((o) => o.id === selectedId) || orders[0] || null;

  const filteredOrders = orders.filter((o) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      (o.client && o.client.toLowerCase().includes(q)) ||
      (o.ref && o.ref.toLowerCase().includes(q)) ||
      (o.projectName && o.projectName.toLowerCase().includes(q))
    );
  });

  const handleCardClick = async (f) => {
    if (!f.url) {
      alert(`Download URL not available for "${f.name}".`);
      return;
    }
    setDownloadingId(f.id);
    try {
      await downloadLeadsFile(f);
    } finally {
      setDownloadingId(null);
    }
  };

  const panel = dark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-white/80';
  const heading = dark ? 'text-zinc-200' : 'text-zinc-800';
  const muted = dark ? 'text-zinc-500' : 'text-zinc-500';
  const rowHover = dark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50';
  const border = dark ? 'border-zinc-800' : 'border-zinc-200';
  const inputBg = dark
    ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500 focus:border-violet-500'
    : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400 focus:border-violet-500';

  const initials = (name) =>
    (name || '')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CL';

  const renderDocCard = (f) => {
    const meta = typeMeta(f.type);
    const Icon = meta.icon;
    const isDownloading = downloadingId === f.id;
    return (
      <div
        key={f.id}
        onClick={() => handleCardClick(f)}
        title="Click to download directly from Leads Soft"
        className={`group relative flex flex-col rounded-2xl border p-4 transition-all cursor-pointer ${border} ${rowHover}`}
      >
        <div className="flex items-start justify-between">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${meta.cls}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-1.5">
            {isDownloading ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-400 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" /> Downloading
              </span>
            ) : (
              <span className="rounded-lg p-1.5 text-zinc-400 transition-colors group-hover:bg-violet-500/10 group-hover:text-violet-400" title="Download document">
                <Download className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 min-w-0">
          <span className={`text-xs font-semibold ${heading}`}>{f.name}</span>
        </div>
        <div>
          <span className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${meta.cls}`}>
            {f.type}
          </span>
        </div>
        <div className={`mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] ${muted}`}>
          {f.size && <span>{f.size}</span>}
          {f.uploadedBy && <span>· {f.uploadedBy}</span>}
          {f.date && <span>· {f.date}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className={`text-2xl font-bold ${heading}`}>Files</h1>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Leads Soft Live
            </span>
            {refreshLeadsFiles && (
              <button
                onClick={() => refreshLeadsFiles()}
                disabled={leadsLoading}
                title="Refresh files from Leads Soft"
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${leadsLoading ? 'animate-spin text-violet-400' : ''}`} />
              </button>
            )}
          </div>
          <p className={`mt-1 text-xs ${muted}`}>
            Real-time client details and uploaded files from Leads Soft. Clicking any document card downloads the file via API.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 items-start lg:grid-cols-[320px_1fr]">
        {/* LEFT: all orders from Leads Soft */}
        <div className={`rounded-2xl border p-3.5 ${panel} lg:sticky lg:top-0`}>
          <div className="flex items-center justify-between px-1 pb-2.5">
            <div>
              <h2 className={`text-sm font-bold ${heading}`}>Orders</h2>
              <p className={`text-[11px] ${muted}`}>{orders.length} Leads Soft records</p>
            </div>
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-400 border border-violet-500/20">
              {orders.filter((o) => (o.files || []).length > 0).length} with files
            </span>
          </div>

          <div className="relative mb-2.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client or ref..."
              className={`w-full rounded-xl border pl-8 pr-2 py-1.5 text-xs outline-none ${inputBg}`}
            />
          </div>

          <div className="flex max-h-[62vh] flex-col gap-1.5 overflow-y-auto pr-0.5">
            {filteredOrders.map((o) => {
              const active = selected?.id === o.id;
              const docCount = (o.files || []).length;
              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                    active
                      ? dark
                        ? 'border-zinc-600 bg-zinc-800 ring-1 ring-zinc-700'
                        : 'border-zinc-900 bg-zinc-100 ring-1 ring-zinc-200'
                      : `${border} ${rowHover}`
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      active
                        ? dark
                          ? 'bg-zinc-200 text-zinc-900'
                          : 'bg-zinc-900 text-white'
                        : dark
                          ? 'bg-zinc-800 text-zinc-200'
                          : 'bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    {initials(o.client)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`truncate text-xs font-semibold ${heading}`}>{o.client}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] font-bold text-violet-500">{o.ref}</span>
                      <span className="text-zinc-500">·</span>
                      <span className={`text-[10px] font-semibold ${muted}`}>
                        {docCount} file{docCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {o.status && <OrderStatusChip status={o.status} />}
                </button>
              );
            })}
            {filteredOrders.length === 0 && (
              <div className={`py-8 text-center text-xs ${muted}`}>
                {leadsLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                    <span>Loading Leads Soft data...</span>
                  </div>
                ) : (
                  'No client orders found.'
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: documents for the selected client */}
        <div className="min-w-0">
          {selected ? (
            <>
              {/* Client detail header */}
              <div className={`rounded-2xl border p-5 ${panel}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
                      dark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
                    } border ${border}`}>
                      {initials(selected.client)}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className={`text-lg font-bold ${heading}`}>{selected.client}</h2>
                        <span className="rounded bg-zinc-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-violet-400">
                          {selected.ref}
                        </span>
                        {selected.status && <OrderStatusChip status={selected.status} />}
                      </div>
                      <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${muted}`}>
                        {selected.orderDate && <span>Date: {selected.orderDate}</span>}
                        {selected.orderDate && selected.projectName && <span>·</span>}
                        {selected.projectName && (
                          <span>Category: <span className="font-medium text-violet-400">{selected.projectName}</span></span>
                        )}
                        <span>·</span>
                        <span>
                          <span className="font-semibold">{(selected.files || []).length}</span> file
                          {(selected.files || []).length !== 1 ? 's' : ''} in Leads Soft
                        </span>
                      </div>
                      {selected.notes && (
                        <p className={`mt-2 text-xs leading-relaxed ${muted}`}>{selected.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents grid */}
              <div className="mt-4">
                {(selected.files || []).length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {selected.files.map(renderDocCard)}
                  </div>
                ) : (
                  <div className={`rounded-2xl border py-16 text-center ${panel}`}>
                    <Paperclip className={`mx-auto h-10 w-10 ${muted}`} />
                    <p className={`mt-3 text-sm font-semibold ${heading}`}>No documents uploaded yet</p>
                    <p className={`mt-1 text-xs ${muted}`}>
                      No files have been attached to this client in Leads Soft &ldquo;Client Details&rdquo;.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={`rounded-2xl border py-16 text-center ${panel}`}>
              <Paperclip className={`mx-auto h-10 w-10 ${muted}`} />
              <p className={`mt-3 text-sm font-semibold ${heading}`}>
                {leadsLoading ? 'Connecting to Leads Soft...' : 'No client details available'}
              </p>
              <p className={`mt-1 text-xs ${muted}`}>
                {leadsLoading ? 'Fetching live files from Leads Soft API...' : 'Client details and attached documents will appear here once available in Leads Soft.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}