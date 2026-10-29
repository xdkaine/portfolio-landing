"use client";
import { useCmsConfirm } from "./CmsConfirm";
import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, CheckCheck, Mail, Search } from "lucide-react";
import type { ContactMsg } from "@/lib/adminDashboardData";
import type { MessageStatus } from "@/lib/cmsRules";
type InboxData = {
  items: ContactMsg[];
  total: number;
  unread: number;
  active: number;
  page: number;
  pages: number;
};
const EMPTY: InboxData = {
  items: [],
  total: 0,
  unread: 0,
  active: 0,
  page: 1,
  pages: 1,
};
export function AdminInbox({
  onChanged,
  onDirtyChange,
}: {
  onChanged: () => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { confirm, confirmation } = useCmsConfirm();
  const [data, setData] = useState(EMPTY);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const sequence = useRef(0);
  const active = data.items.find((item) => item.id === activeId);
  const dirtyNote = Boolean(active && note !== active.note);
  useEffect(() => {
    onDirtyChange(dirtyNote);
    const warn = (event: BeforeUnloadEvent) => {
      if (dirtyNote) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      onDirtyChange(false);
    };
  }, [dirtyNote, onDirtyChange]);
  const load = useCallback(async () => {
    const requestId = ++sequence.current;
    setLoading(true);
    try {
      const response = await fetch(
        `/v1/api/admin/messages?${new URLSearchParams({ q: query, status, page: String(page) })}`,
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Your session expired. Sign in again."
            : "Inbox could not be loaded. Try again.",
        );
      const payload = (await response.json()) as InboxData;
      if (requestId !== sequence.current) return;
      setData(payload);
      setSelected([]);
    } catch (error) {
      if (requestId === sequence.current)
        setNotice(
          error instanceof Error ? error.message : "Inbox unavailable.",
        );
    } finally {
      if (requestId === sequence.current) setLoading(false);
    }
  }, [query, status, page]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => {
      clearTimeout(timer);
      sequence.current += 1;
    };
  }, [load]);
  const update = async (
    ids: string[],
    changes: { status?: MessageStatus; read?: boolean; note?: string },
  ) => {
    if (busy || !ids.length) return;
    if (
      dirtyNote &&
      active &&
      ids.includes(active.id) &&
      changes.note === undefined &&
      !(await confirm({
        title: "Discard unsaved internal note?",
        description:
          "Save the note first to preserve your edits, or discard it to continue with this action.",
        confirmLabel: "Discard note",
      }))
    )
      return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/v1/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: data.items
            .filter((item) => ids.includes(item.id))
            .map(({ id, version }) => ({ id, version })),
          changes,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Update failed.");
      setNotice(
        `${ids.length === 1 ? "Message" : `${ids.length} messages`} updated.`,
      );
      await load();
      await onChanged();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Network error. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const open = async (item: ContactMsg) => {
    if (
      active &&
      note !== active.note &&
      !(await confirm({
        title: "Discard unsaved note?",
        description:
          "Save this internal note before opening another message, or discard these changes.",
        confirmLabel: "Discard note",
      }))
    )
      return;
    setActiveId(item.id);
    setNote(item.note ?? "");
  };
  return (
    <div className="cms-inbox">
      {confirmation}
      <div className="cms-toolbar">
        <label className="cms-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Search inbox"
            placeholder="Search name, email or message"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          aria-label="Filter messages"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
            setActiveId(null);
          }}
        >
          <option value="ALL">Active inbox</option>
          <option value="UNREAD">Unread</option>
          <option value="NEW">New</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button
          className="cms-button"
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh inbox
        </button>
      </div>
      <div className="cms-muted cms-row-between">
        <span>
          {data.total} results · {data.unread} unread
        </span>
        <span>
          Page {data.page} of {data.pages}
        </span>
      </div>
      {notice && (
        <p className="cms-notice" role="status">
          {notice}
        </p>
      )}
      {selected.length > 0 && (
        <div className="cms-bulk" aria-label="Selected message actions">
          <strong>{selected.length} selected</strong>
          <button
            disabled={busy}
            onClick={() => void update(selected, { read: true })}
          >
            Mark read
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void update(selected, { status: "RESOLVED", read: true })
            }
          >
            Resolve
          </button>
          <button
            disabled={busy}
            onClick={() => void update(selected, { status: "ARCHIVED" })}
          >
            Archive
          </button>
        </div>
      )}
      <div className="cms-inbox-grid" aria-busy={loading}>
        <div className="cms-message-list">
          <label className="cms-select-all">
            <input
              type="checkbox"
              aria-label="Select all messages on this page"
              checked={
                data.items.length > 0 && selected.length === data.items.length
              }
              onChange={(event) =>
                setSelected(
                  event.target.checked ? data.items.map((item) => item.id) : [],
                )
              }
            />
            Select page
          </label>
          {data.items.map((item) => (
            <div
              key={item.id}
              className={`cms-message-row ${item.id === activeId ? "is-active" : ""}`}
            >
              <input
                type="checkbox"
                aria-label={`Select message from ${item.name}`}
                checked={selected.includes(item.id)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, item.id]
                      : current.filter((id) => id !== item.id),
                  )
                }
              />
              <button
                className="cms-message-open"
                onClick={() => void open(item)}
                aria-pressed={item.id === activeId}
              >
                <span className="cms-row-between">
                  <strong>
                    {!item.read && (
                      <span className="cms-unread" aria-label="Unread" />
                    )}
                    {item.name}
                  </strong>
                  <time>{new Date(item.createdAt).toLocaleDateString()}</time>
                </span>
                <span className="cms-message-excerpt">{item.message}</span>
                <span className="cms-status">{item.status}</span>
              </button>
            </div>
          ))}
          {!loading && !data.items.length && (
            <div className="cms-empty">
              <Mail aria-hidden="true" />
              <h3>No messages here</h3>
              <p>Try another search or inbox filter.</p>
            </div>
          )}
          <div className="cms-pagination">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button
              disabled={page >= data.pages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
        <div className="cms-message-detail">
          {active ? (
            <>
              <div className="cms-row-between">
                <span className="cms-eyebrow">CONTACT MESSAGE</span>
                <span className="cms-status">{active.status}</span>
              </div>
              <h2>{active.name}</h2>
              <a
                className="cms-contact-address"
                href={`mailto:${active.email}`}
              >
                {active.email}
              </a>
              <p className="cms-muted">
                Received {new Date(active.createdAt).toLocaleString()}
              </p>
              <p className="cms-message-body">{active.message}</p>
              <div className="cms-toolbar cms-wrap">
                <button
                  className="cms-button"
                  disabled={busy}
                  onClick={() =>
                    void update([active.id], {
                      read: !active.read,
                      ...(active.status === "NEW" && !active.read
                        ? { status: "OPEN" }
                        : {}),
                    })
                  }
                >
                  <Mail size={15} />
                  Mark {active.read ? "unread" : "read"}
                </button>
                <button
                  className="cms-button"
                  disabled={busy}
                  onClick={() =>
                    void update([active.id], {
                      status:
                        active.status === "RESOLVED" ? "OPEN" : "RESOLVED",
                      read: true,
                    })
                  }
                >
                  <CheckCheck size={15} />
                  {active.status === "RESOLVED" ? "Reopen" : "Resolve"}
                </button>
                <button
                  className="cms-button"
                  disabled={busy}
                  onClick={() =>
                    void update([active.id], {
                      status:
                        active.status === "ARCHIVED" ? "OPEN" : "ARCHIVED",
                    })
                  }
                >
                  <Archive size={15} />
                  {active.status === "ARCHIVED"
                    ? "Restore to inbox"
                    : "Archive"}
                </button>
                <a
                  className="cms-button cms-primary"
                  href={`mailto:${active.email}?subject=${encodeURIComponent("Re: Your message via phao.dev")}`}
                >
                  Compose email
                </a>
              </div>
              <p className="cms-muted">
                Compose email opens your email app. Resolved records stay in the
                inbox until archived.
              </p>
              <label className="cms-note">
                Internal note
                <textarea
                  maxLength={4000}
                  rows={5}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              <div className="cms-row-between">
                <span className="cms-muted">
                  Visible to administrators · {note.length}/4,000
                </span>
                <button
                  className="cms-button"
                  disabled={busy || note === active.note}
                  onClick={() => void update([active.id], { note })}
                >
                  Save note
                </button>
              </div>
            </>
          ) : (
            <div className="cms-empty">
              <Mail size={30} aria-hidden="true" />
              <h2>Your conversations, organized</h2>
              <p>Select a message to read, add a note, or update its status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
