import { useState, useEffect, useCallback } from "react";
import { Megaphone, Plus, Pin, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
}

const CATEGORIES = [
  { id: "general", label: "일반 공지", emoji: "📢" },
  { id: "event",   label: "행사/수련회", emoji: "🗓️" },
  { id: "urgent",  label: "긴급 공지", emoji: "🚨" },
];

export default function AnnouncementSection() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

  // Composer state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setAnnouncements(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "제목을 입력해주세요", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("로그인이 필요합니다");

      const { error } = await supabase.from("announcements").insert({
        user_id: session.user.id,
        title: title.trim(),
        content: content.trim(),
        category,
        is_pinned: isPinned,
      });
      if (error) throw error;

      toast({ title: "공지사항이 등록되었습니다" });
      setTitle(""); setContent(""); setCategory("general"); setIsPinned(false);
      setComposerOpen(false);
      fetchAnnouncements();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "등록 실패";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 공지를 삭제할까요?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast({ title: "삭제 실패", variant: "destructive" });
    } else {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "삭제되었습니다" });
    }
  };

  const togglePin = async (id: string, currentPinned: boolean) => {
    const { error } = await supabase.from("announcements").update({ is_pinned: !currentPinned }).eq("id", id);
    if (!error) fetchAnnouncements();
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            공지사항 관리
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            청년부 공지를 등록하면 홈 화면에 표시됩니다.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setComposerOpen(true)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 text-[13px] font-semibold gap-2"
          >
            <Plus className="w-4 h-4" />
            새 공지 작성
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-6">불러오는 중...</div>
      ) : announcements.length === 0 ? (
        <Card className="border-dashed border-border shadow-none">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">등록된 공지가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        announcements.map((a) => (
          <Card key={a.id} className="border-border shadow-none">
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {a.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {CATEGORIES.find((c) => c.id === a.category)?.label ?? "공지"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  {a.content && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => togglePin(a.id, a.is_pinned)}
                    className={`h-8 w-8 p-0 ${a.is_pinned ? "text-amber-500" : "text-muted-foreground"}`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleDelete(a.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Composer dialog */}
      <Dialog open={composerOpen} onOpenChange={(v) => { if (!submitting) setComposerOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              새 공지 작성
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                제목 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="공지 제목"
                maxLength={100}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                카테고리
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg border text-[11px] font-medium transition-all ${
                      category === cat.id
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-card border-border/40 text-muted-foreground hover:bg-accent/30"
                    }`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                내용 <span className="text-muted-foreground/40 normal-case">(선택)</span>
              </Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="공지 상세 내용"
                className="min-h-[100px] resize-none text-sm"
                maxLength={1000}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/30 px-4 py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">상단 고정</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">중요 공지를 맨 위에 표시</p>
              </div>
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setComposerOpen(false)} disabled={submitting} className="flex-1">
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !title.trim()} className="flex-1">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />등록 중...</> : "등록하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
