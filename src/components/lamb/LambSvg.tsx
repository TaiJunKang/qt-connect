// 하찮고 귀여운 어린 양 (정면, 갈색 외곽선 스티커 스타일)
// stage 0~7 (털뭉치 → 빛의 어린 양), happy: 오늘 큐티를 썼으면 신나고 아니면 꾸벅꾸벅

const OUT = "#9A6B4F"; // 외곽선
const INK = "#5A3A28"; // 눈·입
const FACE = "#FFF1E4";
const HORN = "#E8B48A";
const BLUSH = "#F4A79A";
const W = 2.2; // 외곽선 두께

// 단계별 크기: 털뭉치는 아주 작게, 최종 단계로 갈수록 확실히 커짐
export const LAMB_SCALE = [0.5, 0.6, 0.7, 0.8, 0.86, 0.92, 0.97, 1.03];

function ring(cx: number, cy: number, rx: number, ry: number, n: number, r: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a), r] as const;
  });
}

// 테두리가 하나로 이어진 몽글몽글 털 (외곽선 원 → 그 위에 조금 작은 털 원)
function Wool({ parts, fill }: { parts: readonly (readonly [number, number, number])[]; fill: string }) {
  return (
    <>
      {parts.map(([x, y, r], i) => <circle key={`o${i}`} cx={x} cy={y} r={r} fill={OUT} />)}
      {parts.map(([x, y, r], i) => <circle key={`i${i}`} cx={x} cy={y} r={r - W} fill={fill} />)}
    </>
  );
}

function Horn({ x, y, r, flip }: { x: number; y: number; r: number; flip?: boolean }) {
  const d = flip ? -1 : 1;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={HORN} stroke={OUT} strokeWidth={W * 0.85} />
      {r > 4 && (
        <path
          d={`M${x + d * r * 0.55} ${y} A${r * 0.55} ${r * 0.55} 0 1 ${flip ? 0 : 1} ${x} ${y - r * 0.55} A${r * 0.3} ${r * 0.3} 0 1 ${flip ? 0 : 1} ${x - d * r * 0.1} ${y + r * 0.15}`}
          stroke={OUT} strokeWidth={1.3} fill="none" strokeLinecap="round"
        />
      )}
    </g>
  );
}

function Face({ happy, cy }: { happy: boolean; cy: number }) {
  const ey = cy - 1;
  return (
    <g>
      <ellipse cx={50} cy={cy} rx={12.5} ry={9.5} fill={FACE} stroke={OUT} strokeWidth={W * 0.8} />
      {happy ? (
        <>
          <path d={`M42.3 ${ey + 0.8} q1.7 -2.4 3.4 0`} stroke={INK} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          <path d={`M54.3 ${ey + 0.8} q1.7 -2.4 3.4 0`} stroke={INK} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          <path d={`M48.4 ${cy + 3} q1.6 2 3.2 0`} stroke={INK} strokeWidth={1.3} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d={`M42.3 ${ey} h3.4`} stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
          <path d={`M54.3 ${ey} h3.4`} stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
          <ellipse cx={50} cy={cy + 3.4} rx={0.9} ry={0.7} fill={INK} />
          {/* 콧물 방울 */}
          <circle cx={53.6} cy={cy + 2.6} r={2.5} fill="#D7E9F4" stroke="#A9C9DE" strokeWidth={0.6} className="lamb-bubble" style={{ transformOrigin: `52px ${cy + 2.6}px` }} />
        </>
      )}
      <ellipse cx={40.5} cy={cy + 2.6} rx={2.3} ry={1.5} fill={BLUSH} opacity={0.8} />
      <ellipse cx={59.5} cy={cy + 2.6} rx={2.3} ry={1.5} fill={BLUSH} opacity={0.8} />
    </g>
  );
}

