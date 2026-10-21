import { useMemo, useState } from 'react';
import {
  CreditCard,
  Download,
  File,
  FileText,
  Film,
  Image as ImageIcon,
  Paperclip,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useApp } from '../../data/context.js';
import FileUploadModal from './FileUploadModal.jsx';

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

const INITIAL_ORDERS = [
  {
    id: 'nf',
    client: 'Nova Finance',
    ref: 'NF-2211',
    status: 'in-progress',
    orderDate: '14 Aug 2026',
    projectName: 'POS Terminal Rollout',
    notes: 'POS terminals and payment tools for the head office branch.',
    files: [
      { id: 'nf-1', name: 'Nova Finance Logo.png', type: 'Logo', size: '142 KB', date: '14 Aug 2026', uploadedBy: 'A. Bello' },
      { id: 'nf-2', name: 'Business Card — Front.pdf', type: 'Business Card', size: '96 KB', date: '14 Aug 2026', uploadedBy: 'A. Bello' },
      { id: 'nf-3', name: 'Order Confirmation — NF-2211.pdf', type: 'Order Document', size: '218 KB', date: '14 Aug 2026', uploadedBy: 'A. Bello' },
      { id: 'nf-4', name: 'CAC Certificate.pdf', type: 'Verification', size: '1.1 MB', date: '15 Aug 2026', uploadedBy: 'A. Bello' },
      { id: 'nf-5', name: 'Storefront Photos.zip', type: 'Photo', size: '4.6 MB', date: '15 Aug 2026', uploadedBy: 'A. Bello' },
      { id: 'nf-6', name: 'Branch Walkthrough.mp4', type: 'Video', size: '34 MB', date: '16 Aug 2026', uploadedBy: 'A. Bello' },
    ],
  },
  {
    id: 'zb',
    client: 'Zenith Bank',
    ref: 'ZB-1102',
    status: 'in-progress',
    orderDate: '02 Sep 2026',
    projectName: 'Digital Banking Kiosk',
    notes: 'Kiosk deployment and agent banking registration for the Ikeja branch.',
    files: [
      { id: 'zb-1', name: 'Zenith Bank Logo.svg', type: 'Logo', size: '58 KB', date: '02 Sep 2026', uploadedBy: 'T. Okoro' },
      { id: 'zb-2', name: 'Business Card — Ibe.jpg', type: 'Business Card', size: '122 KB', date: '02 Sep 2026', uploadedBy: 'T. Okoro' },
      { id: 'zb-3', name: 'Order Confirmation — ZB-1102.pdf', type: 'Order Document', size: '305 KB', date: '02 Sep 2026', uploadedBy: 'T. Okoro' },
      { id: 'zb-4', name: 'Agent Verification.pdf', type: 'Verification', size: '640 KB', date: '03 Sep 2026', uploadedBy: 'T. Okoro' },
      { id: 'zb-5', name: 'Kiosk Site Photos.zip', type: 'Photo', size: '7.2 MB', date: '03 Sep 2026', uploadedBy: 'T. Okoro' },
    ],
  },
  {
    id: 'mx',
    client: 'MediCare Group',
    ref: 'MX-2207',
    status: 'on-hold',
    orderDate: '18 Sep 2026',
    projectName: 'Clinic Patient App',
    notes: 'Wallet and patient records module for the Lekki clinic.',
    files: [
      { id: 'mx-1', name: 'MediCare Logo.png', type: 'Logo', size: '164 KB', date: '18 Sep 2026', uploadedBy: 'F. Adeyemi' },
      { id: 'mx-2', name: 'Business Card — Dr. Amara.pdf', type: 'Business Card', size: '88 KB', date: '18 Sep 2026', uploadedBy: 'F. Adeyemi' },
      { id: 'mx-3', name: 'Order Confirmation — MX-2207.pdf', type: 'Order Document', size: '240 KB', date: '18 Sep 2026', uploadedBy: 'F. Adeyemi' },
      { id: 'mx-4', name: 'Clinic Interior Photos.zip', type: 'Photo', size: '5.1 MB', date: '19 Sep 2026', uploadedBy: 'F. Adeyemi' },
    ],
  },
];

function typeMeta(type) {
  return TYPE_META[type] || TYPE_DEFAULT;
}

