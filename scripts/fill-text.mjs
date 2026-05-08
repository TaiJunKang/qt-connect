/**
 * bible.txt에서 성경 본문을 추출하여 비어있는 qt_plans.text를 채우는 스크립트
 * SQL UPDATE 문을 생성하여 supabase db query로 실행
 */

import { readFileSync, writeFileSync } from "fs";

const SUPABASE_URL = "https://iftczxnootynvhxyqghv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGN6eG5vb3R5bnZoeHlxZ2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzQyNTMsImV4cCI6MjA5MzExMDI1M30.YjNH9nDGuVx-B9oo-KNaMqhCjRU7NT5Vd9VEtRH1rMM";

// 책 이름 → bible.txt 약어 매핑
const NAME_TO_ABBR = {
  "창세기": "창", "출애굽기": "출", "레위기": "레", "민수기": "민", "신명기": "신",
  "여호수아": "수", "사사기": "삿", "룻기": "룻", "사무엘상": "삼상", "사무엘하": "삼하",
  "열왕기상": "왕상", "열왕기하": "왕하", "역대상": "대상", "역대하": "대하",
  "에스라": "스", "느헤미야": "느", "에스더": "에", "욥기": "욥", "시편": "시",
  "잠언": "잠", "전도서": "전", "아가": "아", "이사야": "사", "예레미야": "렘",
  "예레미야애가": "애", "에스겔": "겔", "다니엘": "단", "호세아": "호", "요엘": "욜",
  "아모스": "암", "오바댜": "옵", "요나": "욘", "미가": "미", "나훔": "나",
  "하박국": "합", "스바냐": "습", "학개": "학", "스가랴": "슥", "말라기": "말",
  "마태복음": "마", "마가복음": "막", "누가복음": "눅", "요한복음": "요",
  "사도행전": "행", "로마서": "롬", "고린도전서": "고전", "고린도후서": "고후",
  "갈라디아서": "갈", "에베소서": "엡", "빌립보서": "빌", "골로새서": "골",
  "데살로니가전서": "살전", "데살로니가후서": "살후", "디모데전서": "딤전", "디모데후서": "딤후",
  "디도서": "딛", "빌레몬서": "몬", "히브리서": "히", "야고보서": "약",
  "베드로전서": "벧전", "베드로후서": "벧후", "요한일서": "요일", "요한1서": "요일",
  "요한이서": "요이", "요한2서": "요이", "요한삼서": "요삼", "요한3서": "요삼",
  "유다서": "유", "요한계시록": "계",
};
const BOOK_NAMES = Object.keys(NAME_TO_ABBR).sort((a, b) => b.length - a.length);

function esc(s) { return s.replace(/'/g, "''"); }

async function main() {
  // 1. bible.txt 로드 (EUC-KR)
  console.log("1. bible.txt 로드...");
  const raw = readFileSync("public/bible.txt");
  const fullText = new TextDecoder("euc-kr").decode(raw);
  const lines = fullText.split("\n").map(l => l.trim()).filter(Boolean);
  console.log(`   → ${lines.length}줄 로드`);

  // 인덱스 구축: "약어+장" → 해당 장의 모든 절
  const chapterIndex = new Map();
  for (const line of lines) {
    const match = line.match(/^([가-힣]+)(\d+):/);
    if (match) {
      const key = `${match[1]}${match[2]}`;
      if (!chapterIndex.has(key)) chapterIndex.set(key, []);
      // 섹션 헤더 제거 후 추가
      chapterIndex.get(key).push(line.replace(/<[^>]*>/g, "").trim());
    }
  }
  console.log(`   → ${chapterIndex.size}개 장 인덱스 구축`);

  // 2. 비어있는 qt_plans 가져오기
  console.log("2. 비어있는 qt_plans 로드...");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/qt_plans?select=date,reference&text=eq.&order=date.asc`,
    { headers: { apikey: SUPABASE_KEY } }
  );
  const emptyPlans = await res.json();
  console.log(`   → ${emptyPlans.length}개 빈 항목`);

  // 3. 각 항목의 본문 추출
  console.log("3. 본문 추출...");
  const updates = [];
  let found = 0, notFound = 0;

  for (const plan of emptyPlans) {
    const ref = plan.reference;
    // "에스겔 12장" → bookName="에스겔", chapter=12
    let bookName = null;
    for (const name of BOOK_NAMES) {
      if (ref.includes(name)) { bookName = name; break; }
    }
    if (!bookName) { notFound++; continue; }

    const abbr = NAME_TO_ABBR[bookName];
    if (!abbr) { notFound++; continue; }

    const chMatch = ref.match(/(\d+)(?:장|편)/);
    const chapter = chMatch ? parseInt(chMatch[1]) : null;

    if (!chapter) {
      // 전체 책 reference (장 번호 없음) — 1장으로 시도
      const key = `${abbr}1`;
      const verses = chapterIndex.get(key);
      if (verses) {
        updates.push({ date: plan.date, text: verses.join("\n") });
        found++;
      } else {
        notFound++;
      }
      continue;
    }

    const key = `${abbr}${chapter}`;
    const verses = chapterIndex.get(key);
    if (verses) {
      updates.push({ date: plan.date, text: verses.join("\n") });
      found++;
    } else {
      notFound++;
      console.log(`   [MISS] ${ref} → ${key}`);
    }
  }

  console.log(`   → 추출 성공: ${found}, 실패: ${notFound}`);

  // 4. SQL 생성
  console.log("4. SQL 생성...");
  const sql = ["BEGIN;"];

  for (const u of updates) {
    // E-string: \n은 줄바꿈, ' → ''
    const escaped = u.text.replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/\n/g, "\\n");
    sql.push(`UPDATE public.qt_plans SET text = E'${escaped}' WHERE date = '${u.date}';`);
  }

  sql.push("COMMIT;");

  writeFileSync("scripts/fill-text.sql", sql.join("\n"), "utf8");
  console.log(`   → fill-text.sql 생성 (${updates.length}개 UPDATE, ${Math.round(sql.join("\n").length / 1024)}KB)`);
}

main().catch(console.error);
