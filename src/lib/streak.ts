// 연속 기록 계산. 주일은 QT를 쉬는 날이므로 비어 있어도 연속이 끊기지 않음
// (주일에 작성했다면 그날도 하루로 셈)
import { getDateKey, parseDateKey } from "./date";

export function calcStreaks(dates: string[], now = new Date()): { current: number; longest: number } {
  const dateSet = new Set(dates);
  if (dateSet.size === 0) return { current: 0, longest: 0 };
  const earliest = [...dateSet].sort()[0];

  // 현재 연속: 오늘 아직 안 썼으면 어제부터 거슬러 올라감
  let current = 0;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!dateSet.has(getDateKey(d))) d.setDate(d.getDate() - 1);
  while (getDateKey(d) >= earliest) {
    if (dateSet.has(getDateKey(d))) current++;
    else if (d.getDay() !== 0) break;
    d.setDate(d.getDate() - 1);
  }

  // 최장 연속: 인접한 두 기록 사이가 하루이거나, 비어 있는 날이 주일뿐이면 이어진 것으로 봄
  const sorted = [...dateSet].sort();
  let longest = 1;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = parseDateKey(sorted[i - 1]);
    gap.setDate(gap.getDate() + 1);
    const curr = sorted[i];
    let connected = true;
    while (getDateKey(gap) < curr) {
      if (gap.getDay() !== 0) { connected = false; break; }
      gap.setDate(gap.getDate() + 1);
    }
    streak = connected ? streak + 1 : 1;
    longest = Math.max(longest, streak);
  }

  return { current, longest };
}
