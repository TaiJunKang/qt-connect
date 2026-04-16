import { useEffect, useState, useCallback } from "react";
import { Users, RefreshCw, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAvatarColor } from "./avatar";
import LikeButton from "./LikeButton";
import CommentSection from "./CommentSection";

function getTodayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

interface QTLog {
  id: string;
  user_name: string;
  meditation: string;
  application: string;
  created_at: string;
  like_count: number;
  has_liked: boolean;
  comment_count: number;
}

interface MeditationShareProps {
  userId: string;
  userDisplayName: string;
}

function LogCard({ log, userId, userDisplayName, onChange }: { log: QTLog; userId: string; userDisplayName: string; onChange: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const initial = log.user_name?.charAt(0) || "?";
  const time = new Date(log.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const avatarColor = getAvatarColor(log.user_name || "");

  const meditationLong = (log.meditation?.length ?? 0) > 120;
  const applicationLong = (log.application?.length ?? 0) > 100;
  const hasMore = meditationLong || applicationLong;

  return (
    <div className="rounded-2xl bg-card border border-border/40 shadow-card overflow-hidden hover:shadow-soft transition-shadow duration-200">
      <div className="px-5 pt-4 pb-4">
        {/* Author row */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-xs`}>
            {initial}
          </div>
          <span className="text-[13px] font-semibold text-foreground flex-1">{log.user_name || "익명"}</span>
          <span className="text-[10px] text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-md">{time}</span>
        </div>

        <div className="space-y-3">
          {log.meditation && (
            <div>
              <p className="text-[10px] font-bold text-primary/50 tracking-[0.15em] uppercase mb-1">묵상</p>
              <p className={`text-[13px] text-foreground/80 leading-[1.75] ${!expanded && meditationLong ? "line-clamp-4" : ""}`}>
                {log.meditation}
              </p>
            </div>
          )}
          {log.application && (
            <div>
              <p className="text-[10px] font-bold text-primary/50 tracking-[0.15em] uppercase mb-1">적용</p>
              <p className={`text-[13px] text-foreground/80 leading-[1.75] ${!expanded && applicationLong ? "line-clamp-3" : ""}`}>
                {log.application}
              </p>
            </div>
          )}
        </div>

        {hasMore && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-[12px] font-medium text-primary/70 hover:text-primary transition-colors"
          >
            {expanded ? "접기 ▲" : "더 보기 ▼"}
          </button>
        )}

        {/* Engagement row */}
        <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border/30">
          <LikeButton
            contentType="qt_log"
            contentId={log.id}
            userId={userId}
            count={log.like_count}
            hasLiked={log.has_liked}
            onChange={onChange}
            size="sm"
          />
          <button
            onClick={() => setCommentsOpen((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
              commentsOpen
                ? "bg-primary/8 text-primary border-primary/20"
                : "bg-muted/50 text-muted-foreground hover:bg-accent/50 border-transparent"
            }`}
          >
            <MessageCircle className="w-3 h-3" />
            {log.comment_count > 0 && <span>{log.comment_count}</span>}
          </button>
        </div>

        {/* Comments */}
        {commentsOpen && (
          <CommentSection
            contentType="qt_log"
            contentId={log.id}
            userId={userId}
            userDisplayName={userDisplayName}
          />
        )}
      </div>
    </div>
  );
}

export default function MeditationShare({ userId, userDisplayName }: MeditationShareProps) {
  const [logs, setLogs] = useState<QTLog[]>([]);
  const [loading, setLoading] = useState(true);
  const todayKey = getTodayKey();

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    // 1. Fetch public QT logs for today
    const { data: logData } = await supabase
      .from("qt_logs")
      .select("id, user_name, meditation, application, created_at")
      .eq("date", todayKey)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (!logData) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const logIds = logData.map((l) => l.id);

    // 2. Fetch likes
    let likes: { content_id: string; user_id: string }[] = [];
    let comments: { content_id: string }[] = [];
    if (logIds.length > 0) {
      const [likesRes, commentsRes] = await Promise.all([
        supabase.from("likes").select("content_id, user_id").eq("content_type", "qt_log").in("content_id", logIds),
        supabase.from("comments").select("content_id").eq("content_type", "qt_log").in("content_id", logIds),
      ]);
      likes = likesRes.data ?? [];
      comments = commentsRes.data ?? [];
    }

    // 3. Aggregate
    const likeCount = new Map<string, number>();
    const myLiked = new Set<string>();
    const commentCount = new Map<string, number>();
    for (const l of likes) {
      likeCount.set(l.content_id, (likeCount.get(l.content_id) ?? 0) + 1);
      if (l.user_id === userId) myLiked.add(l.content_id);
    }
    for (const c of comments) {
      commentCount.set(c.content_id, (commentCount.get(c.content_id) ?? 0) + 1);
    }

    setLogs(
      logData.map((l) => ({
        ...l,
        like_count: likeCount.get(l.id) ?? 0,
        has_liked: myLiked.has(l.id),
        comment_count: commentCount.get(l.id) ?? 0,
      }))
    );
    setLoading(false);
  }, [todayKey, userId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={fetchLogs}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent border border-border/40 transition-all shadow-xs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
            <Users className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">아직 공유된 나눔이 없어요</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">큐티를 작성하고 공동체와 나눠보세요 🙏</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <LogCard
              key={log.id}
              log={log}
              userId={userId}
              userDisplayName={userDisplayName}
              onChange={fetchLogs}
            />
          ))}
        </div>
      )}
    </div>
  );
}
