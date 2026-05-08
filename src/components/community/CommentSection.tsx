import { useEffect, useState, useCallback } from "react";
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "../UserAvatar";

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  content: string;
  is_anonymous: boolean;
  created_at: string;
}

interface CommentSectionProps {
  contentType: "qt_log" | "prayer_request";
  contentId: string;
  userId: string;
  userDisplayName: string;
}

function formatRelativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

export default function CommentSection({ contentType, contentId, userId, userDisplayName }: CommentSectionProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("id, user_id, user_name, content, is_anonymous, created_at")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .order("created_at", { ascending: true });
    if (!error && data && data.length > 0) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, avatar_url")
        .in("user_id", userIds);
      const avatarMap = new Map<string, string | null>();
      for (const p of profiles ?? []) avatarMap.set(p.user_id, p.avatar_url);
      setComments(data.map((c) => ({ ...c, avatar_url: avatarMap.get(c.user_id) ?? null })));
    } else {
      setComments([]);
    }
    setLoading(false);
  }, [contentType, contentId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        content_type: contentType,
        content_id: contentId,
        user_id: userId,
        user_name: userDisplayName,
        content: body,
      });
      if (error) throw error;
      setText("");
      fetchComments();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "댓글 작성 실패";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("댓글을 삭제할까요?")) return;
    try {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
      fetchComments();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "삭제 실패";
      toast({ title: msg, variant: "destructive" });
    }
  };

  return (
    <div className="border-t border-border/30 pt-3 mt-2 space-y-3">
      {/* Comment list */}
      {loading ? (
        <div className="h-8 rounded-lg bg-muted/40 animate-pulse" />
      ) : comments.length > 0 ? (
        <div className="space-y-2.5">
          {comments.map((c) => {
            const name = c.is_anonymous ? "익명" : (c.user_name || "익명");
            const isOwner = c.user_id === userId;

            return (
              <div key={c.id} className="flex items-start gap-2">
                <UserAvatar name={name} avatarUrl={c.is_anonymous ? null : c.avatar_url} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-[12px] font-semibold text-foreground">{name}</span>
                    <span className="text-[10px] text-muted-foreground/50">{formatRelativeTime(c.created_at)}</span>
                    {isOwner && (
                      <button
                        onClick={() => remove(c.id)}
                        className="ml-auto text-muted-foreground/40 hover:text-destructive transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-[12.5px] text-foreground/80 leading-[1.6] whitespace-pre-line break-words">
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground/50 text-center py-1">
          <MessageCircle className="w-3 h-3 inline mr-1" />
          첫 댓글을 남겨보세요
        </p>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="따뜻한 한마디를 남겨보세요..."
          className="min-h-[40px] max-h-[100px] resize-none text-[12.5px] leading-relaxed py-2 flex-1"
          maxLength={300}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          onClick={submit}
          disabled={submitting || !text.trim()}
          className="w-9 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
