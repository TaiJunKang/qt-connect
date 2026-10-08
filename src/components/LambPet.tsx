import { useEffect, useState } from "react";

// 어린 양 키우기: 지금까지 쓴 큐티 날 수로 자라고, 오늘 썼는지에 따라 기분이 바뀜.
// 기존 기록만으로 계산하므로 DB·저장소를 쓰지 않음.

// 모두 같은 날 아기 양으로 새로 시작: 이 날짜부터 쓴 큐티만 셈
export const LAMB_START_DATE = "2026-10-08";

const STAGES = [
  { min: 0, name: "아기 양", scale: 0.8, fluff: 0 },
  { min: 7, name: "꼬마 양", scale: 0.88, fluff: 1 },
  { min: 30, name: "복슬 양", scale: 0.94, fluff: 2 },
  { min: 100, name: "화관 쓴 양", scale: 1, fluff: 2 },
];

function lambStage(total: number) {
  let i = 0;
  while (i + 1 < STAGES.length && total >= STAGES[i + 1].min) i++;
  const next = STAGES[i + 1];
  return { index: i, ...STAGES[i], next };
}

const HAPPY_LINES = ["오늘도 말씀 먹고 쑥쑥!", "같이 묵상해서 좋아요", "내일도 만나요!"];
const SLEEPY_LINES = ["말씀 먹으면 일어날래요… zzz", "오늘 말씀 기다리는 중…", "음냐… 큐티 쓰러 가요?"];

function LambSvg({ stage, happy }: { stage: number; happy: boolean }) {
  const { scale, fluff } = STAGES[stage];
  const wool = "#FFFFFF";
  const woolLine = "#E3D8CA";
  const face = "#6F5A48";
  // 몸통 털 뭉치: 단계가 오를수록 더 복슬복슬
  const puffs = [
    [42, 58, 15], [58, 52, 16], [74, 56, 15], [50, 68, 14], [68, 68, 14],
    ...(fluff >= 1 ? [[34, 66, 11], [82, 66, 11]] : []),
    ...(fluff >= 2 ? [[46, 46, 11], [66, 44, 12], [86, 54, 10]] : []),
  ] as const;

  return (
    <svg viewBox="4 22 100 72" className="w-full h-full overflow-visible" aria-hidden="true">
      <g className={happy ? "lamb-hop" : "lamb-breathe"} style={{ transformOrigin: "60px 90px", transformBox: "view-box" }}>
        <g transform={`translate(60 90) scale(${scale}) translate(-60 -90)`}>
          {/* 다리 */}
          {[44, 54, 66, 76].map((x) => (
            <rect key={x} x={x - 3} y={74} width={6} height={14} rx={3} fill={face} />
          ))}
          {/* 몸통 */}
          {puffs.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={wool} stroke={woolLine} strokeWidth={1.5} />
          ))}
          {puffs.map(([cx, cy, r], i) => (
            <circle key={`f${i}`} cx={cx} cy={cy} r={r - 1.5} fill={wool} />
          ))}
          {/* 귀 */}
          <ellipse cx={27} cy={47} rx={9} ry={4.5} fill={face} transform="rotate(-25 27 47)" />
          <ellipse cx={51} cy={45} rx={9} ry={4.5} fill={face} transform="rotate(25 51 45)" />
          {/* 얼굴 */}
          <ellipse cx={39} cy={54} rx={13} ry={14} fill={face} />
          {/* 앞머리 털 */}
          <circle cx={33} cy={41} r={6} fill={wool} />
          <circle cx={40} cy={39} r={6.5} fill={wool} />
          <circle cx={46} cy={42} r={5.5} fill={wool} />
          {/* 눈 */}
          {happy ? (
            <>
              <path d="M31 53 q3 -4 6 0" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" />
              <path d="M41 53 q3 -4 6 0" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M31 54 h6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
              <path d="M41 54 h6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
            </>
          )}
          {/* 볼 */}
          <circle cx={31} cy={60} r={2.6} fill="#E8957A" opacity={0.85} />
          <circle cx={47} cy={60} r={2.6} fill="#E8957A" opacity={0.85} />
          {/* 입 */}
          {happy ? (
            <path d="M36 62 q3 3 6 0" stroke="#FFFFFF" strokeWidth={1.6} fill="none" strokeLinecap="round" />
          ) : (
            <circle cx={39} cy={63} r={1.4} fill="#FFFFFF" />
          )}
          {/* 화관 */}
          {stage >= 3 && (
            <g>
              {[[29, 40, "#E8957A"], [36, 35, "#F3C969"], [44, 35, "#E8957A"], [50, 40, "#F3C969"]].map(([x, y, c], i) => (
                <g key={i}>
                  <circle cx={x as number} cy={y as number} r={3.4} fill={c as string} />
                  <circle cx={x as number} cy={y as number} r={1.3} fill="#FFFFFF" />
                </g>
              ))}
              <path d="M30 41 q10 -6 20 0" stroke="#7FA184" strokeWidth={1.4} fill="none" />
            </g>
          )}
        </g>
      </g>
      {!happy && (
        <g fill="#8A7F74" fontFamily="inherit" fontWeight={700}>
          <text x={20} y={44} fontSize={8} className="lamb-z">z</text>
          <text x={12} y={36} fontSize={11} className="lamb-z lamb-z2">z</text>
        </g>
      )}
    </svg>
  );
}

interface LambPetProps {
  total: number; // LAMB_START_DATE부터 큐티 쓴 날 수
  happy: boolean; // 오늘(선택한 날) 썼는지
}

export default function LambPet({ total, happy }: LambPetProps) {
  const stage = lambStage(total);
  const [line, setLine] = useState<string | null>(null);
  const progress = stage.next ? Math.round(((total - stage.min) / (stage.next.min - stage.min)) * 100) : 100;

  // 말풍선은 잠깐 보였다가 다시 성장 막대로
  useEffect(() => {
    if (!line) return;
    const t = setTimeout(() => setLine(null), 3500);
    return () => clearTimeout(t);
  }, [line]);

  const talk = () => {
    const lines = happy ? HAPPY_LINES : SLEEPY_LINES;
    setLine(lines[Math.floor(Math.random() * lines.length)]);
  };

  return (
    <section className="rounded-[20px] bg-card border border-border px-4 py-3 flex items-center gap-3">
      <button
        onClick={talk}
        aria-label={`${stage.name}, ${happy ? "기분 좋음" : "졸고 있음"}. 눌러서 말 걸기`}
        className="relative w-[84px] h-[60px] flex-shrink-0 -my-1"
      >
        <LambSvg stage={stage.index} happy={happy} />
      </button>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[14px] font-bold">나의 {stage.name}</span>
          <span className="text-[12px] text-muted-foreground">Lv.{stage.index + 1}</span>
        </div>
        {line ? (
          <p className="text-[13px] text-foreground/80 leading-snug" aria-live="polite">“{line}”</p>
        ) : (
          <>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-sage transition-[width] duration-700" style={{ width: `${Math.max(progress, 4)}%` }} />
            </div>
            <p className="text-[12px] text-muted-foreground">
              {stage.next ? `큐티 ${stage.next.min - total}번 더 쓰면 ${stage.next.name}으로 자라요` : `큐티 ${total}번, 다 자랐어요!`}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
