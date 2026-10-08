import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDateKey } from "@/lib/date";
import LambSvg, { LAMB_SCALE } from "./LambSvg";
import { LAMB_START_DATE, LAMB_STAGES, lambStageOf, withRo } from "./stages";

// 큐티를 저장하면 이 이벤트로 알려서 양이 바로 자라게 함
export const QT_SAVED_EVENT = "qt-saved";

const HAPPY_LINES = ["오늘도 말씀 먹고 쑥쑥!", "같이 묵상해서 좋아요", "내일도 만나요!", "메에~"];
const SLEEPY_LINES = ["음냐… 큐티 쓰러 가요?", "말씀 먹으면 일어날래요…", "오늘 말씀 기다리는 중… zzz"];

function useLambProgress(userId: string) {
  const [total, setTotal] = useState(0);
  const [happy, setHappy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("qt_logs").select("date").eq("user_id", userId).gte("date", LAMB_START_DATE);
    const dates = new Set((data ?? []).map((r) => r.date));
    setTotal(dates.size);
    setHappy(dates.has(getDateKey(new Date())));
  }, [userId]);

  useEffect(() => {
    load();
    window.addEventListener(QT_SAVED_EVENT, load);
    return () => window.removeEventListener(QT_SAVED_EVENT, load);
  }, [load]);

  return { total, happy };
}

interface LambBuddyProps {
  userId: string;
  raised?: boolean; // 쓰기 화면처럼 하단에 고정 바가 있을 때 그 위로 비켜섬
}

export default function LambBuddy({ userId, raised = false }: LambBuddyProps) {
  const { total, happy } = useLambProgress(userId);
  const { index, stage, next, progress } = lambStageOf(total);
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // 바깥을 누르면 닫힘
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const toggle = () => {
    const lines = happy ? HAPPY_LINES : SLEEPY_LINES;
    setLine(lines[Math.floor(Math.random() * lines.length)]);
    setOpen((v) => !v);
  };

  return (
    <div
      ref={panelRef}
      className={`fixed right-3 z-40 md:right-6 transition-[bottom] duration-300 ${
        raised
          ? "bottom-[calc(190px+env(safe-area-inset-bottom))] md:bottom-44"
          : "bottom-[calc(64px+env(safe-area-inset-bottom))] md:bottom-6"
      }`}
    >
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-[min(300px,calc(100vw-24px))] rounded-[22px] bg-card border border-border shadow-glow p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-[96px] h-[96px] rounded-2xl bg-secondary flex-shrink-0">
              <LambSvg stage={index} happy={happy} className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[12px] font-bold text-primary">Lv.{index + 1}</p>
                  <p className="text-[16px] font-extrabold leading-tight">나의 {stage.name}</p>
                </div>
                <button onClick={() => setOpen(false)} aria-label="닫기" className="w-8 h-8 -mr-2 -mt-1 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[13px] text-foreground/80 mt-1.5" aria-live="polite">“{line}”</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-sage transition-[width] duration-700" style={{ width: `${Math.max(progress, 3)}%` }} />
            </div>
            <p className="text-[12px] text-muted-foreground">
              {next
                ? `큐티 ${next.min - total}번 더 쓰면 ${withRo(next.name)} 자라요`
                : `1년을 함께 채웠어요. 최종 진화 완료!`}
            </p>
          </div>

          {/* 성장 단계 */}
          <ol className="flex items-center justify-between pt-1" aria-label="성장 단계">
            {LAMB_STAGES.map((st, i) => (
              <li key={st.name} className="flex flex-col items-center gap-1" title={`${st.name} · ${st.min}번`}>
                <span className={`w-2.5 h-2.5 rounded-full ${i < index ? "bg-sage" : i === index ? "bg-primary ring-4 ring-primary-soft" : "bg-secondary"}`} />
                <span className={`text-[10px] tabular-nums ${i === index ? "font-bold text-foreground" : "text-muted-foreground"}`}>{st.min === 365 ? "1년" : st.min}</span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-muted-foreground text-center">10월 8일부터 쓴 큐티로 함께 자라요</p>
        </div>
      )}

      <button
        onClick={toggle}
        aria-expanded={open}
        aria-label={`나의 ${stage.name}, ${happy ? "오늘 큐티 완료" : "오늘 큐티 전"}. 눌러서 성장 현황 보기`}
        className="block w-[76px] h-[76px] md:w-[84px] md:h-[84px] active:scale-95 transition-transform"
      >
        {/* 작은 단계도 잘 보이도록 떠다니는 양은 덜 작게 (실제 크기 차이는 카드에서) */}
        <LambSvg stage={index} happy={happy} className="w-full h-full origin-bottom drop-shadow-[0_2px_3px_rgba(59,46,37,0.12)]"
          style={{ transform: `scale(${Math.min(1.7, 0.95 / Math.pow(LAMB_SCALE[index], 0.75)).toFixed(2)})` }} />
      </button>
    </div>
  );
}
