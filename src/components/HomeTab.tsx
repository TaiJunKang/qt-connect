import { useState, useEffect } from "react";
import { BookOpen, PenLine, ChevronRight, ChevronLeft, Search, Share2, Flame, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calcStreaks } from "@/lib/streak";
import BibleSearch from "./BibleSearch";
import WeeklyReview from "./WeeklyReview";
import AnnouncementBanner from "./AnnouncementBanner";
import ScripturePassage from "./ScripturePassage";
import { cleanPlanTitle } from "@/lib/plan";

function getDateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

interface Plan {
  title: string;
  reference: string;
  text: string;
  commentary: string;
}

interface HomeTabProps {
  onWriteClick: (date: string) => void;
  userId: string;
}

export default function HomeTab({ onWriteClick, userId }: HomeTabProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const dateKey = getDateKey(selectedDate);
  const isToday = getDateKey(today) === dateKey;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [streak, setStreak] = useState(0);
  const [written, setWritten] = useState(false);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("qt_plans")
        .select("title, reference, text, commentary")
        .eq("date", dateKey)
        .maybeSingle();
      setPlan(data ?? null);
      setLoading(false);
    })();
  }, [dateKey]);

  // 선택한 날짜에 이미 큐티를 썼는지
  useEffect(() => {
    let cancelled = false;
    setWritten(false);
    supabase
      .from("qt_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("date", dateKey)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setWritten(!!data); });
    return () => { cancelled = true; };
  }, [userId, dateKey]);

  // Streak 계산
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("qt_logs")
        .select("date")
        .eq("user_id", userId);
      setStreak(calcStreaks((data ?? []).map((r) => r.date)).current);
    })();
  }, [userId]);

  const now = new Date();
  const dateStr = selectedDate.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const greetingHour = now.getHours();
  const greeting =
    greetingHour < 12 ? "좋은 아침이에요" :
    greetingHour < 18 ? "평안한 오후에요" : "고요한 저녁이에요";

  const isSunday = selectedDate.getDay() === 0;

  if (showSearch) {
    return <BibleSearch onClose={() => setShowSearch(false)} />;
  }

  const firstParagraph = plan?.text?.split(/\n\s*\n/)[0]?.trim();

  return (
    <div className="px-5 pt-4 pb-8 space-y-6 max-w-lg mx-auto md:max-w-2xl md:px-6">

      {/* ── Header ── */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12.5px] font-medium text-muted-foreground tracking-wide">{dateStr}</p>
          <h1 className="font-display text-[26px] text-foreground leading-tight mt-1">
            {isToday ? greeting : "지난 말씀"}
          </h1>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 mt-2.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[12px] font-semibold">
              <Flame className="w-3.5 h-3.5" />
              {streak}일 연속 묵상 중
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSearch(true)}
          aria-label="성경 검색"
          className="w-10 h-10 rounded-full bg-card shadow-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>
      </header>

      {/* ── Date navigation ── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center rounded-full bg-card shadow-card h-10 px-1">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            aria-label="이전 날"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="flex-1 text-center text-[13.5px] font-semibold text-foreground/85">
            {isToday ? "오늘" : selectedDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
          </span>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            aria-label="다음 날"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(today)}
            className="h-10 text-[13px] text-primary font-semibold px-4 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors"
          >
            오늘로
          </button>
        )}
      </div>

      {/* ── Announcements ── */}
      <AnnouncementBanner />

      {/* ── Section label ── */}
      <div className="flex items-center gap-3 pt-1">
        <span className="text-[12.5px] font-bold tracking-[0.04em] text-primary">
          {isSunday ? "주일" : isToday ? "오늘의 말씀" : "이 날의 말씀"}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── Sunday special ── */}
      {isSunday ? (
        <div className="rounded-2xl bg-card shadow-card px-6 py-12 flex flex-col items-center text-center gap-5">
          <h2 className="font-display text-[22px] text-foreground">오늘은 주일입니다</h2>
          <p className="text-[14px] text-foreground/65 leading-relaxed">
            한 주간의 묵상을 되돌아보며<br />
            감사와 찬양으로 예배를 드려요
          </p>
          <div className="w-10 h-px bg-primary/40" />
          <p className="font-scripture text-[14px] text-foreground/60 leading-[1.9] max-w-[280px]">
            "예배할 자가 영과 진리로 예배할 때가 오나니 곧 이 때라"
            <span className="block mt-1 font-sans text-[12px] text-muted-foreground">요한복음 4:23</span>
          </p>
        </div>
      ) : loading ? (
        <div className="h-[420px] rounded-2xl bg-card shadow-card animate-pulse" />
      ) : plan ? (
        <article className="rounded-2xl bg-card shadow-card px-5 pt-6 pb-5 md:px-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] font-semibold text-primary flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {plan.reference}
            </p>
            {typeof navigator !== "undefined" && navigator.share && (
              <button
                onClick={() => navigator.share({
                  title: `${plan.reference} - ${plan.title}`,
                  text: `[QT Connect] ${plan.reference}\n${plan.title}\n\n${(plan.text || "").slice(0, 200)}...`,
                }).catch(() => {})}
                aria-label="공유"
                className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <h2 className="font-display text-[21px] text-foreground leading-snug mt-1.5">
            {cleanPlanTitle(plan.title, plan.reference)}
          </h2>

          <ScripturePassage reference={plan.reference} maxVerses={4} className="mt-5" />

          {firstParagraph && (
            <div className="mt-2 border-l-2 border-primary/30 pl-4">
              <p className="text-[11.5px] font-semibold text-muted-foreground mb-1">말씀 해설</p>
              <p className="text-[13.5px] text-foreground/70 leading-[1.8] line-clamp-3">{firstParagraph}</p>
            </div>
          )}

          <button
            onClick={() => onWriteClick(dateKey)}
            className={`mt-6 w-full rounded-xl py-3.5 text-[15px] font-semibold flex items-center justify-center gap-2 tracking-tight transition-colors active:scale-[0.98] ${
              written
                ? "bg-secondary text-foreground hover:bg-secondary/80"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {written ? <Check className="w-[18px] h-[18px] text-primary" /> : <PenLine className="w-[18px] h-[18px]" />}
            {written ? "묵상 완료 · 다시 보기" : "본문 읽고 묵상하기"}
          </button>
        </article>
      ) : (
        <div className="rounded-2xl bg-card shadow-card py-16 flex flex-col items-center gap-3">
          <BookOpen className="w-6 h-6 text-muted-foreground/40" />
          <div className="text-center">
            <p className="text-[14px] font-medium text-muted-foreground">말씀을 준비 중입니다</p>
            <p className="text-[12px] text-muted-foreground/70 mt-1">관리자가 곧 등록할 예정이에요</p>
          </div>
        </div>
      )}

      {/* ── Weekly Review ── */}
      {!isSunday && <WeeklyReview userId={userId} />}
    </div>
  );
}
