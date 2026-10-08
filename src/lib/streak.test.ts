import { describe, expect, it } from "vitest";
import { calcStreaks } from "./streak";

// 2026-10-08은 목요일, 2026-10-04는 주일
const now = new Date(2026, 9, 8, 10, 0, 0);

describe("calcStreaks", () => {
  it("주일이 비어 있어도 연속이 이어진다", () => {
    const dates = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05", "2026-10-06", "2026-10-07"];
    expect(calcStreaks(dates, now)).toEqual({ current: 6, longest: 6 });
  });

  it("평일이 비면 연속이 끊긴다", () => {
    expect(calcStreaks(["2026-10-05", "2026-10-07"], now)).toEqual({ current: 1, longest: 1 });
  });

  it("오늘 작성분을 포함한다", () => {
    expect(calcStreaks(["2026-10-07", "2026-10-08"], now).current).toBe(2);
  });

  it("주일에 작성했다면 하루로 센다", () => {
    expect(calcStreaks(["2026-10-03", "2026-10-04", "2026-10-05"], new Date(2026, 9, 5)).current).toBe(3);
  });

  it("어제까지 안 썼으면 0", () => {
    expect(calcStreaks(["2026-10-01"], now)).toEqual({ current: 0, longest: 1 });
  });
});
