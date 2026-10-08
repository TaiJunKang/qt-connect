import { useEffect, useState, useCallback } from "react";
import { MessageCircle, EyeOff, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getDateKey, parseDateKey } from "@/lib/date";
import LikeButton from "./LikeButton";
import CommentSection from "./CommentSection";
import UserAvatar from "../UserAvatar";

export type FeedRange = "today" | "week";

interface SharedLog {
  id: string;
  user_id: string | null;
  user_name: string;
  avatar_url: string | null;
  date: string;
  meditation: string;
  application: string;
  created_at: string;
  is_anonymous: boolean;
  is_mine: boolean;
  like_count: number;
  comment_count: number;
  liked: boolean;
}

interface MeditationShareProps {
  userId: string;
  userDisplayName: string;
  range: FeedRange;
  onCount?: (n: number) => void;
}

function LogCard({ log, userId, userDisplayName, showDate, onChange }: {
  log: SharedLog; userId: string; userDisplayName: string; showDate: boolean; onChange: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const { toast } = useToast();
  const time = new Date(log.created_at).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  const day = parseDateKey(log.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short" });
  const anonymous = log.is_anonymous && !log.is_mine;
  const name = anonymous ? "익명의 지체" : log.user_name || "이름 없음";

  const hide = async () => {
    if (!confirm("이 묵상을 나눔에서 내릴까요? 내 기록과 참여 일수는 그대로 남아요.")) return;
    const { error } = await supabase.from("qt_logs").update({ is_public: false }).eq("id", log.id);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "나눔에서 내렸어요" });
    onChange();
  };

  const long = (log.meditation?.length ?? 0) + (log.application?.length ?? 0) > 180;

  return (
    <article className="rounded-[20px] bg-card border border-border p-[18px] space-y-3">
      <div className="flex items-center gap-2.5">
        {anonymous ? (
          <div className="w-9 h-9 rounded-full bg-secondary text-muted-foreground flex items-center justify-center flex-shrink-0">
            <UserRound className="w-[18px] h-[18px]" />
          </div>
        ) : (
          <UserAvatar name={name} avatarUrl={log.avatar_url} size="md" className="!w-9 !h-9" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold truncate">
            {name}
            {log.is_mine && log.is_anonymous && <span className="ml-1.5 text-[12px] font-medium text-muted-foreground">(익명으로 나눔)</span>}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {showDate ? `${day} · ` : ""}{time}{anonymous ? " · 익명 공개" : ""}
          </p>
        </div>
        {log.is_mine && (
          <button
            onClick={hide}
            aria-label="나눔에서 내리기"
            className="w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className={`space-y-2.5 ${!expanded && long ? "max-h-[168px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]" : ""}`}>
        {log.meditation && <p className="text-[15px] leading-[1.75] text-foreground/85 whitespace-pre-line">{log.meditation}</p>}
        {log.application && (
          <p className="text-[15px] leading-[1.75] text-foreground/85 whitespace-pre-line">
            <span className="text-[12px] font-bold text-primary mr-1.5">적용</span>{log.application}
          </p>
        )}
      </div>
      {long && (
        <button onClick={() => setExpanded((v) => !v)} className="text-[13px] font-semibold text-primary">
          {expanded ? "접기" : "더 보기"}
        </button>
      )}

      <div className="flex gap-2">
        <LikeButton contentType="qt_log" contentId={log.id} userId={userId} count={log.like_count} hasLiked={log.liked} />
        <button
          onClick={() => setCommentsOpen((v) => !v)}
          aria-expanded={commentsOpen}
          className={`flex items-center gap-1.5 h-[34px] px-3 rounded-full text-[13px] transition-colors ${
            commentsOpen ? "bg-foreground text-background font-bold" : "bg-secondary text-foreground/80 font-medium hover:bg-secondary/70"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          댓글{log.comment_count > 0 && ` ${log.comment_count}`}
        </button>
      </div>

      {commentsOpen && (
        <CommentSection contentType="qt_log" contentId={log.id} userId={userId} userDisplayName={userDisplayName} />
      )}
    </article>
  );
}

export default function MeditationShare({ userId, userDisplayName, range, onCount }: MeditationShareProps) {
  const [logs, setLogs] = useState<SharedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const fetchLogs = useCallback(async () => {
    const today = new Date();
    const to = getDateKey(today);
    const from = range === "today" ? to : getDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
    setLoading(true);
    const { data, error } = await supabase.rpc("get_shared_logs", { p_from: from, p_to: to });
    setFailed(!!error);
    setLogs(error ? [] : (data ?? []).map((r) => ({ ...r, like_count: Number(r.like_count), comment_count: Number(r.comment_count) })));
    setLoading(false);
  }, [range]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { onCount?.(logs.length); }, [logs, onCount]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-[20px] bg-card border border-border animate-pulse" />)}
      </div>
    );
  }

  if (failed || logs.length === 0) {
    return (
      <div className="rounded-[20px] bg-card border border-border py-14 px-6 text-center">
        <p className="text-[14px] font-medium text-foreground/80">
          {failed ? "나눔을 불러오지 못했어요" : range === "today" ? "아직 오늘 나눈 묵상이 없어요" : "이번 주 나눈 묵상이 없어요"}
        </p>
        <p className="text-[13px] text-muted-foreground mt-1">
          {failed ? "잠시 후 다시 시도해주세요." : "큐티를 쓰고 첫 번째로 나눠보세요."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <LogCard key={log.id} log={log} userId={userId} userDisplayName={userDisplayName} showDate={range === "week"} onChange={fetchLogs} />
      ))}
    </div>
  );
}
