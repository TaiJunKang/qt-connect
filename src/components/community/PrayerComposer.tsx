import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, HandHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PRAYER_CATEGORIES } from "./prayer-categories";

interface PrayerComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userDisplayName: string;
  onSubmitted: () => void;
}

export default function PrayerComposer({ open, onOpenChange, userId, userDisplayName, onSubmitted }: PrayerComposerProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle("");
    setContent("");
    setCategory("general");
    setIsAnonymous(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "기도 제목을 입력해주세요", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("prayer_requests").insert({
        user_id: userId,
        user_name: userDisplayName,
        title: title.trim(),
        content: content.trim(),
        category,
        is_anonymous: isAnonymous,
      });
      if (error) throw error;

      toast({ title: "기도 제목이 공유되었어요 🙏" });
      reset();
      onOpenChange(false);
      onSubmitted();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "저장 실패";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <HandHeart className="w-4 h-4 text-primary" />
            </div>
            기도 제목 올리기
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground/70">
            공동체와 함께 나누고 싶은 기도 제목을 적어주세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
              기도 제목 <span className="text-destructive">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 다가오는 시험을 위한 기도"
              maxLength={80}
              className="h-10 text-sm"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
              카테고리
            </Label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRAYER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-[11px] font-medium transition-all ${
                    category === cat.id
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-card border-border/40 text-muted-foreground hover:bg-accent/30"
                  }`}
                >
                  <span className="text-base">{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
              상세 내용 <span className="text-muted-foreground/40 normal-case">(선택)</span>
            </Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="기도 제목에 대해 좀 더 나누고 싶은 내용이 있다면..."
              className="min-h-[100px] resize-none text-sm leading-relaxed"
              maxLength={500}
            />
            {content.length > 0 && (
              <p className="text-[10px] text-muted-foreground/50 text-right">{content.length}/500</p>
            )}
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/30 px-4 py-3">
            <div>
              <p className="text-[13px] font-medium text-foreground">익명으로 올리기</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">이름 대신 "익명의 지체"로 표시됩니다</p>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />올리는 중...</> : "올리기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
