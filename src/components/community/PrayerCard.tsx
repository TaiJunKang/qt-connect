import { useState } from "react";
import { HandHeart, Sparkles, Check, Trash2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAvatarColor } from "./avatar";
import { getCategory } from "./prayer-categories";
import CommentSection from "./CommentSection";

export interface PrayerItem {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  content: string;
  category: string;
  is_anonymous: boolean;
  is_answered: boolean;
  answered_at: string | null;
  created_at: string;
  response_count: number;
  has_prayed: boolean;
  comment_count: number;
}

interface PrayerCardProps {
  prayer: PrayerItem;
  currentUserId: string;
  currentUserName: string;
  onChange: () => void;
}

function formatRelativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

export default function PrayerCard({ prayer, currentUserId, currentUserName, onChange }: PrayerCardProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const category = getCategory(prayer.category);

  const displayName = prayer.is_anonymous ? "익명의 지체" : (prayer.user_name || "익명");
  const initial = prayer.is_anonymous ? "?" : (prayer.user_name?.charAt(0) || "?");
  const avatarColor = prayer.is_anonymous
    ? "from-slate-400 to-slate-500"
    : getAvatarColor(prayer.user_name || "");

  const isOwner = prayer.user_id === currentUserId;

  const togglePrayed = async () => {
    setSubmitting(true);
    try {
      if (prayer.has_prayed) {
        const { error } = await supabase
          .from("prayer_responses")
          .delete()
          .eq("prayer_id", prayer.id)
          .eq("user_id", currentUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("prayer_responses")
          .insert({ prayer_id: prayer.id, user_id: currentUserId });
        if (error) throw error;
      }
      onChange();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "오류가 발생했습니다";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const markAnswered = async () => {
    if (!confirm("이 기도가 응답받으셨다고 표시할까요?")) return;
    try {
      const { error } = await supabase
        .from("prayer_requests")
        .update({
          is_answered: !prayer.is_answered,
          answered_at: prayer.is_answered ? null : new Date().toISOString(),
        })
        .eq("id", prayer.id);
      if (error) throw error;
      onChange();
      toast({ title: prayer.is_answered ? "응답 표시를 해제했어요" : "🎉 응답받은 기도로 표시했어요" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "오류가 발생했습니다";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const deletePrayer = async () => {
    if (!confirm("이 기도 제목을 삭제할까요?")) return;
    try {
      const { error } = await supabase.from("prayer_requests").delete().eq("id", prayer.id);
      if (error) throw error;
      onChange();
      toast({ title: "기도 제목이 삭제되었어요" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "삭제 실패";
      toast({ title: msg, variant: "destructive" });
    }
  };

  return (
    <div className={`rounded-2xl bg-card border shadow-card overflow-hidden transition-shadow duration-200 hover:shadow-soft ${
      prayer.is_answered ? "border-amber-300/60 bg-gradient-to-br from-amber-50/50 to-card" : "border-border/40"
    }`}>
      <div className="px-5 pt-4 pb-4">
        {/* Top row: avatar, name, time, category */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-xs`}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-foreground truncate">{displayName}</span>
              <span className="text-[10px] text-muted-foreground/50">·</span>
              <span className="text-[10px] text-muted-foreground/60">{formatRelativeTime(prayer.created_at)}</span>
            </div>
          </div>
          <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-md ${category.colorClass} flex-shrink-0`}>
            {category.emoji} {category.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[14px] font-bold text-foreground leading-snug mb-1.5">
          {prayer.is_answered && <span className="text-amber-600 mr-1">✨</span>}
          {prayer.title}
        </h3>

        {/* Content */}
        {prayer.content && (
          <p className="text-[13px] text-foreground/70 leading-[1.7] whitespace-pre-line mb-3">
            {prayer.content}
          </p>
        )}

        {/* Answered note */}
        {prayer.is_answered && prayer.answered_at && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50/80 border border-amber-200/50">
            <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              응답받은 기도입니다
            </p>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
          <button
            onClick={togglePrayed}
            disabled={submitting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              prayer.has_prayed
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20"
            }`}
          >
            <HandHeart className="w-3.5 h-3.5" />
            {prayer.has_prayed ? "기도했어요" : "기도하기"}
          </button>

          <button
            onClick={() => setCommentsOpen((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
              commentsOpen
                ? "bg-primary/8 text-primary border-primary/20"
                : "bg-muted/50 text-muted-foreground hover:bg-accent/50 border-transparent"
            }`}
          >
            <MessageCircle className="w-3 h-3" />
            {prayer.comment_count > 0 && <span>{prayer.comment_count}</span>}
          </button>

          <span className="text-[11px] text-muted-foreground/70 font-medium ml-auto mr-1">
            🙏 {prayer.response_count}명
          </span>

          {isOwner && (
            <div className="flex items-center gap-1">
              <button
                onClick={markAnswered}
                className="w-7 h-7 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors flex items-center justify-center"
                title={prayer.is_answered ? "응답 표시 해제" : "응답받음 표시"}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={deletePrayer}
                className="w-7 h-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                title="삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Comments */}
        {commentsOpen && (
          <CommentSection
            contentType="prayer_request"
            contentId={prayer.id}
            userId={currentUserId}
            userDisplayName={currentUserName}
          />
        )}
      </div>
    </div>
  );
}