function Sparkle({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  return (
    <path
      d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z`}
      fill="#F3C969"
      className="lamb-twinkle"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

function Zzz({ x, y }: { x: number; y: number }) {
  return (
    <g fill="#8A7F74" fontWeight={800} fontFamily="inherit">
      <text x={x} y={y} fontSize={8} className="lamb-z">z</text>
      <text x={x + 6} y={y - 8} fontSize={11} className="lamb-z lamb-z2">z</text>
    </g>
  );
}

export default function LambSvg({ stage, happy, className = "", style }: { stage: number; happy: boolean; className?: string; style?: React.CSSProperties }) {
  const s = LAMB_SCALE[stage];
  const wool = stage >= 7 ? "#FFF3D2" : "#FFFFFF";
  const hasBody = stage >= 1;
  // 털뭉치는 머리만 있어서 바닥까지 내려 앉힘
  const headY = hasBody ? 40 : 74;

  const head = [[50, headY, 15], ...ring(50, headY, stage >= 3 ? 17 : 15, stage >= 3 ? 11.5 : 10, stage >= 3 ? 13 : 11, 6.8)] as const;
  const body = [[50, 68, 14], ...ring(50, 68, stage >= 6 ? 16 : 14, 14, stage >= 6 ? 12 : 10, 7.2)] as const;

  return (
    <svg viewBox="4 8 92 90" className={`overflow-visible ${className}`} style={style} aria-hidden="true">
      <ellipse cx={50} cy={93} rx={(hasBody ? 20 : 15) * s} ry={2.4} fill={INK} opacity={0.1} />
      <g className={happy ? "lamb-hop" : "lamb-breathe"} style={{ transformOrigin: "50px 92px" }}>
        <g transform={`translate(50 92) scale(${s}) translate(-50 -92)`}>
          {hasBody && (
            <>
              {/* 발 */}
              <ellipse cx={43} cy={85} rx={5} ry={3.6} fill={FACE} stroke={OUT} strokeWidth={W * 0.85}
                className={stage === 1 ? "lamb-wobble" : undefined} style={stage === 1 ? { transformOrigin: "43px 80px" } : undefined} />
              <ellipse cx={57} cy={85} rx={5} ry={3.6} fill={FACE} stroke={OUT} strokeWidth={W * 0.85}
                className={stage === 1 ? "lamb-wobble" : undefined} style={stage === 1 ? { transformOrigin: "57px 80px", animationDelay: "0.45s" } : undefined} />
              {/* 몸통 */}
              <Wool parts={body} fill={wool} />
              {/* 팔 */}
              <path d="M38.5 62 q-4.5 3 -2.2 8.4" stroke={OUT} strokeWidth={W * 0.8} fill="none" strokeLinecap="round" />
              <path d="M61.5 62 q4.5 3 2.2 8.4" stroke={OUT} strokeWidth={W * 0.8} fill="none" strokeLinecap="round" />
              {/* 방울 (꼬마 양, 복슬 양) */}
              {(stage === 2 || stage === 3) && (
                <g>
                  <circle cx={50} cy={58.5} r={3.3} fill="#F3C969" stroke={OUT} strokeWidth={1.2} />
                  <circle cx={50} cy={59.6} r={0.9} fill={OUT} />
                </g>
              )}
            </>
          )}

          {/* 머리 털 */}
          <Wool parts={head} fill={wool} />
          {/* 뿔: 꼬마 양은 살짝, 복슬 양부터 동그랗게 말린 뿔 */}
          {stage === 2 && (
            <>
              <Horn x={33} y={headY - 2} r={3.6} />
              <Horn x={67} y={headY - 2} r={3.6} flip />
            </>
          )}
          {stage >= 3 && (
            <>
              <Horn x={31.5} y={headY - 1} r={6.6} />
              <Horn x={68.5} y={headY - 1} r={6.6} flip />
            </>
          )}
          <Face happy={happy} cy={headY + 4} />

          {/* 리본 (리본 양) */}
          {stage === 4 && (
            <g>
              <path d={`M50 ${headY - 11} l-6.5 -4 v8z`} fill="#E07B5A" stroke={OUT} strokeWidth={1.2} strokeLinejoin="round" />
              <path d={`M50 ${headY - 11} l6.5 -4 v8z`} fill="#E07B5A" stroke={OUT} strokeWidth={1.2} strokeLinejoin="round" />
              <circle cx={50} cy={headY - 11} r={2} fill="#C9603F" stroke={OUT} strokeWidth={1} />
            </g>
          )}
          {/* 꽃관 (꽃관 양, 구름 양) */}
          {(stage === 5 || stage === 6) && (
            <g>
              {([[39, headY - 10, "#F4A79A"], [44.5, headY - 13, "#F3C969"], [50, headY - 14, "#F4A79A"], [55.5, headY - 13, "#F3C969"], [61, headY - 10, "#F4A79A"]] as const).map(([x, y, c], i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r={2.8} fill={c} stroke={OUT} strokeWidth={1} />
                  <circle cx={x} cy={y} r={0.9} fill="#FFFFFF" />
                </g>
              ))}
            </g>
          )}
          {/* 후광 (빛의 어린 양) */}
          {stage === 7 && (
            <ellipse cx={50} cy={headY - 19} rx={11} ry={3} fill="none" stroke="#F3C969" strokeWidth={2.4} className="lamb-glow" />
          )}
        </g>
      </g>
      {/* 반짝이 (구름 양, 빛의 어린 양) */}
      {stage >= 6 && (
        <g>
          <Sparkle x={84} y={34} s={3.6} delay={0} />
          <Sparkle x={15} y={62} s={2.8} delay={0.7} />
          <Sparkle x={80} y={72} s={2.4} delay={1.3} />
        </g>
      )}
      {/* 졸 때 z는 머리 오른쪽 위에 (단계별 크기에 맞춰 위치 계산) */}
      {!happy && <Zzz x={50 + (66 - 50) * s} y={92 + (headY - 12 - 92) * s} />}
    </svg>
  );
}
