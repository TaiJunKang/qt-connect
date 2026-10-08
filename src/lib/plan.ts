// 제목 끝에 본문 범위가 중복으로 붙은 경우 제거: "광야 여정 회고 (신명기 1장)" → "광야 여정 회고"
export function cleanPlanTitle(title: string, reference: string) {
  const suffix = `(${reference.trim()})`;
  return title.trim().endsWith(suffix) ? title.trim().slice(0, -suffix.length).trim() : title;
}
