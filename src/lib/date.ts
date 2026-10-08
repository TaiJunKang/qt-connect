// QT 날짜 키("YYYY-MM-DD")는 항상 로컬(KST) 날짜 기준
export function getDateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// "YYYY-MM-DD"를 로컬 날짜로 해석 (new Date(str)은 UTC로 해석됨)
export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
