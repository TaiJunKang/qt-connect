import { useState, useEffect } from "react";
import { BookOpen, PenLine, ChevronRight, ChevronLeft, Search, Share2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calcStreaks } from "@/lib/streak";
import { getDateKey } from "@/lib/date";
import { cleanPlanTitle } from "@/lib/plan";
import BibleSearch from "./BibleSearch";
import WeeklyReview from "./WeeklyReview";
import AnnouncementBanner from "./AnnouncementBanner";
import ScripturePassage from "./ScripturePassage";
import UserAvatar from "./UserAvatar";
import LambPet, { LAMB_START_DATE } from "./LambPet";

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// 월요일 시작 주의 7일
function weekOf(d: Date) {
  const start = addDays(d, -((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "주일"];

interface Plan {
  title: string;
  reference: string;
  text: string;
  commentary: string;
}

interface Sharer {
  name: string;
  avatarUrl: string | null;
}

interface HomeTabProps {
  onWriteClick: (date: string) => void;
  onOpenCommunity: () => void;
  userId: string;
  displayName: string;
}

export default function HomeTab({ onWriteClick, onOpenCommunity, userId, displayName }: HomeTabProps) {
  const today = new Date();
  const todayKey = getDateKey(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const dateKey = getDateKey(selectedDate);
  const isToday = todayKey === dateKey;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [myDates, setMyDates] = useState<Set<string>>(new Set());
  const [shareCount, setShareCount] = useState(0);
  const [sharers, setSharers] = useState<Sharer[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("qt_plans")
        .select("title, reference, text, commentary")
        .eq("date", dateKey)
        .maybeSingle();
      if (cancelled) return;
      setPlan(data ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dateKey]);

  // 내가 쓴 날짜들: 이번 주 표시, 연속 기록, 작성 여부
  useEffect(() => {
    supabase
      .from("qt_logs")
      .select("date")
      .eq("user_id", userId)
      .then(({ data }) => setMyDates(new Set((data ?? []).map((r) => r.date))));
  }, [userId]);

  // 선택한 날 나눔에 올라온 묵상 수와 앞사람 몇 명
  useEffect(() => {
    let cancelled = false;
    supabase.rpc("get_shared_logs", { p_from: dateKey, p_to: dateKey }).then(({ data }) => {
      if (cancelled) return;
      const rows = data ?? [];
      setShareCount(rows.length);
      const seen = new Set<string>();
      const named: Sharer[] = [];
      for (const r of rows) {
        if (!r.user_id || seen.has(r.user_id)) continue;
        seen.add(r.user_id);
        named.push({ name: r.user_name, avatarUrl: r.avatar_url });
      }
      setSharers(named.slice(0, 3));
    });
    return () => { cancelled = true; };
  }, [dateKey]);

  const streak = calcStreaks([...myDates]).current;
  const written = myDates.has(dateKey);
  const week = weekOf(selectedDate);
  const isCurrentWeek = week.some((d) => getDateKey(d) === todayKey);

  const hour = today.getHours();
  const greeting = hour < 12 ? "좋은 아침이에요" : hour < 18 ? "평안한 오후에요" : "고요한 저녁이에요";
  const dateStr = selectedDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
  const isSunday = selectedDate.getDay() === 0;

  if (showSearch) {
    return <BibleSearch onClose={() => setShowSearch(false)} />;
  }

  return (
    <div className="px-5 pt-6 pb-8 space-y-5 max-w-lg mx-auto md:max-w-2xl md:px-6">

      {/* ── Header ── */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground">{dateStr}</p>
          <h1 className="text-[25px] font-extrabold tracking-[-0.03em] leading-[1.3] mt-1">
            {isToday ? <>{greeting},<br />{displayName}님</> : "지난 말씀"}
          </h1>
        </div>
        <button
          onClick={() => setShowSearch(true)}
          aria-label="성경 검색"
          className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors flex-shrink-0"
        >
          <Search className="w-5 h-5" />
        </button>
      </header>

      {/* ── 어린 양: 오늘 썼으면 깡총, 아직이면 꾸벅 ── */}
      <LambPet total={[...myDates].filter((d) => d >= LAMB_START_DATE).length} happy={myDates.has(todayKey)} />

      {/* ── 이번 주 (날짜 이동 겸용) ── */}
      <section className="rounded-[20px] bg-card border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              aria-label="이전 주"
              className="w-8 h-8 -ml-1.5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[14px] font-bold">{isCurrentWeek ? "이번 주 묵상" : `${week[0].getMonth() + 1}월 ${week[0].getDate()}일 주`}</span>
            <button
              onClick={() => setSelectedDate(isCurrentWeek ? selectedDate : addDays(selectedDate, 7) > today ? today : addDays(selectedDate, 7))}
              aria-label="다음 주"
              disabled={isCurrentWeek}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {streak > 0 ? (
            <span className="text-[13px] font-bold text-primary">{streak}일 연속</span>
          ) : !isToday ? (
            <button onClick={() => setSelectedDate(today)} className="text-[13px] font-bold text-primary">오늘로</button>
          ) : null}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d, i) => {
            const key = getDateKey(d);
            const done = myDates.has(key);
            const selected = key === dateKey;
            const future = key > todayKey;
            const sunday = i === 6;
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(d)}
                disabled={future}
                aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일${done ? " 묵상 완료" : ""}`}
                aria-pressed={selected}
                className="flex flex-col items-center gap-1.5 disabled:cursor-default"
              >
                <span className={`text-[11px] ${selected ? "font-bold text-foreground" : "text-muted-foreground"}`}>{DAY_LABELS[i]}</span>
                <span
                  className={`w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] box-border ${
                    done
                      ? "bg-primary text-primary-foreground font-bold"
                      : sunday && !selected
                        ? "text-muted-foreground text-[11px] font-medium"
                        : "bg-secondary text-muted-foreground"
                  } ${selected ? (done ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "border-2 border-primary text-primary font-extrabold bg-transparent") : ""}`}
                >
                  {sunday && !done && !selected ? "쉼" : d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Announcements ── */}
      <AnnouncementBanner />

      {/* ── 오늘의 말씀 ── */}
      {isSunday ? (
        <section className="rounded-3xl bg-card border border-border px-6 py-10 flex flex-col items-center text-center gap-4">
          <h2 className="text-[21px] font-extrabold tracking-[-0.03em]">오늘은 주일입니다</h2>
          <p className="text-[14px] text-foreground/70 leading-relaxed">
            한 주간의 묵상을 되돌아보며<br />감사와 찬양으로 예배를 드려요
          </p>
          <div className="w-10 h-px bg-primary/40" />
          <p className="text-[14px] text-foreground/70 leading-[1.8]">
            "예배할 자가 영과 진리로 예배할 때가 오나니 곧 이 때라"
            <span className="block mt-1 text-[12px] text-muted-foreground">요한복음 4:23</span>
          </p>
        </section>
      ) : loading ? (
        <div className="h-[340px] rounded-3xl bg-card border border-border animate-pulse" />
      ) : plan ? (
        <article className="rounded-3xl bg-card border border-border px-5 pt-[22px] pb-5 md:px-7 space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-primary bg-primary-soft rounded-lg px-2 py-1">
              {isToday ? "오늘의 말씀" : "이 날의 말씀"}
            </span>
            <span className="text-[13px] font-medium text-muted-foreground flex-1">{plan.reference}</span>
            {typeof navigator !== "undefined" && navigator.share && (
              <button
                onClick={() => navigator.share({
                  title: `${plan.reference} - ${plan.title}`,
                  text: `[QT Connect] ${plan.reference}\n${plan.title}\n\n${(plan.text || "").slice(0, 200)}...`,
                }).catch(() => {})}
                aria-label="공유"
                className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <h2 className="text-[21px] font-extrabold tracking-[-0.03em] leading-[1.35]">
            {cleanPlanTitle(plan.title, plan.reference)}
          </h2>
          <ScripturePassage reference={plan.reference} maxVerses={2} />
          <button
            onClick={() => onWriteClick(dateKey)}
            className={`w-full h-[52px] rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.98] ${
              written ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {written ? <Check className="w-[18px] h-[18px] text-primary" /> : <PenLine className="w-[18px] h-[18px]" />}
            {written ? "묵상 완료 · 다시 보기" : "말씀 읽고 묵상하기"}
          </button>
        </article>
      ) : (
        <section className="rounded-3xl bg-card border border-border py-14 flex flex-col items-center gap-3">
          <BookOpen className="w-6 h-6 text-muted-foreground/50" />
          <div className="text-center">
            <p className="text-[14px] font-medium text-muted-foreground">말씀을 준비 중입니다</p>
            <p className="text-[12px] text-muted-foreground mt-1">관리자가 곧 등록할 예정이에요</p>
          </div>
        </section>
      )}

      {/* ── 함께 나눈 사람들 ── */}
      {!isSunday && (
        <button
          onClick={onOpenCommunity}
          className="w-full flex items-center gap-3 rounded-[18px] bg-sage-soft px-4 py-3.5 text-left text-foreground hover:brightness-[0.98] transition"
        >
          {sharers.length > 0 && (
            <div className="flex">
              {sharers.map((s, i) => (
                <UserAvatar key={i} name={s.name} avatarUrl={s.avatarUrl} size="sm" className={`ring-2 ring-[hsl(var(--sage-soft))] ${i > 0 ? "-ml-2" : ""}`} />
              ))}
            </div>
          )}
          <span className="flex-1 text-[14px] font-medium leading-snug">
            {shareCount > 0
              ? <>{isToday ? "오늘" : "이 날"} <b>{shareCount}명</b>이 묵상을 나눴어요</>
              : isToday ? "오늘 첫 번째로 묵상을 나눠보세요" : "이 날 나눈 묵상이 없어요"}
          </span>
          <ChevronRight className="w-[18px] h-[18px] text-muted-foreground" />
        </button>
      )}

      {/* ── Weekly Review ── */}
      {!isSunday && <WeeklyReview userId={userId} />}
    </div>
  );
}
