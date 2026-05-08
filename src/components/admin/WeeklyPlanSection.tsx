import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, Sparkles, CheckCircle2, Loader2, Trash2, RefreshCw, FileText } from "lucide-react";

interface WeeklyPlanSectionProps {
  onRegistered?: () => void;
}

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { extractScripture, getWeekDates } from "@/lib/bible-parser";
import WeeklyPlanCard, { type WeeklyPlanItem } from "./WeeklyPlanCard";

export default function WeeklyPlanSection({ onRegistered }: WeeklyPlanSectionProps) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [sermonTitle, setSermonTitle] = useState("");
  const [sermonContent, setSermonContent] = useState("");
  const [sermonId, setSermonId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [plans, setPlans] = useState<WeeklyPlanItem[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [savingDraftIndex, setSavingDraftIndex] = useState<number | null>(null);
  const [generateCooldown, setGenerateCooldown] = useState(false);

  // Load existing drafts on mount
  const fetchDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    const { data, error } = await supabase
      .from("qt_drafts")
      .select("*")
      .order("date", { ascending: true });
    setLoadingDrafts(false);
    if (!error && data && data.length > 0) {
      setPlans(
        data.map((d) => ({
          date: d.date,
          title: d.title,
          reference: d.reference,
          text: d.text,
          commentary: d.commentary,
        }))
      );
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const handleGenerate = async () => {
    if (!startDate) {
      toast({ title: "시작 날짜를 선택해 주세요.", variant: "destructive" });
      return;
    }
    if (!sermonContent.trim()) {
      toast({ title: "설교 원고를 입력해 주세요.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setPlans([]);

    try {
      const dates = getWeekDates(startDate);

      // 설교문을 sermons 테이블에 저장
      const { data: sermonData, error: sermonError } = await supabase
        .from("sermons")
        .insert({
          title: sermonTitle.trim(),
          content: sermonContent.trim(),
          sermon_date: format(startDate, "yyyy-MM-dd"),
        })
        .select("id")
        .single();

      if (sermonError) throw sermonError;
      const savedSermonId = sermonData.id;
      setSermonId(savedSermonId);

      const { data, error } = await supabase.functions.invoke("generate-weekly-qt", {
        body: { dates, sermonTitle: sermonTitle.trim(), sermonContent: sermonContent.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const aiPlans: Array<{ date: string; title: string; reference: string; commentary: string }> =
        data.plans ?? [];

      if (aiPlans.length !== 7) {
        throw new Error("AI가 7개의 큐티 일정을 생성하지 못했습니다. 다시 시도해 주세요.");
      }

      toast({ title: "AI 초안 생성 완료! 성경 본문을 추출 중입니다..." });

      // Extract scripture text in parallel
      const fullPlans: WeeklyPlanItem[] = await Promise.all(
        aiPlans.map(async (p) => {
          let text = "";
          try {
            text = await extractScripture(p.reference);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "본문 추출 실패";
            console.error(`[${p.reference}] ${msg}`);
            toast({ title: `본문 추출 실패: ${p.reference}`, description: msg, variant: "destructive" });
            text = `[본문 없음: ${p.reference}]`;
          }
          return { date: p.date, title: p.title, reference: p.reference, text, commentary: p.commentary };
        })
      );

      // Save all drafts to DB immediately (upsert by date)
      const { error: upsertErr } = await supabase.from("qt_drafts").upsert(
        fullPlans.map((p) => ({
          date: p.date,
          title: p.title,
          reference: p.reference,
          text: p.text,
          commentary: p.commentary,
          sermon_id: savedSermonId,
        })),
        { onConflict: "date" }
      );

      if (upsertErr) throw upsertErr;

      setPlans(fullPlans);
      toast({ title: "✅ 7일치 초안이 저장되었습니다. 다른 관리자와 함께 검수해 주세요." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      toast({ title: "생성 실패", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
      setGenerateCooldown(true);
      setTimeout(() => setGenerateCooldown(false), 5000);
    }
  };

  // Save single draft card change to DB with debounce-like save on blur
  const handlePlanChange = (index: number, updated: WeeklyPlanItem) => {
    setPlans((prev) => prev.map((p, i) => (i === index ? updated : p)));
  };

  const handleSaveDraft = async (index: number) => {
    const p = plans[index];
    setSavingDraftIndex(index);
    const { error } = await supabase.from("qt_drafts").upsert(
      { date: p.date, title: p.title, reference: p.reference, text: p.text, commentary: p.commentary },
      { onConflict: "date" }
    );
    setSavingDraftIndex(null);
    if (error) {
      toast({ title: "임시 저장 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${p.date} 임시 저장 완료 ✅` });
    }
  };

  const handleDeleteDraft = async () => {
    if (!confirm("현재 초안 전체를 삭제할까요?")) return;
    const dates = plans.map((p) => p.date);
    const { error } = await supabase.from("qt_drafts").delete().in("date", dates);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      setPlans([]);
      setStartDate(undefined);
      setSermonTitle("");
      setSermonContent("");
      setSermonId(null);
      toast({ title: "초안이 삭제되었습니다." });
    }
  };

  const handleBulkSave = async () => {
    const invalid = plans.filter((p) => !p.date || !p.title || !p.reference || !p.text);
    if (invalid.length > 0) {
      toast({
        title: "일부 항목에 필수 정보가 없습니다.",
        description: "날짜, 제목, 구절, 본문을 모두 채워주세요.",
        variant: "destructive",
      });
      return;
    }

    setBulkSaving(true);
    const { error } = await supabase.from("qt_plans").upsert(
      plans.map((p) => ({
        date: p.date,
        title: p.title,
        reference: p.reference,
        text: p.text,
        commentary: p.commentary,
        sermon_id: sermonId,
      })),
      { onConflict: "date" }
    );

    if (error) {
      setBulkSaving(false);
      toast({ title: "일괄 저장 실패", description: error.message, variant: "destructive" });
      return;
    }

    // Delete drafts after final registration
    const dates = plans.map((p) => p.date);
    await supabase.from("qt_drafts").delete().in("date", dates);
    setBulkSaving(false);

    toast({ title: "✅ 1주일치 큐티가 성공적으로 등록되었습니다!" });
    setPlans([]);
    setStartDate(undefined);
    setSermonTitle("");
    setSermonContent("");
    setSermonId(null);
    onRegistered?.();
  };

  return (
    <div className="space-y-4">
      {/* Generation card */}
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            설교문 기반 큐티 자동 기획
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            주일 설교문을 붙여넣으면 AI가 설교 내용을 분석하여 7일치 큐티 초안을 생성합니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">시작 날짜 <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-10 text-sm",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "yyyy년 MM월 dd일") : "날짜 선택"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">설교 제목</Label>
            <Input
              placeholder="예: 믿음의 여정, 은혜의 능력"
              value={sermonTitle}
              onChange={(e) => setSermonTitle(e.target.value)}
              maxLength={200}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">설교 원고 <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="주일 설교 원고를 붙여넣기 해 주세요..."
              value={sermonContent}
              onChange={(e) => setSermonContent(e.target.value)}
              maxLength={10000}
              className="min-h-[200px] text-sm leading-relaxed resize-y"
            />
            {sermonContent.length > 0 && (
              <p className="text-xs text-muted-foreground text-right">
                {sermonContent.length.toLocaleString()}자
              </p>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || generateCooldown || !startDate || !sermonContent.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5 text-sm font-medium rounded-xl flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                설교문을 분석하여 큐티를 기획 중입니다...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                AI로 1주일치 초안 만들기
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Draft review area */}
      {loadingDrafts ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">저장된 초안 불러오는 중...</span>
        </div>
      ) : plans.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">검수 및 수정 — {plans.length}일치 초안</h2>
              <Badge variant="outline" className="text-xs text-primary border-primary/40 bg-primary/5">
                DB 저장됨
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDrafts}
                className="text-xs text-muted-foreground h-7 px-2 gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                새로고침
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteDraft}
                className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2 gap-1"
              >
                <Trash2 className="w-3 h-3" />
                초안 삭제
              </Button>
            </div>
          </div>

          {plans.map((plan, i) => (
            <div key={plan.date} className="space-y-2">
              <WeeklyPlanCard
                index={i}
                plan={plan}
                onChange={(updated) => handlePlanChange(i, updated)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveDraft(i)}
                disabled={savingDraftIndex === i}
                className="w-full h-8 text-xs border-primary/30 text-primary hover:bg-primary/5"
              >
                {savingDraftIndex === i ? (
                  <><Loader2 className="w-3 h-3 animate-spin mr-1" />저장 중...</>
                ) : (
                  "💾 이 날 수정사항 임시 저장"
                )}
              </Button>
            </div>
          ))}

          <Button
            onClick={handleBulkSave}
            disabled={bulkSaving}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-semibold rounded-2xl flex items-center gap-2 shadow-md"
          >
            {bulkSaving ? (
              <><Loader2 className="w-5 h-5 animate-spin" />등록 중...</>
            ) : (
              <><CheckCircle2 className="w-5 h-5" />✅ 1주일치 최종 등록하기</>
            )}
          </Button>
        </div>
      ) : (
        <Card className="border-dashed border-border shadow-none">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">저장된 초안이 없습니다.</p>
            <p className="text-xs text-muted-foreground mt-1">위에서 AI 초안을 생성하면 자동으로 저장됩니다.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
