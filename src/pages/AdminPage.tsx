import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, BookOpen, ShieldCheck, ChevronDown } from "lucide-react";
import WeeklyPlanSection from "@/components/admin/WeeklyPlanSection";
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

        {/* Weekly plan section */}
        <WeeklyPlanSection onRegistered={fetchPlans} />

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
                    <div className="flex-1 min-w-0">
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
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(plan.id, plan.date)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
    </div>
  );
}
