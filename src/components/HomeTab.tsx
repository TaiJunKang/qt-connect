import { useState, useEffect } from "react";
import { BookOpen, PenLine, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Search, Share2, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BibleSearch from "./BibleSearch";
import WeeklyReview from "./WeeklyReview";
import AnnouncementBanner from "./AnnouncementBanner";
import { BIBLE_BOOKS } from "@/lib/bible-books";

/** "창세기 1~2장" → [{book:"창", startChapter:1, endChapter:2}] */
function parseReference(ref: string): { book: string; startCh: number; endCh: number }[] {
  const results: { book: string; startCh: number; endCh: number }[] = [];
  // Split by space to handle multi-book references like "열왕기하 19장 이사야 37장"
  const parts = ref.split(/\s+/);
  let currentBook = "";
  for (const part of parts) {
    // Check if it's a book name
    const found = BIBLE_BOOKS.find(b => part.startsWith(b.name) || part === b.abbr);
    if (found) {
      currentBook = found.abbr;
      // Check if chapter info is attached (e.g., "창세기" followed by "1~2장")
      const chPart = part.slice(found.name.length).trim();
      if (chPart) {
        const m = chPart.match(/(\d+)(?:[~\-](\d+))?/);
        if (m) results.push({ book: currentBook, startCh: +m[1], endCh: +(m[2] || m[1]) });
      }
      continue;
    }
    // Check if it's a chapter range (e.g., "1~2장", "3장", "1:1~8")
    if (currentBook) {
      const m = part.match(/(\d+)(?:[~\-](\d+))?(?:장)?/);
      if (m) results.push({ book: currentBook, startCh: +m[1], endCh: +(m[2] || m[1]) });
    }
  }
  return results;
}

async function loadBibleChapters(refs: { book: string; startCh: number; endCh: number }[]): Promise<string> {
  const response = await fetch('/bible.txt');
  const buffer = await response.arrayBuffer();
  const fullText = new TextDecoder('euc-kr').decode(buffer);
  const lines = fullText.split('\n');
  const result: string[] = [];

  for (const { book, startCh, endCh } of refs) {
    for (let ch = startCh; ch <= endCh; ch++) {
      const prefix = `${book}${ch}:`;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith(prefix)) {
          // Clean: remove section headers like <천지 창조>
          const cleaned = trimmed.replace(/<[^>]*>/g, '').trim();
          result.push(cleaned);
        }
      }
    }
  }
  return result.join('\n');
}

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
  onWriteClick: () => void;
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
  const [bibleOpen, setBibleOpen] = useState(false);
  const [bibleText, setBibleText] = useState<string | null>(null);
  const [bibleLoading, setBibleLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setBibleOpen(false);
    setBibleText(null);
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

  // Streak 계산
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("qt_logs")
        .select("date")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(60);
      if (!data || data.length === 0) { setStreak(0); return; }

      let count = 0;
      const todayKey = getDateKey(new Date());
      const d = new Date();

      // 오늘 작성 안 했으면 어제부터 체크
      if (!data.find((r) => r.date === todayKey)) {
        d.setDate(d.getDate() - 1);
      }

      const dateSet = new Set(data.map((r) => r.date));
      for (let i = 0; i < 60; i++) {
        if (dateSet.has(getDateKey(d))) {
          count++;
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }
      setStreak(count);
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

  return (
    <div className="px-5 pt-3 pb-8 space-y-6 max-w-lg mx-auto md:max-w-2xl md:px-6">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">
            {isToday ? greeting : "지난 말씀"}
          </h1>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <Flame className="w-3.5 h-3.5 text-primary" />
              <span className="text-[12px] font-semibold text-primary">{streak}일 연속 큐티 중</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowSearch(true)}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* ── Date navigation ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[14px] text-foreground/80 font-medium flex-1 text-center">
          {dateStr}
        </span>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(today)}
            className="text-[13px] text-primary font-semibold px-3 py-1.5 rounded-full bg-primary/8 hover:bg-primary/15 transition-colors"
          >
            오늘
          </button>
        )}
      </div>

      {/* ── Subtitle ── */}
      {!isSunday && (
        <p className="text-[13px] text-muted-foreground leading-relaxed -mt-2">
          {isToday ? "오늘도 말씀과 함께 하루를 시작해보세요" : "못다한 큐티를 이어서 작성해보세요"}
        </p>
      )}

      {/* ── Announcements ── */}
      <AnnouncementBanner />

      {/* ── Sunday special ── */}
      {isSunday ? (
        <div className="rounded-2xl bg-card overflow-hidden">
          <div className="px-6 py-12 flex flex-col items-center text-center gap-5">
            <div className="text-[40px] leading-none">+</div>
            <div>
              <h2 className="text-[20px] font-bold text-foreground tracking-tight mb-2">
                오늘은 주일입니다
              </h2>
              <p className="text-[14px] text-foreground/60 leading-relaxed">
                한 주간의 묵상을 되돌아보며<br />
                감사와 찬양으로 예배를 드려요
              </p>
            </div>
            <div className="w-12 h-px bg-border" />
            <p className="text-[13px] text-foreground/50 leading-[1.8] max-w-[280px]">
              "예배할 자가 영과 진리로 예배할 때가 오나니<br />
              곧 이 때라" (요 4:23)
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <div className="h-48 rounded-2xl bg-secondary animate-pulse" />
          <div className="h-28 rounded-2xl bg-secondary/60 animate-pulse" />
        </div>
      ) : plan ? (
        <>
          {/* Main scripture card */}
          <div className="rounded-2xl bg-card overflow-hidden">
            <div className="px-5 pt-5 pb-5 md:px-6">
              {/* Reference + title + share */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[12px] font-medium text-primary mb-1.5">
                    {plan.reference}
                  </p>
                  <h2 className="text-[18px] font-bold text-foreground leading-snug tracking-tight">
                    {plan.title}
                  </h2>
                </div>
                {typeof navigator !== "undefined" && navigator.share && (
                  <button
                    onClick={() => navigator.share({
                      title: `${plan.reference} - ${plan.title}`,
                      text: `[QT Connect] ${plan.reference}\n${plan.title}\n\n${(plan.text || "").slice(0, 200)}...`,
                    }).catch(() => {})}
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-1"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Scripture text */}
              <div className="rounded-xl bg-secondary/50 px-5 py-5">
                <p className="text-[14px] text-foreground/75 leading-[1.85] whitespace-pre-line">
                  {plan.text}
                </p>
              </div>

              {/* Bible original text toggle */}
              <button
                onClick={async () => {
                  if (bibleOpen) { setBibleOpen(false); return; }
                  if (!bibleText) {
                    setBibleLoading(true);
                    try {
                      const refs = parseReference(plan.reference);
                      const text = await loadBibleChapters(refs);
                      setBibleText(text || "해당 구절을 찾을 수 없습니다.");
                    } catch { setBibleText("성경 파일을 불러올 수 없습니다."); }
                    setBibleLoading(false);
                  }
                  setBibleOpen(true);
                }}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {bibleOpen ? "성경 원문 접기" : "성경 원문 보기"}
                {bibleOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {bibleOpen && (
                <div className="mt-2 rounded-xl bg-secondary/30 px-5 py-5 max-h-[400px] overflow-y-auto">
                  {bibleLoading ? (
                    <p className="text-[13px] text-muted-foreground text-center py-4">불러오는 중...</p>
                  ) : (
                    <p className="text-[13px] text-foreground/65 leading-[1.9] whitespace-pre-line font-scripture">
                      {bibleText}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Commentary card */}
          {plan.commentary && (() => {
            const sections = plan.commentary.split(/\n\n+/);
            return (
              <div className="rounded-2xl bg-card overflow-hidden">
                <div className="px-5 py-5 md:px-6 space-y-4">
                  <p className="text-[13px] font-bold text-foreground tracking-tight">
                    묵상 길잡이
                  </p>
                  {sections.map((section, i) => {
                    const trimmed = section.trim();
                    if (!trimmed) return null;

                    // 섹션 헤더 감지
                    const headerMatch = trimmed.match(/^(오늘의 핵심|묵상 질문|🙏\s*.+)\n([\s\S]*)$/);
                    if (headerMatch) {
                      const header = headerMatch[1].replace(/^🙏\s*/, '');
                      const body = headerMatch[2].trim();
                      return (
                        <div key={i}>
                          <p className="text-[12px] font-semibold text-primary mb-1.5">
                            {header}
                          </p>
                          <p className="text-[14px] text-foreground/65 leading-[1.85] whitespace-pre-line">
                            {body}
                          </p>
                        </div>
                      );
                    }

                    // 질문 형태 (물음표로 끝나는 줄)
                    if (trimmed.includes("?") && trimmed.split("\n").every((l: string) => !l.trim() || l.trim().endsWith("?"))) {
                      return (
                        <div key={i} className="rounded-xl bg-secondary/50 px-4 py-4 space-y-2.5">
                          {trimmed.split("\n").filter((l: string) => l.trim()).map((q: string, qi: number) => (
                            <p key={qi} className="text-[13px] text-foreground/70 leading-relaxed">
                              {q.trim()}
                            </p>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <p key={i} className="text-[14px] text-foreground/65 leading-[1.85] whitespace-pre-line">
                        {trimmed}
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <div className="rounded-2xl bg-card py-20 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-medium text-muted-foreground">오늘의 말씀을 준비 중입니다</p>
            <p className="text-[12px] text-muted-foreground/50 mt-1">관리자가 곧 등록할 예정이에요</p>
          </div>
        </div>
      )}

      {/* ── Weekly Review ── */}
      {!isSunday && <WeeklyReview userId={userId} />}

      {/* ── Write CTA ── */}
      {!isSunday && (
        <button
          onClick={onWriteClick}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl py-4 text-[15px] font-semibold flex items-center justify-center gap-2 tracking-tight transition-colors active:scale-[0.98]"
        >
          <PenLine className="w-[18px] h-[18px]" />
          오늘의 큐티 작성하기
        </button>
      )}
    </div>
  );
}
