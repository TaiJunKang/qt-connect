import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MyStats from "./MyStats";
import UserAvatar from "./UserAvatar";
import { useMyCommunityName } from "@/lib/community";

interface RankingTabProps {
  userId: string;
}

interface Member {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  count: number;
}

// 매달 공동체가 함께 채우는 묵상 목표 (비공개 묵상 포함, 한 사람의 하루 묵상 = 1번)
const MONTHLY_GOAL = 200;

const prevOf = (y: number, m: number) => (m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 });

export default function RankingTab({ userId }: RankingTabProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [members, setMembers] = useState<Member[]>([]);
  const [prevTotal, setPrevTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const communityName = useMyCommunityName(userId);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  // 이번 달은 오늘까지 지난 날 수, 지난 달은 그 달 전체
  const elapsedDays = isCurrentMonth ? now.getDate() : daysInMonth;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const p = prevOf(year, month);
      // 비공개 QT도 포함한 사용자별 참여일 수 (DB 함수, 내용은 노출 안 됨)
      const [cur, prev] = await Promise.all([
        supabase.rpc("get_monthly_ranking", { p_year: year, p_month: month }),
        supabase.rpc("get_monthly_ranking", { p_year: p.y, p_month: p.m }),
      ]);
      const rows = cur.error ? [] : cur.data ?? [];
      const ids = rows.map((r) => r.user_id);
      const avatars = new Map<string, string | null>();
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, avatar_url").in("user_id", ids);
        for (const pr of profiles ?? []) avatars.set(pr.user_id, pr.avatar_url);
      }
      if (cancelled) return;
      setMembers(rows.map((r) => ({ user_id: r.user_id, user_name: r.user_name, avatar_url: avatars.get(r.user_id) ?? null, count: Number(r.count) })));
      setPrevTotal((prev.data ?? []).reduce((sum, r) => sum + Number(r.count), 0));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [year, month]);

  const total = members.reduce((sum, m) => sum + m.count, 0);
  const prevLabel = `${prevOf(year, month).m}월`;
  const progress = Math.min(100, Math.round((total / MONTHLY_GOAL) * 100));
  const remaining = Math.max(0, MONTHLY_GOAL - total);

  const go = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const memberList = (
    <section className="rounded-[22px] bg-card border border-border p-[18px] space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold">{isCurrentMonth ? "이번 달" : `${month}월에`} 함께한 지체</h2>
        <span className="text-[12px] text-muted-foreground">참여일 순</span>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-9 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : members.length === 0 ? (
        <p className="text-[14px] text-muted-foreground text-center py-6">아직 참여 기록이 없어요</p>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => {
            const isMe = m.user_id === userId;
            const pct = Math.min(100, Math.round((m.count / elapsedDays) * 100));
            return (
              <li key={m.user_id} className="flex items-center gap-3">
                <UserAvatar name={m.user_name} avatarUrl={m.avatar_url} size="md" className="!w-9 !h-9" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className={`text-[15px] truncate ${isMe ? "font-bold text-primary" : "font-medium"}`}>
                    {m.user_name}{isMe && " (나)"}
                  </p>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, 3)}%` }} />
                  </div>
                </div>
                <span className="w-10 text-right text-[14px] font-bold tabular-nums">{m.count}일</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[12px] text-muted-foreground text-center pt-1">
        막대는 {isCurrentMonth ? `이번 달 지난 ${elapsedDays}일` : `${month}월 ${daysInMonth}일`} 중 묵상한 날이에요
      </p>
    </section>
  );

  return (
    <div className="px-4 pt-6 pb-6 space-y-4 max-w-lg mx-auto md:max-w-2xl md:px-6">
      <header className="flex items-end justify-between px-1">
        <h1 className="text-[25px] font-extrabold tracking-[-0.03em]">함께</h1>
        <div className="flex items-center -mr-2">
          <button onClick={() => go(-1)} aria-label="이전 달" className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-medium text-muted-foreground tabular-nums">{year}년 {month}월</span>
          <button onClick={() => go(1)} disabled={isCurrentMonth} aria-label="다음 달" className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-25 disabled:pointer-events-none">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── 공동체 목표 ── */}
      <section className="rounded-3xl bg-foreground text-background px-5 py-[22px] space-y-3.5">
        <p className="text-[13px] font-medium opacity-75">
          {isCurrentMonth ? "이번 달" : `${month}월`} {communityName ?? "우리 공동체"} 묵상 목표
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[44px] font-extrabold tracking-[-0.03em] leading-none tabular-nums">{loading ? "–" : total}</span>
          <span className="text-[16px] font-medium opacity-75">/ {MONTHLY_GOAL}번</span>
        </div>
        <div className="h-2.5 rounded-full bg-background/20 overflow-hidden" role="img" aria-label={`목표 ${MONTHLY_GOAL}번 중 ${total}번, ${progress}%`}>
          <div className="h-full rounded-full bg-[#E08A5F] transition-[width] duration-700" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[14px] font-semibold leading-relaxed">
          {loading
            ? " "
            : remaining === 0
              ? "목표를 다 채웠어요! 함께해 주셔서 감사해요."
              : isCurrentMonth
                ? `목표까지 ${remaining}번 남았어요. ${members.length > 0 ? `${members.length}명이 함께하는 중이에요.` : "첫 묵상을 시작해 주세요."}`
                : `${progress}% 채웠어요. ${members.length}명이 함께했어요.`}
        </p>
        <p className="text-[12px] opacity-60 leading-relaxed">
          {prevTotal > 0 && `${prevLabel}에는 ${prevTotal}번. `}한 사람이 하루 묵상하면 1번, 비공개 묵상도 함께 세요.
        </p>
      </section>

      <MyStats userId={userId} middle={memberList} />
    </div>
  );
}
