"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Send, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Pagination, type PaginationMeta } from "@/components/ui/pagination";
import { clientApi } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { cn, initials } from "@/lib/utils";

type User = { id: string; name: string; image: string | null; role: string };
type Message = {
  id: string;
  body: string;
  createdAt: string;
  sender: User;
};
type Conversation = {
  id: string;
  updatedAt: string;
  members: User[];
  lastMessage: Message | null;
};

const emptyPagination: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

export function Inbox() {
  const t = useTranslations("messages");
  const tc = useTranslations("common");
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convPage, setConvPage] = useState(1);
  const [convPagination, setConvPagination] =
    useState<PaginationMeta>(emptyPagination);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgPage, setMsgPage] = useState(1);
  const [msgPagination, setMsgPagination] =
    useState<PaginationMeta>(emptyPagination);
  const [compose, setCompose] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [newBody, setNewBody] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  const loadConversations = useCallback(async (page: number) => {
    try {
      const data = await clientApi<{
        conversations: Conversation[];
        pagination: PaginationMeta;
      }>(`/api/messages?page=${page}&limit=20`);
      setConversations(data.conversations ?? []);
      setConvPagination(data.pagination ?? emptyPagination);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clientApi<{ users: User[] }>("/api/users?page=1&limit=100")
      .then((d) => setUsers(d.users ?? []))
      .catch(() => undefined);
  }, []);

  const loadThread = useCallback(async (id: string, page: number) => {
    try {
      const data = await clientApi<{
        messages: Message[];
        pagination: PaginationMeta;
      }>(`/api/messages/${id}?page=${page}&limit=50`);
      setMessages(data.messages ?? []);
      setMsgPagination(data.pagination ?? emptyPagination);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadConversations(convPage);
  }, [loadConversations, convPage]);

  useEffect(() => {
    if (selectedId) loadThread(selectedId, msgPage);
  }, [selectedId, msgPage, loadThread]);

  function selectConversation(id: string) {
    setSelectedId(id);
    setMsgPage(1);
  }

  function otherMember(conv: Conversation) {
    return conv.members.find((m) => m.id !== user?.id) ?? conv.members[0];
  }

  async function sendReply() {
    if (!selectedId || !compose.trim()) return;
    setSending(true);
    try {
      const data = await clientApi<{ message: Message }>(
        `/api/messages/${selectedId}`,
        {
          method: "POST",
          json: { body: compose.trim() },
        }
      );
      setMessages((prev) => [...prev, data.message]);
      setCompose("");
      loadConversations(convPage);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSending(false);
    }
  }

  async function sendNew() {
    if (!recipientId.trim() || !newBody.trim()) return;
    setSending(true);
    try {
      const data = await clientApi<{ conversation: { id: string } }>(
        "/api/messages",
        {
          method: "POST",
          json: { recipientId: recipientId.trim(), body: newBody.trim() },
        }
      );
      toast.success(t("send"));
      setShowNew(false);
      setRecipientId("");
      setNewBody("");
      setConvPage(1);
      await loadConversations(1);
      selectConversation(data.conversation.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="card p-12 text-center text-muted">{tc("loading")}</div>;
  }

  return (
    <div className="card flex h-[calc(100vh-12rem)] min-h-[480px] overflow-hidden">
      <aside className="flex w-full max-w-xs flex-col border-e border-border">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-bold">{t("inbox")}</h2>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded-lg p-2 text-primary hover:bg-primary-soft"
            title={t("new")}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {showNew && (
          <div className="border-b border-border bg-primary-soft/30 p-4 space-y-2">
            <label className="label text-xs">{t("to")}</label>
            <select
              className="input text-sm"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
            >
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
            <textarea
              className="input min-h-[60px] text-sm"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder={t("compose")}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary text-xs"
                disabled={sending}
                onClick={sendNew}
              >
                {t("send")}
              </button>
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => setShowNew(false)}
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted">{t("noConversations")}</p>
          ) : (
            conversations.map((conv) => {
              const other = otherMember(conv);
              const active = selectedId === conv.id;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => selectConversation(conv.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-start transition",
                    active ? "bg-primary-soft" : "hover:bg-gray-50"
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {initials(other?.name ?? "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{other?.name}</p>
                    <p className="truncate text-xs text-muted">
                      {conv.lastMessage?.body ?? "—"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
        {convPagination.totalPages > 1 && (
          <div className="border-t border-border p-2">
            <Pagination
              pagination={convPagination}
              onPageChange={setConvPage}
              className="mt-0"
            />
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {selectedId ? (
          <>
            {msgPagination.totalPages > 1 && (
              <div className="border-b border-border px-4 py-2">
                <Pagination
                  pagination={msgPagination}
                  onPageChange={setMsgPage}
                  className="mt-0"
                />
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => {
                const mine = m.sender.id === user?.id;
                return (
                  <div
                    key={m.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                        mine
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-foreground"
                      )}
                    >
                      {!mine && (
                        <p className="mb-0.5 text-xs font-semibold opacity-70">
                          {m.sender.name}
                        </p>
                      )}
                      {m.body}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 border-t border-border p-4">
              <input
                className="input"
                value={compose}
                onChange={(e) => setCompose(e.target.value)}
                placeholder={t("compose")}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
              />
              <button
                type="button"
                className="btn btn-primary shrink-0"
                disabled={sending || !compose.trim()}
                onClick={sendReply}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted">
            {t("noConversations")}
          </div>
        )}
      </div>
    </div>
  );
}
