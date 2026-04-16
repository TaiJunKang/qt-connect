import { useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LikeButtonProps {
  contentType: "qt_log" | "prayer_request";
  contentId: string;
  userId: string;
  count: number;
  hasLiked: boolean;
  onChange: () => void;
  size?: "sm" | "md";
}

export default function LikeButton({
  contentType,
  contentId,
  userId,
  count,
  hasLiked,
  onChange,
  size = "md",
}: LikeButtonProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const toggle = async () => {
    setSubmitting(true);
    try {
      if (hasLiked) {
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

  const sizeClasses = size === "sm"
    ? "px-2 py-1 text-[11px] gap-1"
    : "px-3 py-1.5 text-[12px] gap-1.5";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <button
      onClick={toggle}
      disabled={submitting}
      className={`flex items-center ${sizeClasses} rounded-lg font-semibold transition-all ${
        hasLiked
          ? "bg-rose-500/10 text-rose-600 border border-rose-200/50"
          : "bg-muted/50 text-muted-foreground hover:bg-rose-500/5 hover:text-rose-500 border border-transparent"
      }`}
    >
      <Heart className={`${iconSize} ${hasLiked ? "fill-rose-500 text-rose-500" : ""}`} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
