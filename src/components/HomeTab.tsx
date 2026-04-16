import { useState, useEffect } from "react";
import { BookOpen, PenLine, Lightbulb, ChevronRight, Search, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import BibleSearch from "./BibleSearch";
import WeeklyReview from "./WeeklyReview";
import AnnouncementBanner from "./AnnouncementBanner";

function getTodayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

interface Plan {
  title: string;
  reference: string;
  text: string;
  commentary: string;
}

interface HomeTabProps {
  onWriteClick: () => void;
  userId: string;
}

export default function HomeTab({ onWriteClick, userId }: HomeTabProps) {
  const todayKey = getTodayKey();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("qt_plans")
        .select("title, reference, text, commentary")
        .eq("date", todayKey)
        .maybeSingle();
      setPlan(data ?? null);
      setLoading(false);
    })();
  }, [todayKey]);

  const now = new Date();
  const dateStr = now.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const greetingHour = now.getHours();
  const greeting =
    greetingHour < 12 ? "좋은 아침이에요" :
    greetingHour < 18 ? "평안한 오후에요" : "고요한 저녁이에요";

  if (showSearch) {
    return <BibleSearch onClose={() => setShowSearch(false)} />;
  }

  return (
    <div className="px-4 pt-7 pb-6 space-y-5 max-w-lg mx-auto md:max-w-2xl md:px-6">

      {/* ── Hero header ── */}
      <div className="rounded-2xl bg-warm-glow border border-border/30 px-5 py-5 md:px-6 md:py-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground font-medium tracking-[0.1em] uppercase">
              {dateStr}
            </p>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{greeting}</h1>
            <p className="text-[12px] text-muted-foreground/80 leading-relaxed">
              오늘도 말씀과 함께 하루를 시작해보세요
            </p>
          </div>
          <button
            onClick={() => setShowSearch(true)}
            className="w-10 h-10 rounded-xl bg-card/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all shadow-xs"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Announcements ── */}
      <AnnouncementBanner />

      {/* ── Scripture card ── */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-56 rounded-2xl bg-muted/50 animate-pulse" />
          <div className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
        </div>
      ) : plan ? (
        <>
          {/* Main scripture card */}
          <div className="rounded-2xl bg-card shadow-card overflow-hidden border border-border/40">
            {/* Top accent bar */}
            <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/40" />

            <div className="px-5 pt-5 pb-6 md:px-6">
              {/* Reference badge + title */}
              <div className="flex items-start gap-3.5 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary/10">
                  <BookOpen className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[10px] font-bold text-primary/70 tracking-[0.15em] uppercase mb-1.5 bg-primary/5 px-2 py-0.5 rounded-md">
                    {plan.reference}
                  </span>
                  <h2 className="text-base font-bold text-foreground leading-snug tracking-tight">
                    {plan.title}
                  </h2>
                </div>
              </div>

              {/* Scripture text */}
              <div
                className="rounded-xl px-4 py-4 md:px-5 border-l-gold"
                style={{ background: "hsl(var(--scripture-bg))" }}
              >
                <p className="text-[13.5px] text-foreground/75 leading-[2] whitespace-pre-line font-scripture">
                  {plan.text}
                </p>
              </div>
            </div>
          </div>

          {/* Commentary card */}
          {plan.commentary && (
            <div className="rounded-2xl bg-card border border-border/40 shadow-card overflow-hidden">
              <div className="px-5 py-4 md:px-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-700/70 tracking-[0.12em] uppercase">
                    묵상 길잡이
                  </span>
                </div>
                <p className="text-[13px] text-foreground/70 leading-[1.9] whitespace-pre-line font-scripture">
                  {plan.commentary}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl bg-card border border-border/40 shadow-card py-16 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">오늘의 말씀을 준비 중입니다</p>
            <p className="text-[11px] text-muted-foreground/50 mt-1">관리자가 곧 등록할 예정이에요</p>
          </div>
        </div>
      )}

      {/* ── Weekly Review (지난 주 돌아보기) ── */}
      <WeeklyReview userId={userId} />

      {/* ── Write CTA ── */}
      <Button
        onClick={onWriteClick}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl py-6 text-[15px] font-semibold shadow-soft flex items-center justify-center gap-2.5 tracking-tight transition-all hover:shadow-glow"
      >
        <PenLine className="w-4.5 h-4.5" />
        오늘의 큐티 작성하기
        <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
      </Button>
    </div>
  );
}
