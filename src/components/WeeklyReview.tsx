import { useEffect, useState } from "react";
import { Calendar, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeeklyReviewProps {
  userId: string;
}

interface DayEntry {
  date: string;        // MM-DD
  hasLog: boolean;
  planTitle: string | null;
  planReference: string | null;
  meditation: string | null;
  application: string | null;
  prayer: string | null;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function getLastWeekDates(): { date: string; dateObj: Date }[] {
  // Returns the previous Monday-Sunday week (or current week if it's Sunday and we want to show "this past week")
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // Find start of THIS week (Monday)
  const thisMonday = new Date(now);
  const daysFromMonday = day === 0 ? 6 : day - 1;
  thisMonday.setDate(now.getDate() - daysFromMonday);
  thisMonday.setHours(0, 0, 0, 0);

  // Start of last week (previous Monday)
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lastMonday);
    d.setDate(lastMonday.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return { date: `${yyyy}-${mm}-${dd}`, dateObj: d };
  });
}

export default function WeeklyReview({ userId }: WeeklyReviewProps) {
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [weekInfo, setWeekInfo] = useState<{ start: string; end: string }>({ start: "", end: "" });

  useEffect(() => {
    async function fetchWeek() {
      setLoading(true);
      const week = getLastWeekDates();
      const dates = week.map((w) => w.date);

      // Fetch user's logs + plans for last week
      const [logsRes, plansRes] = await Promise.all([
        supabase
          .from("qt_logs")
          .select("date, meditation, application, prayer")
          .eq("user_id", userId)
          .in("date", dates),
        supabase
          .from("qt_plans")
          .select("date, title, reference")
          .in("date", dates),
      ]);

      const logMap = new Map(logsRes.data?.map((l) => [l.date, l]) ?? []);
      const planMap = new Map(plansRes.data?.map((p) => [p.date, p]) ?? []);

      const items: DayEntry[] = week.map(({ date }) => {
        const log = logMap.get(date);
        const plan = planMap.get(date);
        return {
          date,
          hasLog: !!log,
          planTitle: plan?.title ?? null,
          planReference: plan?.reference ?? null,
          meditation: log?.meditation ?? null,
          application: log?.application ?? null,
          prayer: log?.prayer ?? null,
        };
      });

      setEntries(items);
      setWeekInfo({
        start: `${week[0].dateObj.getMonth() + 1}/${week[0].dateObj.getDate()}`,
        end: `${week[6].dateObj.getMonth() + 1}/${week[6].dateObj.getDate()}`,
      });
      setLoading(false);
    }

    fetchWeek();
  }, [userId]);

  const completedCount = entries.filter((e) => e.hasLog).length;

  if (loading) {
    return <div className="h-48 rounded-2xl bg-muted/40 animate-pulse" />;
  }

  if (completedCount === 0) {
    return null; // Don't show widget if no QT last week
  }

  return (
    <div className="rounded-2xl bg-card border border-border/40 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-primary/60 tracking-[0.12em] uppercase">Last Week</p>
              <h3 className="text-[14px] font-bold text-foreground">지난 주 돌아보기</h3>
            </div>
          </div>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
            {completedCount}/7
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/60 mt-1">{weekInfo.start} – {weekInfo.end}</p>
      </div>

      {/* Day grid */}
      <div className="px-4 pt-3 pb-2">
        <div className="grid grid-cols-7 gap-1.5">
          {entries.map((e, i) => {
            const dayLabel = DAY_LABELS[(i + 1) % 7]; // Monday=월
            return (
              <button
                key={e.date}
                onClick={() => setExpandedDate(expandedDate === e.date ? null : e.date)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-[9px] transition-all ${
                  e.hasLog
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "bg-muted/50 text-muted-foreground/40 border border-transparent"
                } ${expandedDate === e.date ? "ring-2 ring-primary/40" : ""}`}
              >
                <span className="font-medium opacity-60">{dayLabel}</span>
                <span className={`font-bold ${e.hasLog ? "text-[11px]" : "text-[10px]"}`}>
                  {e.date.split("-")[2]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded detail */}
      {expandedDate && (() => {
        const entry = entries.find((e) => e.date === expandedDate);
        if (!entry) return null;

        return (
          <div className="mx-4 mb-4 rounded-xl bg-muted/30 border border-border/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {entry.planReference && (
                  <span className="inline-block text-[9px] font-bold text-primary/70 tracking-[0.12em] uppercase bg-primary/8 px-1.5 py-0.5 rounded mb-1">
                    {entry.planReference}
                  </span>
                )}
                {entry.planTitle && (
                  <p className="text-[12px] font-semibold text-foreground leading-snug truncate">
                    {entry.planTitle}
                  </p>
                )}
              </div>
              <button
                onClick={() => setExpandedDate(null)}
                className="text-muted-foreground/40 hover:text-foreground"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            {!entry.hasLog ? (
              <p className="text-[11px] text-muted-foreground/60 text-center py-3">
                이 날은 묵상을 남기지 않았어요
              </p>
            ) : (
              <div className="space-y-2.5">
                {entry.meditation && (
                  <div>
                    <p className="text-[9px] font-bold text-primary/50 tracking-[0.15em] uppercase mb-0.5">묵상</p>
                    <p className="text-[11.5px] text-foreground/75 leading-[1.7] line-clamp-4">{entry.meditation}</p>
                  </div>
                )}
                {entry.application && (
                  <div>
                    <p className="text-[9px] font-bold text-primary/50 tracking-[0.15em] uppercase mb-0.5">적용</p>
                    <p className="text-[11.5px] text-foreground/75 leading-[1.7] line-clamp-3">{entry.application}</p>
                  </div>
                )}
                {entry.prayer && (
                  <div>
                    <p className="text-[9px] font-bold text-primary/50 tracking-[0.15em] uppercase mb-0.5">기도</p>
                    <p className="text-[11.5px] text-foreground/75 leading-[1.7] line-clamp-3">{entry.prayer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {!expandedDate && (
        <div className="px-5 pb-3 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/50">
          <ChevronDown className="w-3 h-3" />
          날짜를 눌러 자세히 보기
        </div>
      )}
    </div>
  );
}
