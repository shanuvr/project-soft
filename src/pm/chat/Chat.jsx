import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, FileImage, FileText, MessageSquare, Paperclip, Search, Send, X } from 'lucide-react';
import { useApp } from '../../data/context.js';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;

function initials(name) {
  return (name || '')
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function convKey(a, b) {
  return [a, b].sort().join(':');
}

function fmtGroupLabel(date) {
  if (!date) return 'Unknown';
  const t = new Date(`${date}T00:00:00`);
  const today = new Date();
  const tStr = t.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  if (tStr === todayStr) return 'Today';
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  return tStr === yest.toISOString().slice(0, 10) ? 'Yesterday' : date;
}

function fmtSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sortKey(m) {
  return m.createdAt || m.created_at || `${m.date || ''}T${m.time || ''}-${m.id || ''}`;
}

function AttachmentChip({ attachment, mine, dark }) {
  const isImage = IMAGE_EXT.test(attachment.name || '');
  const Icon = isImage ? FileImage : FileText;
  const badgeCls = mine
    ? 'bg-white/20 text-white'
    : dark
      ? 'bg-zinc-700/60 text-zinc-200'
      : 'bg-violet-500/15 text-violet-500';
  const frameCls = mine
    ? 'border-white/20 bg-white/10'
    : dark
      ? 'border-zinc-700 bg-zinc-900/60'
      : 'border-zinc-300 bg-white';
  const titleCls = mine ? 'text-white' : dark ? 'text-zinc-100' : 'text-zinc-800';
  const metaCls = mine ? 'text-white/70' : dark ? 'text-zinc-500' : 'text-zinc-500';

  return (
    <div className={`flex max-w-[240px] items-center gap-2 rounded-xl border p-2 ${frameCls}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${badgeCls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <span className={`block truncate text-xs font-semibold ${titleCls}`}>{attachment.name}</span>
        <span className={`block text-[10px] tabular-nums ${metaCls}`}>
          {fmtSize(attachment.size)}
          {attachment.type ? ` · ${attachment.type}` : ''}
        </span>
      </div>
    </div>
  );
}

export default function Chat({ dark }) {
  const { db, currentUser, sendMessage, markConversationRead } = useApp();
  const [activePeerId, setActivePeerId] = useState(null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);

  const users = useMemo(() => db.users || [], [db.users]);
  const messages = useMemo(() => db.messages || [], [db.messages]);
  const meId = currentUser?.id;

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const directory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => u.id !== meId)
      .filter((u) => !q || u.name.toLowerCase().includes(q) || (u.title || '').toLowerCase().includes(q))
      .map((u) => {
        const key = convKey(meId, u.id);
        const thread = messages.filter((m) => m.conv === key).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
        return {
          user: u,
          last: thread[thread.length - 1],
          unread: messages.filter((m) => m.from === u.id && m.to === meId && !m.read).length,
        };
      })
      .sort((a, b) => {
        const aUnread = a.unread > 0 ? 1 : 0;
        const bUnread = b.unread > 0 ? 1 : 0;
        if (aUnread !== bUnread) return bUnread - aUnread;
        const at = a.last ? sortKey(a.last) : '';
        const bt = b.last ? sortKey(b.last) : '';
        return bt.localeCompare(at);
      });
  }, [users, messages, meId, query]);

  const conversation = useMemo(() => {
    if (!activePeerId) return [];
    const key = convKey(meId, activePeerId);
    return messages.filter((m) => m.conv === key).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  }, [messages, activePeerId, meId]);

  const activePeer = activePeerId ? usersById[activePeerId] : null;

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, [conversation.length, activePeerId]);

  const openThread = (peerId) => {
    setActivePeerId(peerId);
    markConversationRead(peerId);
  };

  const handleSend = () => {
    const body = draft.trim();
    if ((!body && !pendingFile) || !activePeerId) return;
    sendMessage(activePeerId, body, pendingFile || undefined);
    setDraft('');
    setPendingFile(null);
  };

  const handlePickFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPendingFile({
      name: file.name,
      size: file.size,
      type: file.type || 'file',
    });
    e.target.value = '';
  };

  const panel = dark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-white/80';
  const heading = dark ? 'text-zinc-200' : 'text-zinc-800';
  const muted = dark ? 'text-zinc-500' : 'text-zinc-500';
  const border = dark ? 'border-zinc-800' : 'border-zinc-200';
  const rowHover = dark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50';
  const inputBg = dark
    ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500 focus:border-violet-500'
    : 'border-zinc-300 bg-white text-zinc-800 placeholder-zinc-400 focus:border-violet-500';

  const renderAvatar = (u, size = 'h-9 w-9', cls = '') => (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-xl text-xs font-bold ${cls} ${
        u?.role === 'dev'
          ? 'bg-gradient-to-tr from-amber-500 to-orange-400 text-white'
          : 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white'
      }`}
    >
      {initials(u?.name)}
    </span>
  );

  const groups = useMemo(() => {
    const map = new Map();
    conversation.forEach((m) => {
      const key = fmtGroupLabel(m.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    });
    return [...map.entries()];
  }, [conversation]);

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl min-h-0 gap-4 px-4 py-4 sm:px-6">
      {/* Directory */}
      <aside className={`${activePeerId ? 'hidden' : 'flex'} w-full shrink-0 flex-col overflow-hidden rounded-2xl border ${panel} sm:flex sm:w-72`}>
        <div className={`border-b p-3 ${border}`}>
          <h2 className={`text-sm font-bold ${heading}`}>Chat</h2>
          <p className={`mt-0.5 text-[11px] ${muted}`}>Direct messages — PM & developers</p>
          <div className="relative mt-2.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teammates..."
              className={`w-full rounded-xl border pl-8 pr-2 py-1.5 text-xs outline-none ${inputBg}`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {directory.length > 0 ? (
            directory.map(({ user, last, unread }) => {
              const active = activePeerId === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => openThread(user.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                    active
                      ? dark
                        ? 'border-zinc-600 bg-zinc-800 ring-1 ring-zinc-700'
                        : 'border-zinc-900 bg-zinc-100 ring-1 ring-zinc-200'
                      : `${border} ${rowHover}`
                  }`}
                >
                  <span className="relative">
                    {renderAvatar(user, 'h-9 w-9')}
                    {unread > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[9px] font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-xs font-semibold ${heading}`}>{user.name}</span>
                      <span className={`shrink-0 text-[10px] tabular-nums ${muted}`}>
                        {last ? fmtGroupLabel(last.date) : ''}
                      </span>
                    </div>
                    <span className={`block truncate text-[10px] ${muted}`}>{user.title}</span>
                    <span className={`mt-0.5 flex items-center gap-1 truncate text-[10px] ${muted}`}>
                      {last && last.attachment && <Paperclip className="h-3 w-3 shrink-0" />}
                      <span className="min-w-0 truncate">
                        {last ? last.text || (last.attachment ? last.attachment.name : 'No messages yet') : 'No messages yet'}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className={`py-8 text-center text-xs ${muted}`}>No teammates match your search.</div>
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className={`${activePeerId ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border ${panel} sm:flex`}>
        {activePeer ? (
          <>
            <div className={`flex items-center gap-3 border-b p-3 ${border}`}>
              <button
                onClick={() => setActivePeerId(null)}
                title="Back to chats"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors cursor-pointer sm:hidden ${
                  dark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {renderAvatar(activePeer)}
              <div className="min-w-0">
                <span className={`block truncate text-sm font-bold ${heading}`}>{activePeer.name}</span>
                <span className={`block truncate text-[11px] ${muted}`}>{activePeer.title}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {conversation.length > 0 ? (
                groups.map(([label, items]) => (
                  <div key={label}>
                    <div className={`mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>
                      {label}
                      <span className={`h-px flex-1 ${border}`} />
                    </div>
                    <div className="space-y-2.5">
                      {items.map((m) => {
                        const mine = m.from === meId;
                        return (
                          <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] sm:max-w-[60%]`}>
                              <div
                                className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                                  mine
                                    ? 'rounded-br-md bg-violet-600 text-white'
                                    : dark
                                      ? 'rounded-bl-md bg-zinc-800 text-zinc-100'
                                      : 'rounded-bl-md bg-zinc-200 text-zinc-800'
                                }`}
                              >
                                {m.attachment && (
                                  <AttachmentChip attachment={m.attachment} mine={mine} dark={dark} />
                                )}
                                {m.text && <p className={m.attachment ? 'mt-1.5' : ''}>{m.text}</p>}
                              </div>
                              <span className={`mt-1 block text-[10px] tabular-nums ${muted} ${mine ? 'text-right' : ''}`}>
                                {m.time || ''}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className={`flex h-full flex-col items-center justify-center gap-2 ${muted}`}>
                  <MessageSquare className="h-10 w-10" />
                  <p className="text-sm font-semibold">No messages yet</p>
                  <p className="text-xs">Say hi to {activePeer.name.split(' ')[0]}!</p>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className={`border-t p-3 ${border}`}>
              {pendingFile && (
                <div className={`mb-2 flex items-center gap-2 rounded-xl border px-2.5 py-2 ${border}`}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-500">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className={`block truncate text-xs font-medium ${heading}`}>{pendingFile.name}</span>
                    <span className={`block text-[10px] ${muted}`}>{fmtSize(pendingFile.size)}</span>
                  </div>
                  <button
                    onClick={() => setPendingFile(null)}
                    title="Remove attachment"
                    className={`rounded-md p-1 transition-colors cursor-pointer ${dark ? 'text-zinc-400 hover:text-red-400' : 'text-zinc-500 hover:text-red-500'}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" onChange={handlePickFile} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach a file"
                  className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                    dark
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                      : 'bg-zinc-200 text-zinc-700 border-zinc-300 hover:bg-zinc-300'
                  }`}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder={
                    pendingFile
                      ? 'Add a caption...'
                      : `Message ${activePeer.name.split(' ')[0]}... or attach a file`
                  }
                  className={`max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-sm outline-none ${inputBg}`}
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() && !pendingFile}
                  title="Send"
                  className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/30 transition-all hover:bg-violet-500 disabled:opacity-40 cursor-pointer active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={`flex h-full flex-col items-center justify-center gap-3 p-6 text-center ${muted}`}>
            <MessageSquare className="h-12 w-12 text-violet-500/80" />
            <p className="text-base font-semibold">Team Chat</p>
            <p className="max-w-xs text-xs">
              Select a teammate from the directory to start a 1:1 conversation.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}