import { useEffect, useState } from "react";
import { Flame, CalendarDays, BookOpen, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculateBadges, type BadgeWithStatus } from "@/lib/badges";
import BadgeGrid from "./BadgeGrid";

interface MyStatsProps {
  userId: string;
}

interface StatsData {
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
  thisMonthDays: number;
  thisMonthTotal: number;
  monthlyHeatmap: number[]; // 1~31일 각 날짜에 기록 있으면 1, 없으면 0
  badges: BadgeWithStatus[];
}

function getDateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function calcStreaks(sortedDates: string[]): { current: number; longest: number } {
  if (sortedDates.length === 0) return { current: 0, longest: 0 };

  let current = 0;
  let longest = 0;
  let streak = 1;

  const now = new Date();
  const todayKey = getDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  const dateSet = new Set(sortedDates);
  const hasToday = dateSet.has(todayKey);
  const hasYesterday = dateSet.has(yesterdayKey);

  // Calculate current streak going backwards from today
  if (hasToday || hasYesterday) {
    const startDate = hasToday ? new Date(now) : new Date(yesterday);
    current = 1;
    const check = new Date(startDate);
    check.setDate(check.getDate() - 1);
    while (true) {
      if (dateSet.has(getDateKey(check))) {
        current++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak (YYYY-MM-DD sorts lexicographically)
  const uniqueDates = [...dateSet].sort();
  if (uniqueDates.length > 0) {
    streak = 1;
    longest = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + "T00:00:00");
      const curr = new Date(uniqueDates[i] + "T00:00:00");
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
        longest = Math.max(longest, streak);
      } else {
        streak = 1;
      }
    }
    longest = Math.max(longest, streak);
  }

  return { current, longest };
}

export default function MyStats({ userId }: MyStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);

      // Fetch all user data in parallel for badge calculation
      const [logsRes, publicLogsRes, prayersRes, responsesRes] = await Promise.all([
        supabase.from("qt_logs").select("date, created_at").eq("user_id", userId).order("created_at", { ascending: true }),
        supabase.from("qt_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_public", true),
        supabase.from("prayer_requests").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("prayer_responses").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      const data = logsRes.data ?? [];
      const uniqueDates = [...new Set(data.map((d) => d.date))];
      const { current, longest } = calcStreaks(uniqueDates);

      const now = new Date();
      const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const thisMonthDates = uniqueDates.filter((d) => d.startsWith(`${thisMonthPrefix}-`));

      // Build heatmap for current month
      const heatmap = Array(daysInMonth).fill(0);
      const thisMonthSet = new Set(thisMonthDates);
      for (let day = 1; day <= daysInMonth; day++) {
        const key = `${thisMonthPrefix}-${String(day).padStart(2, "0")}`;
        if (thisMonthSet.has(key)) heatmap[day - 1] = 1;
      }

      const badges = calculateBadges({
        totalDays: uniqueDates.length,
        currentStreak: current,
        longestStreak: longest,
        publicShareCount: publicLogsRes.count ?? 0,
        prayerRequestCount: prayersRes.count ?? 0,
        prayerResponseCount: responsesRes.count ?? 0,
      });

      setStats({
        totalDays: uniqueDates.length,
        currentStreak: current,
        longestStreak: longest,
        thisMonthDays: thisMonthDates.length,
        thisMonthTotal: daysInMonth,
        monthlyHeatmap: heatmap,
        badges,
      });
      setLoading(false);
    }

    fetchStats();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 rounded-2xl bg-muted/50 animate-pulse" />
        <div className="h-16 rounded-2xl bg-muted/50 animate-pulse" />
      </div>
    );
  }

  if (!stats) return null;

  const now = new Date();
  const monthLabel = `${now.getMonth() + 1}월`;
  const pct = stats.thisMonthTotal > 0 ? Math.round((stats.thisMonthDays / stats.thisMonthTotal) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200/40 px-3 py-4 text-center shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.currentStreak}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">연속 묵상</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/15 px-3 py-4 text-center shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.longestStreak}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">최장 연속</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/40 px-3 py-4 text-center shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalDays}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">총 묵상일</p>
        </div>
      </div>

      {/* Monthly heatmap */}
      <div className="rounded-2xl bg-card border border-border/40 px-4 py-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[13px] font-semibold text-foreground">{monthLabel} 묵상 기록</span>
          </div>
          <span className="text-[11px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-md">{stats.thisMonthDays}/{stats.thisMonthTotal}일</span>
        </div>

        {/* Heatmap grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Day labels */}
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="text-[9px] text-muted-foreground/60 text-center font-medium">{d}</div>
          ))}

          {/* Empty cells for offset */}
          {Array.from({ length: new Date(now.getFullYear(), now.getMonth(), 1).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day cells */}
          {stats.monthlyHeatmap.map((filled, i) => {
            const day = i + 1;
            const isToday = day === now.getDate();
            const isPast = day <= now.getDate();

            return (
              <div
                key={day}
                className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium transition-all ${
                  filled
                    ? "bg-primary text-primary-foreground"
                    : isPast
                      ? "bg-muted/60 text-muted-foreground/50"
                      : "bg-muted/30 text-muted-foreground/30"
                } ${isToday && !filled ? "ring-1 ring-primary/40" : ""}`}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
      </div>

      {/* Badge grid */}
      <BadgeGrid badges={stats.badges} />
    </div>
  );
}