function OrderStatusChip({ status }) {
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
  const { currentUser, leadsOrders = [], leadsLoading, downloadLeadsFile } = useApp();
  const isPm = currentUser?.role === 'pm' || currentUser?.role === 'admin';

  const [localOrders, setLocalOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const orders = useMemo(() => {
    if (leadsOrders && leadsOrders.length > 0) {
      if (localOrders.length === 0) return leadsOrders;
      return leadsOrders.map((lo) => {
        const found = localOrders.find((o) => o.id === lo.id);
        return found || lo;
      });
    }
    return localOrders.length > 0 ? localOrders : INITIAL_ORDERS;
  }, [leadsOrders, localOrders]);

  const selected = orders.find((o) => o.id === selectedId) || orders[0];

  const filteredOrders = orders.filter((o) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      o.client.toLowerCase().includes(q) ||
      o.ref.toLowerCase().includes(q) ||
      o.projectName.toLowerCase().includes(q)
    );
  });

  const addFiles = (projectId, files) => {
    setLocalOrders((prev) => {
      const base = prev.length > 0 ? prev : orders;
      return base.map((o) =>
        o.id === projectId ? { ...o, files: [...files, ...o.files] } : o,
      );
    });
  };

  const deleteFile = (projectId, fileId) => {
    setLocalOrders((prev) => {
      const base = prev.length > 0 ? prev : orders;
      return base.map((o) =>
        o.id === projectId ? { ...o, files: o.files.filter((f) => f.id !== fileId) } : o,
      );
    });
  };

  const handleCardClick = async (f) => {
    if (!f.url) {
      alert(`Download link not available for "${f.name}".`);
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
      .map((w) => w.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const renderDocCard = (f) => {
    const meta = typeMeta(f.type);
    const Icon = meta.icon;
    const isDownloading = downloadingId === f.id;
    return (
      <div
        key={f.id}
        onClick={() => handleCardClick(f)}
        title="Click to download from Leads Soft"
        className={`group relative flex flex-col rounded-2xl border p-4 transition-all cursor-pointer ${border} ${rowHover}`}
      >
        <div className="flex items-start justify-between">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${meta.cls}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-1.5">
            {isDownloading ? (
              <span className="text-[10px] font-semibold text-violet-400 animate-pulse">Downloading...</span>
            ) : (
              <span className="rounded-lg p-1 text-zinc-400 transition-colors group-hover:text-violet-400" title="Download document">
                <Download className="h-3.5 w-3.5" />
              </span>
            )}
            {isPm && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${f.name}"?`)) deleteFile(selected.id, f.id);
                }}
                title="Delete document"
                className="rounded-lg p-1 text-zinc-400 transition-colors cursor-pointer hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
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
            {leadsOrders?.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Leads Soft
              </span>
            )}
          </div>
          <p className={`mt-1 text-xs ${muted}`}>
            Orders and client reference documents uploaded in Leads Soft &ldquo;Client Details&rdquo;. Click any card to download.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 items-start lg:grid-cols-[320px_1fr]">
        {/* LEFT: all orders */}
        <div className={`rounded-2xl border p-3.5 ${panel} lg:sticky lg:top-0`}>
          <div className="flex items-center justify-between px-1 pb-2.5">
            <div>
              <h2 className={`text-sm font-bold ${heading}`}>Orders</h2>
              <p className={`text-[11px] ${muted}`}>{orders.length} confirmed orders</p>
            </div>
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-400 border border-violet-500/20">
              {orders.filter((o) => o.files.length > 0).length} with docs
            </span>
          </div>

          <div className="relative mb-2.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search orders..."
              className={`w-full rounded-xl border pl-8 pr-2 py-1.5 text-xs outline-none ${inputBg}`}
            />
          </div>

          <div className="flex max-h-[62vh] flex-col gap-1.5 overflow-y-auto pr-0.5">
            {filteredOrders.map((o) => {
              const active = selected?.id === o.id;
              const docCount = o.files.length;
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
                      <span className="font-mono text-[10px] font-bold text-violet-500">{o.ref}</span>
                    </div>
                    <div className={`mt-0.5 flex items-center gap-2 text-[10px] ${muted}`}>
                      <span>{o.orderDate}</span>
                      <span className="text-zinc-500">·</span>
                      <span className="font-semibold">
                        {docCount} doc{docCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <OrderStatusChip status={o.status} />
                </button>
              );
            })}
            {filteredOrders.length === 0 && (
              <div className={`py-8 text-center text-xs ${muted}`}>No orders match your search.</div>
            )}
          </div>
        </div>

        {/* RIGHT: documents for the selected order */}
        <div className="min-w-0">
          {selected && (
            <>
              {/* Order detail header */}
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
                        <OrderStatusChip status={selected.status} />
                      </div>
                      <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${muted}`}>
                        <span>Ordered {selected.orderDate}</span>
                        <span>·</span>
                        <span>
                          Linked to <span className="font-medium text-violet-400">{selected.projectName}</span>
                        </span>
                        <span>·</span>
                        <span>
                          <span className="font-semibold">{selected.files.length}</span> document
                          {selected.files.length !== 1 ? 's' : ''} collected
                        </span>
                      </div>
                      {selected.notes && (
                        <p className={`mt-2 text-xs leading-relaxed ${muted}`}>{selected.notes}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/30 transition-all cursor-pointer hover:bg-violet-500 active:scale-95"
                  >
                    <Upload className="h-3.5 w-3.5" /> Collect Document
                  </button>
                </div>
              </div>

              {/* Documents grid */}
              <div className="mt-4">
                {selected.files.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {selected.files.map(renderDocCard)}
                  </div>
                ) : (
                  <div className={`rounded-2xl border py-16 text-center ${panel}`}>
                    <Paperclip className={`mx-auto h-10 w-10 ${muted}`} />
                    <p className={`mt-3 text-sm font-semibold ${heading}`}>No documents collected yet</p>
                    <p className={`mt-1 text-xs ${muted}`}>
                      Use &ldquo;Collect Document&rdquo; to add photos, logos, business cards, KYC and other
                      references for this order.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showUpload && (
        <FileUploadModal
          dark={dark}
          orders={orders}
          initialOrderId={selected?.id || ''}
          onClose={() => setShowUpload(false)}
          onAdded={(data) => {
            if (data.orderId) addFiles(data.orderId, [data]);
          }}
        />
      )}
    </div>
  );
}