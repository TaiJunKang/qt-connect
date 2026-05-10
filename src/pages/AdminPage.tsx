import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, BookOpen, ShieldCheck, ChevronDown, Pencil, X, Save, Loader2 } from "lucide-react";
import AnnouncementSection from "@/components/admin/AnnouncementSection";

interface QtPlan {
  id: string;
  date: string;
  title: string;
  reference: string;
  text: string;
  commentary: string;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [checking, setChecking] = useState(true);
  const [plans, setPlans] = useState<QtPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [editingPlan, setEditingPlan] = useState<QtPlan | null>(null);
  const [editForm, setEditForm] = useState({ title: "", reference: "", text: "", commentary: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/", { replace: true });
        return;
      }
      // DB에서 role 체크
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (profile?.role !== "admin") {
        toast({
          title: "관리자만 접근할 수 있습니다",
          description: "권한이 없습니다.",
          variant: "destructive",
        });
        navigate("/", { replace: true });
        return;
      }
      setChecking(false);
      fetchPlans();
    })();
  }, []);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    const { data, error } = await supabase
      .from("qt_plans")
      .select("*")
      .order("date", { ascending: true });
    if (!error && data) setPlans(data as QtPlan[]);
    setLoadingPlans(false);
  };

  const handleDelete = async (id: string, dateLabel: string) => {
    if (!confirm(`${dateLabel} 항목을 삭제할까요?`)) return;
    const { error } = await supabase.from("qt_plans").delete().eq("id", id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "삭제되었습니다" });
      setPlans((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const openEdit = (plan: QtPlan) => {
    setEditingPlan(plan);
    setEditForm({ title: plan.title, reference: plan.reference, text: plan.text, commentary: plan.commentary });
  };

  const handleSaveEdit = async () => {
    if (!editingPlan) return;
    setSaving(true);
    const { error } = await supabase
      .from("qt_plans")
      .update({
        title: editForm.title.trim(),
        reference: editForm.reference.trim(),
        text: editForm.text.trim(),
        commentary: editForm.commentary.trim(),
      })
      .eq("id", editingPlan.id);
    setSaving(false);
    if (error) {
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "수정되었습니다" });
      setPlans((prev) =>
        prev.map((p) =>
          p.id === editingPlan.id
            ? { ...p, title: editForm.title.trim(), reference: editForm.reference.trim(), text: editForm.text.trim(), commentary: editForm.commentary.trim() }
            : p
        )
      );
      setEditingPlan(null);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto md:max-w-4xl px-4 md:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">관리자 대시보드</h1>
            <p className="text-xs text-muted-foreground mt-0.5">큐티 말씀 일정 관리</p>
          </div>
        </div>

        {/* Announcement section */}
        <AnnouncementSection />

        <Separator />

        {/* Registered plans list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">등록된 큐티 목록 ({plans.length}개)</h2>
            </div>
            <div className="relative">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="text-xs bg-card border border-border rounded-lg px-3 py-1.5 pr-7 appearance-none cursor-pointer text-foreground"
              >
                <option value="all">전체</option>
                {(() => {
                  // Collect unique YYYY-MM prefixes from plans
                  const ymSet = new Set(plans.map((p) => p.date.slice(0, 7)));
                  const ymList = [...ymSet].sort();
                  return ymList.map((ym) => {
                    const count = plans.filter((p) => p.date.startsWith(ym)).length;
                    const [y, m] = ym.split("-");
                    return (
                      <option key={ym} value={ym}>
                        {y}년 {parseInt(m)}월 ({count}개)
                      </option>
                    );
                  });
                })()}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>
          </div>
          {(() => {
            const filtered = filterMonth === "all"
              ? plans
              : plans.filter((p) => p.date.startsWith(filterMonth));
            return loadingPlans ? (
              <p className="text-sm text-muted-foreground text-center py-6">불러오는 중...</p>
            ) : filtered.length === 0 ? (
              <Card className="border-border shadow-none">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">등록된 큐티 일정이 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
            filtered.map((plan) => (
              <Card key={plan.id} className="border-border shadow-none">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      className="flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
                      onClick={() => openEdit(plan)}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {plan.date}
                        </span>
                        <span className="text-xs text-muted-foreground">{plan.reference}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{plan.title}</p>
                      {plan.commentary && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">💡 {plan.commentary.slice(0, 50)}...</p>
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(plan)}
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8 p-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(plan.id, plan.date)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          );
          })()}
        </div>

        <Separator />
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-muted-foreground text-sm"
        >
          ← 앱으로 돌아가기
        </Button>
      </div>

      {/* Edit modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditingPlan(null)}>
          <div
            className="bg-card rounded-2xl shadow-xl border border-border/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border/40 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-primary">{editingPlan.date}</p>
                <h3 className="text-base font-bold text-foreground">큐티 내용 수정</h3>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">제목</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-secondary/50 border-0 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">성경 구절 (reference)</label>
                <input
                  type="text"
                  value={editForm.reference}
                  onChange={(e) => setEditForm((f) => ({ ...f, reference: e.target.value }))}
                  className="w-full bg-secondary/50 border-0 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">본문</label>
                <Textarea
                  value={editForm.text}
                  onChange={(e) => setEditForm((f) => ({ ...f, text: e.target.value }))}
                  className="min-h-[200px] bg-secondary/50 border-0 rounded-xl resize-none text-sm leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">묵상 길잡이 (commentary)</label>
                <Textarea
                  value={editForm.commentary}
                  onChange={(e) => setEditForm((f) => ({ ...f, commentary: e.target.value }))}
                  className="min-h-[160px] bg-secondary/50 border-0 rounded-xl resize-none text-sm leading-relaxed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 rounded-xl h-11"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {saving ? "저장 중..." : "저장"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingPlan(null)}
                  className="rounded-xl h-11"
                >
                  취소
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
