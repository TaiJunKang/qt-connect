import { writeFileSync } from "fs";

const SUPABASE_URL = "https://iftczxnootynvhxyqghv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGN6eG5vb3R5bnZoeHlxZ2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzQyNTMsImV4cCI6MjA5MzExMDI1M30.YjNH9nDGuVx-B9oo-KNaMqhCjRU7NT5Vd9VEtRH1rMM";

// 성경 66권 정경 순서
const BIBLE_ORDER = [
  "창세기","출애굽기","레위기","민수기","신명기",
  "여호수아","사사기","룻기","사무엘상","사무엘하",
  "열왕기상","열왕기하","역대상","역대하",
  "에스라","느헤미야","에스더","욥기","시편",
  "잠언","전도서","아가","이사야","예레미야",
  "예레미야애가","에스겔","다니엘","호세아","요엘",
  "아모스","오바댜","요나","미가","나훔",
  "하박국","스바냐","학개","스가랴","말라기",
  "마태복음","마가복음","누가복음","요한복음",
  "사도행전","로마서","고린도전서","고린도후서",
  "갈라디아서","에베소서","빌립보서","골로새서",
  "데살로니가전서","데살로니가후서","디모데전서","디모데후서",
  "디도서","빌레몬서","히브리서","야고보서",
  "베드로전서","베드로후서","요한일서","요한이서","요한삼서",
  "유다서","요한계시록",
];
const BOOK_INDEX = new Map(BIBLE_ORDER.map((b, i) => [b, i]));

// 별칭 매핑 (DB에 있는 변형 이름 → 정식 이름)
const ALIASES = {
  "요한1서": "요한일서",
  "요한2서": "요한이서",
  "요한삼서": "요한삼서",
};
for (const [alias, canon] of Object.entries(ALIASES)) {
  if (BOOK_INDEX.has(canon)) BOOK_INDEX.set(alias, BOOK_INDEX.get(canon));
}

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmt(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function esc(s) {
  return (s || "").replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/\n/g, "\\n");
}

// reference에서 책 이름과 장 번호 추출
// 긴 이름부터 매칭해야 "요한일서"가 "요한"보다 먼저 매칭됨
const ALL_BOOK_NAMES = [...BOOK_INDEX.keys()].sort((a, b) => b.length - a.length);

function parseRef(ref) {
  for (const book of ALL_BOOK_NAMES) {
    if (ref.startsWith(book)) {
      const rest = ref.slice(book.length).trim();
      const m = rest.match(/(\d+)/);
      const ch = m ? parseInt(m[1]) : 0;
      return { book, bookIdx: BOOK_INDEX.get(book), ch };
    }
  }
  return { book: ref, bookIdx: 999, ch: 0 };
}

async function main() {
  // 전체 가져오기
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

  // 성경 순서로 정렬
  all.sort((a, b) => {
    const pa = parseRef(a.reference);
    const pb = parseRef(b.reference);
    if (pa.bookIdx !== pb.bookIdx) return pa.bookIdx - pb.bookIdx;
    return pa.ch - pb.ch;
  });

  // 정렬 결과 확인
  console.log("정렬 후 처음 10개:");
  all.slice(0, 10).forEach(p => console.log(`  ${p.reference}`));
  console.log("...");
  console.log("정렬 후 마지막 5개:");
  all.slice(-5).forEach(p => console.log(`  ${p.reference}`));

  // 중복 제거 (같은 reference가 여러 번 있으면 text/commentary가 있는 것 우선)
  const seen = new Map();
  for (const p of all) {
    const key = p.reference;
    if (!seen.has(key)) {
      seen.set(key, p);
    } else {
      const existing = seen.get(key);
      // text나 commentary가 비어있으면 있는 걸로 대체
      if ((!existing.text || !existing.commentary) && (p.text || p.commentary)) {
        seen.set(key, { ...existing, text: p.text || existing.text, commentary: p.commentary || existing.commentary });
      }
    }
  }
  const unique = [...seen.values()];
  console.log(`중복 제거 후: ${unique.length}개 (원본 ${all.length}개)`);

  // 날짜 재배정: 2026-05-11부터, 일요일 제외
  let cur = new Date(2026, 4, 11);
  while (cur.getDay() === 0) cur = addDays(cur, 1);

  const inserts = [];
  for (const p of unique) {
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
  console.log(`날짜 범위: 2026-05-08 ~ ${lastDate}`);
  console.log(`총 ${inserts.length}개`);

  // 청크 분할
  const chunkSize = 50;
  let fileIdx = 0;

  // 첫 파일: DELETE + 첫 INSERT들
  const first = ["BEGIN;", "DELETE FROM public.qt_plans;", ...inserts.slice(0, chunkSize), "COMMIT;"];
  writeFileSync(`scripts/bible-order-${String(fileIdx).padStart(2, "0")}.sql`, first.join("\n"), "utf8");
  fileIdx++;

  for (let i = chunkSize; i < inserts.length; i += chunkSize) {
    const batch = ["BEGIN;", ...inserts.slice(i, i + chunkSize), "COMMIT;"];
    writeFileSync(`scripts/bible-order-${String(fileIdx).padStart(2, "0")}.sql`, batch.join("\n"), "utf8");
    fileIdx++;
  }
  console.log(`${fileIdx}개 SQL 파일 생성`);
}

main().catch(console.error);
