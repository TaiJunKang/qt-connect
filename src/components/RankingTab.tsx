import { useEffect, useState } from "react";
import { Trophy, RefreshCw, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MyStats from "./MyStats";

interface RankingTabProps {
  userId: string;
}

interface RankEntry {
  user_name: string;
  count: number;
}

const MEDAL = ["🥇", "🥈", "🥉"];

function getMonthRange(year: number, month: number) {
  // month: 1-indexed
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month)}-01T00:00:00.000Z`;
  const nextMonth = month === 12 ? `${year + 1}-01-01T00:00:00.000Z` : `${year}-${pad(month + 1)}-01T00:00:00.000Z`;
  return { start, end: nextMonth };
}

export default function RankingTab({ userId }: RankingTabProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myName, setMyName] = useState<string | null>(null);

  // Get current user's display name for highlighting
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", data.user.id)
        .single();
      setMyName(profile?.display_name ?? null);
    });
  }, []);

  const fetchRanking = async () => {
    setLoading(true);
    const { start, end } = getMonthRange(year, month);

    // Fetch all public + own logs in the month, count unique dates per user
    const { data } = await supabase
      .from("qt_logs")
      .select("user_name, date")
      .gte("created_at", start)
      .lt("created_at", end);

    if (data) {
      // Count unique dates per user_name (one QT per day counts as 1)
      const map = new Map<string, Set<string>>();
      for (const row of data) {
        if (!map.has(row.user_name)) map.set(row.user_name, new Set());
        map.get(row.user_name)!.add(row.date);
      }
      const entries: RankEntry[] = Array.from(map.entries())
        .map(([user_name, dates]) => ({ user_name, count: dates.size }))
        .sort((a, b) => b.count - a.count);
      setRanking(entries);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRanking(); }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const monthLabel = `${year}년 ${month}월`;
  const daysInMonth = new Date(year, month, 0).getDate();

  return (
    <div className="px-4 pt-7 pb-6 space-y-5 max-w-lg mx-auto md:max-w-2xl md:px-6">

      {/* My Stats Section */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
          <BarChart3 className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-medium tracking-[0.12em] uppercase">My Journey</p>
          <h1 className="text-xl font-bold text-foreground tracking-tight">내 묵상 통계</h1>
        </div>
      </div>
      <MyStats userId={userId} />

      {/* Divider */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 flex items-center justify-center border border-amber-200/30">
            <Trophy className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium tracking-[0.12em] uppercase">Monthly</p>
            <h1 className="text-xl font-bold text-foreground tracking-tight">참여 랭킹</h1>
          </div>
        </div>
        <button
          onClick={fetchRanking}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent border border-border/40 transition-all shadow-xs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between bg-card border border-border/40 rounded-2xl px-4 py-3 shadow-xs">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-accent border border-border/30 transition-all">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-[14px] font-bold text-foreground">{monthLabel}</span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-accent border border-border/30 transition-all disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Summary bar */}
      <p className="text-[12px] text-muted-foreground text-center">
        이번 달 총 <span className="font-semibold text-foreground">{daysInMonth}일</span> 중 참여일 수로 집계됩니다
      </p>

      {/* Ranking list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : ranking.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">아직 참여 기록이 없어요</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">큐티를 작성하면 랭킹에 반영됩니다 🙏</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {ranking.map((entry, idx) => {
            const isMe = myName && entry.user_name === myName;
            const pct = Math.round((entry.count / daysInMonth) * 100);
            const isTop3 = idx < 3;

            return (
              <div
                key={entry.user_name}
                className={`rounded-2xl overflow-hidden border transition-all ${
                  isMe
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border/50 bg-card"
                }`}
              >
                <div className="px-5 py-4 flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-8 text-center flex-shrink-0">
                    {isTop3 ? (
                      <span className="text-xl">{MEDAL[idx]}</span>
                    ) : (
                      <span className="text-[13px] font-bold text-muted-foreground">{idx + 1}</span>
                    )}
                  </div>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 mb-1.5">
                      <span className={`text-[13px] font-semibold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                        {entry.user_name}
                      </span>
                      {isMe && <span className="text-[10px] text-primary/60 font-medium flex-shrink-0">나</span>}
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isTop3 ? "bg-primary" : "bg-primary/40"
                        }`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>

                  {/* Count */}
                  <div className="flex-shrink-0 text-right">
                    <span className={`text-[15px] font-bold ${isMe ? "text-primary" : "text-foreground"}`}>
                      {entry.count}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-0.5">일</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
