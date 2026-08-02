"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, MessageSquare, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { clientApi } from "@/lib/api-client";
import { cn, initials } from "@/lib/utils";

type Author = { id: string; name: string; image: string | null; role: string };
type Reply = {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
};
type Post = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  author: Author;
  _count: { replies: number };
};

export function CommunityFeed({ initialPosts }: { initialPosts?: Post[] }) {
  const t = useTranslations("community");
  const tc = useTranslations("common");

  const [posts, setPosts] = useState<Post[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(!initialPosts);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [loadingReply, setLoadingReply] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (initialPosts) return;
    clientApi<{ posts: Post[] }>("/api/community")
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [initialPosts]);

  async function toggleReplies(postId: string) {
    if (expanded[postId]) {
      setExpanded((p) => ({ ...p, [postId]: false }));
      return;
    }
    if (!replies[postId]) {
      try {
        const data = await clientApi<{ post: { replies: Reply[] } }>(
          `/api/community/${postId}`
        );
        setReplies((p) => ({ ...p, [postId]: data.post.replies }));
      } catch {
        /* silent */
      }
    }
    setExpanded((p) => ({ ...p, [postId]: true }));
  }

  async function submitReply(postId: string) {
    const body = replyDraft[postId]?.trim();
    if (!body) return;
    setLoadingReply(postId);
    try {
      const data = await clientApi<{ reply: Reply }>(`/api/community/${postId}`, {
        method: "POST",
        json: { body },
      });
      setReplies((p) => ({
        ...p,
        [postId]: [...(p[postId] ?? []), data.reply],
      }));
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, _count: { replies: post._count.replies + 1 } }
            : post
        )
      );
      setReplyDraft((p) => ({ ...p, [postId]: "" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoadingReply(null);
    }
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const data = await clientApi<{ post: Post }>("/api/community", {
        method: "POST",
        json: { title: newTitle, body: newBody },
      });
      setPosts((prev) => [data.post, ...prev]);
      setShowNew(false);
      setNewTitle("");
      setNewBody("");
      toast.success(t("newPost"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  function timeAgo(iso: string) {
    if (!mounted) {
      return new Date(iso).toISOString().slice(0, 10);
    }
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  if (loading) {
    return <div className="card p-12 text-center text-muted">{tc("loading")}</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex justify-end">
        <button type="button" className="btn btn-primary" onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" />
          {t("newPost")}
        </button>
      </div>

      {showNew && (
        <form onSubmit={createPost} className="card space-y-4 p-6">
          <div>
            <label className="label">{t("postTitle")}</label>
            <input
              className="input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">{t("postBody")}</label>
            <textarea
              className="input min-h-[100px]"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? tc("loading") : tc("publish")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowNew(false)}>
              {tc("cancel")}
            </button>
          </div>
        </form>
      )}

      {posts.length === 0 ? (
        <div className="card p-12 text-center text-muted">{t("noPosts")}</div>
      ) : (
        posts.map((post) => (
          <article key={post.id} className="card overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {initials(post.author.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="font-semibold text-foreground">{post.author.name}</span>
                    <span>·</span>
                    <span>{timeAgo(post.createdAt)}</span>
                    <span className="rounded bg-primary-soft px-1.5 py-0.5 text-primary">
                      {post.author.role}
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-bold">{post.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{post.body}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleReplies(post.id)}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <MessageSquare className="h-4 w-4" />
                {t("replies", { count: post._count.replies })}
                {expanded[post.id] ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {expanded[post.id] && (
              <div className="border-t border-border bg-gray-50/50 p-5 space-y-4">
                {(replies[post.id] ?? []).map((r) => (
                  <div key={r.id} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold">
                      {initials(r.author.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">
                        {r.author.name}{" "}
                        <span className="font-normal text-muted">{timeAgo(r.createdAt)}</span>
                      </p>
                      <p className="mt-1 text-sm">{r.body}</p>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    className="input text-sm"
                    placeholder={t("reply")}
                    value={replyDraft[post.id] ?? ""}
                    onChange={(e) =>
                      setReplyDraft((p) => ({ ...p, [post.id]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && submitReply(post.id)}
                  />
                  <button
                    type="button"
                    className={cn("btn btn-primary shrink-0 text-sm")}
                    disabled={loadingReply === post.id}
                    onClick={() => submitReply(post.id)}
                  >
                    {t("reply")}
                  </button>
                </div>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}
