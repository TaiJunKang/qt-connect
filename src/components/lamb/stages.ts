// 어린 양 키우기: 모두 같은 날 새로 시작해서, 이 날짜부터 쓴 큐티 날 수로 자람. 1년(365일)이면 최종 진화
export const LAMB_START_DATE = "2026-10-08";

export interface LambStage {
  min: number;
  name: string;
}

export const LAMB_STAGES: LambStage[] = [
  { min: 0, name: "털뭉치" },
  { min: 1, name: "아기 양" },
  { min: 7, name: "꼬마 양" },
  { min: 30, name: "복슬 양" },
  { min: 100, name: "리본 양" },
  { min: 200, name: "꽃관 양" },
  { min: 300, name: "구름 양" },
  { min: 365, name: "빛의 어린 양" },
];

export function lambStageOf(total: number) {
  let index = 0;
  while (index + 1 < LAMB_STAGES.length && total >= LAMB_STAGES[index + 1].min) index++;
  const stage = LAMB_STAGES[index];
  const next = LAMB_STAGES[index + 1];
  const progress = next ? Math.round(((total - stage.min) / (next.min - stage.min)) * 100) : 100;
  return { index, stage, next, progress };
}

// 받침 있으면 "으로", 없으면 "로"
export function withRo(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0 && code % 28 !== 8;
  return `${word}${hasFinal ? "으로" : "로"}`;
}
