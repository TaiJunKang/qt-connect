import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LikeButtonProps {
  contentType: "qt_log" | "prayer_request";
  contentId: string;
  userId: string;
  count: number;
  hasLiked: boolean;
  onChange?: () => void;
  size?: "sm" | "md";
}

// '아멘' 반응. 누르면 바로 반영하고(낙관적 업데이트) 실패하면 되돌림
export default function LikeButton({ contentType, contentId, userId, count, hasLiked, onChange }: LikeButtonProps) {
  const { toast } = useToast();
  const [liked, setLiked] = useState(hasLiked);
  const [total, setTotal] = useState(count);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setLiked(hasLiked); setTotal(count); }, [hasLiked, count]);

  const toggle = async () => {
    if (submitting) return;
    const next = !liked;
    setSubmitting(true);
    setLiked(next);
    setTotal((t) => t + (next ? 1 : -1));
    try {
      if (!next) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("content_type", contentType)
          .eq("content_id", contentId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ content_type: contentType, content_id: contentId, user_id: userId });
        if (error && error.code !== "23505") throw error; // 연타로 인한 중복은 무시
      }
      onChange?.();
    } catch (e) {
      setLiked(!next);
      setTotal((t) => t + (next ? -1 : 1));
      toast({ title: (e as { message?: string })?.message || "오류가 발생했습니다", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={liked}
      className={`flex items-center gap-1.5 h-[34px] px-3 rounded-full text-[13px] transition-colors ${
        liked ? "bg-primary-soft text-primary font-bold" : "bg-secondary text-foreground/80 font-medium hover:bg-secondary/70"
      }`}
    >
      <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
      아멘{total > 0 && ` ${total}`}
    </button>
  );
}
