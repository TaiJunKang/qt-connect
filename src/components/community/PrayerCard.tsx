import { useState } from "react";
import { HandHeart, Sparkles, Check, Trash2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCategory } from "./prayer-categories";
import CommentSection from "./CommentSection";
import UserAvatar from "../UserAvatar";

export interface PrayerItem {
  id: string;
  user_id: string | null; // 타인의 익명 글이면 null
  user_name: string;
  avatar_url: string | null;
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
        if (error && error.code !== "23505") throw error; // 연타로 인한 중복은 무시
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
    <article className={`rounded-[20px] border overflow-hidden ${
      prayer.is_answered ? "border-sage/30 bg-sage-soft" : "border-border bg-card"
    }`}>
      <div className="p-[18px]">
        {/* Top row: avatar, name, time, category */}
        <div className="flex items-center gap-2.5 mb-3">
          <UserAvatar
            name={displayName}
            avatarUrl={prayer.is_anonymous ? null : prayer.avatar_url}
            size="md"
            className="!w-9 !h-9"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-bold text-foreground truncate">{displayName}</span>
              <span className="text-[12px] text-muted-foreground">·</span>
              <span className="text-[12px] text-muted-foreground">{formatRelativeTime(prayer.created_at)}</span>
            </div>
          </div>
          <span className={`text-[12px] font-semibold px-2 py-1 rounded-lg ${category.colorClass} flex-shrink-0`}>
            {category.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[16px] font-extrabold text-foreground leading-snug mb-1.5">
          {prayer.title}
        </h3>

        {/* Content */}
        {prayer.content && (
          <p className="text-[15px] text-foreground/80 leading-[1.75] whitespace-pre-line mb-3">
            {prayer.content}
          </p>
        )}

        {/* Answered note */}
        {prayer.is_answered && prayer.answered_at && (
          <div className="mb-3">
            <p className="text-[13px] text-sage font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              응답받은 기도입니다
            </p>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePrayed}
            disabled={submitting}
            className={`flex items-center gap-1.5 h-[34px] px-3 rounded-full text-[13px] font-bold transition-colors ${
              prayer.has_prayed
                ? "bg-primary text-primary-foreground"
                : "bg-primary-soft text-primary hover:brightness-95"
            }`}
          >
            <HandHeart className="w-4 h-4" />
            {prayer.has_prayed ? "기도했어요" : "기도하기"}
          </button>

          <button
            onClick={() => setCommentsOpen((v) => !v)}
            aria-expanded={commentsOpen}
            className={`flex items-center gap-1.5 h-[34px] px-3 rounded-full text-[13px] transition-colors ${
              commentsOpen ? "bg-foreground text-background font-bold" : "bg-secondary text-foreground/80 font-medium hover:bg-secondary/70"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            댓글{prayer.comment_count > 0 && ` ${prayer.comment_count}`}
          </button>

          <span className="text-[12px] text-muted-foreground font-medium ml-auto mr-1">
            {prayer.response_count > 0 && `${prayer.response_count}명이 기도`}
          </span>

          {isOwner && (
            <div className="flex items-center gap-1">
              <button
                onClick={markAnswered}
                className="w-9 h-9 rounded-full hover:bg-secondary text-muted-foreground hover:text-sage transition-colors flex items-center justify-center"
                title={prayer.is_answered ? "응답 표시 해제" : "응답받음 표시"}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={deletePrayer}
                className="w-9 h-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
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
    </article>
  );
}
