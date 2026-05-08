import { writeFileSync } from "fs";

const SUPABASE_URL = "https://iftczxnootynvhxyqghv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGN6eG5vb3R5bnZoeHlxZ2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzQyNTMsImV4cCI6MjA5MzExMDI1M30.YjNH9nDGuVx-B9oo-KNaMqhCjRU7NT5Vd9VEtRH1rMM";

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmt(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function esc(s) {
  return (s || "").replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/\n/g, "\\n");
}

async function main() {
  // 페이지네이션으로 전체 가져오기
  let all = [];
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/qt_plans?select=date,title,reference,text,commentary,sermon_id&order=date.asc&limit=500&offset=${offset}`,
      { headers: { apikey: SUPABASE_KEY } }
    );
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 500) break;
    offset += 500;
  }
  console.log("전체 로드:", all.length);

  // 창세기 1장 찾아서 로테이션
  const idx = all.findIndex(p => p.reference === "창세기 1장");
  console.log("창세기 1장 위치:", idx);
  const rotated = [...all.slice(idx), ...all.slice(0, idx)];
  console.log("첫 5개:", rotated.slice(0, 5).map(p => p.reference));

  // 날짜 재배정: 2026-05-08부터, 일요일 제외
  let cur = new Date(2026, 4, 8);
  while (cur.getDay() === 0) cur = addDays(cur, 1);

  const inserts = [];
  for (const p of rotated) {
    const date = fmt(cur);
    const parts = [
      `'${date}'`,
      `E'${esc(p.title)}'`,
      `E'${esc(p.reference)}'`,
      `E'${esc(p.text)}'`,
      `E'${esc(p.commentary)}'`,
    ];
    if (p.sermon_id) parts.push(`'${p.sermon_id}'`);

    const cols = "date, title, reference, text, commentary" + (p.sermon_id ? ", sermon_id" : "");
    inserts.push(`INSERT INTO public.qt_plans (${cols}) VALUES (${parts.join(", ")});`);

    cur = addDays(cur, 1);
    while (cur.getDay() === 0) cur = addDays(cur, 1);
  }

  const lastDate = fmt(addDays(cur, -1));
  console.log(`날짜 범위: 2026-05-04 ~ ${lastDate}`);
  console.log(`총 ${inserts.length}개`);

  // 청크 분할
  const chunkSize = 50;
  let fileIdx = 0;

  // 첫 파일: DELETE + 첫 INSERT들
  const first = ["BEGIN;", "DELETE FROM public.qt_plans;", ...inserts.slice(0, chunkSize), "COMMIT;"];
  writeFileSync(`scripts/reorder-${String(fileIdx).padStart(2, "0")}.sql`, first.join("\n"), "utf8");
  fileIdx++;

  for (let i = chunkSize; i < inserts.length; i += chunkSize) {
    const batch = ["BEGIN;", ...inserts.slice(i, i + chunkSize), "COMMIT;"];
    writeFileSync(`scripts/reorder-${String(fileIdx).padStart(2, "0")}.sql`, batch.join("\n"), "utf8");
    fileIdx++;
  }
  console.log(`${fileIdx}개 SQL 파일 생성`);
}

main().catch(console.error);
