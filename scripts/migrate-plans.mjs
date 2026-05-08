/**
 * QT Plans Migration Script
 *
 * 1. 기존 qt_plans 데이터 읽기
 * 2. 여러 장 reference를 1장씩 분리
 * 3. YYYY-MM-DD 날짜를 순차 배정 (일요일 제외)
 * 4. Supabase에 새 데이터 저장
 */

const SUPABASE_URL = "https://iftczxnootynvhxyqghv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGN6eG5vb3R5bnZoeHlxZ2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzQyNTMsImV4cCI6MjA5MzExMDI1M30.YjNH9nDGuVx-B9oo-KNaMqhCjRU7NT5Vd9VEtRH1rMM";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

// ── Reference parser ──────────────────────────────────────────────

// 성경 책 이름 → 장 수 매핑
const BOOK_CHAPTERS = {
  "창세기": 50, "출애굽기": 40, "레위기": 27, "민수기": 36, "신명기": 34,
  "여호수아": 24, "사사기": 21, "룻기": 4, "사무엘상": 31, "사무엘하": 24,
  "열왕기상": 22, "열왕기하": 25, "역대상": 29, "역대하": 36,
  "에스라": 10, "느헤미야": 13, "에스더": 10, "욥기": 42, "시편": 150,
  "잠언": 31, "전도서": 12, "아가": 8, "이사야": 66, "예레미야": 52,
  "예레미야애가": 5, "에스겔": 48, "다니엘": 12, "호세아": 14, "요엘": 3,
  "아모스": 9, "오바댜": 1, "요나": 4, "미가": 7, "나훔": 3,
  "하박국": 3, "스바냐": 3, "학개": 2, "스가랴": 14, "말라기": 4,
  "마태복음": 28, "마가복음": 16, "누가복음": 24, "요한복음": 21,
  "사도행전": 28, "로마서": 16, "고린도전서": 16, "고린도후서": 13,
  "갈라디아서": 6, "에베소서": 6, "빌립보서": 4, "골로새서": 4,
  "데살로니가전서": 5, "데살로니가후서": 3, "디모데전서": 6, "디모데후서": 4,
  "디도서": 3, "빌레몬서": 1, "히브리서": 13, "야고보서": 5,
  "베드로전서": 5, "베드로후서": 3, "요한일서": 5, "요한이서": 1,
  "요한삼서": 1, "유다서": 1, "요한계시록": 22,
  // 약어/변형
  "요한1서": 5, "요한2서": 1, "요한3서": 1,
};

// 책 이름을 가장 긴 것부터 매칭 (e.g. "예레미야애가" before "예레미야")
const BOOK_NAMES = Object.keys(BOOK_CHAPTERS).sort((a, b) => b.length - a.length);

/**
 * reference 문자열에서 {bookName, chapters: number[]} 추출
 *
 * 지원 형식:
 *   "창세기 1~2장" → 창세기 [1, 2]
 *   "사무엘상 4~7장" → 사무엘상 [4, 5, 6, 7]
 *   "에베소서 4~6장" → 에베소서 [4, 5, 6]
 *   "사도행전 15:36~18:22" → 사도행전 [15, 16, 17, 18]
 *   "민수기 9장~10:10" → 민수기 [9, 10]
 *   "시편 67~71편" → 시편 [67, 68, 69, 70, 71]
 *   "베드로후서" (책 전체) → 베드로후서 [1, 2, 3]
 *   "룻기 4장" → 룻기 [4]
 *   "역대상 1~20장" → 역대상 [1..20]
 *   "에스겔 1~22장" → 에스겔 [1..22]
 *   "마가복음 1~13장" → 마가복음 [1..13]
 */
function parseReference(ref) {
  const result = [];

  // 책 이름 찾기
  let bookName = null;
  for (const name of BOOK_NAMES) {
    if (ref.includes(name)) {
      bookName = name;
      break;
    }
  }

  if (!bookName) {
    console.warn(`  [WARN] 책 이름 못 찾음: "${ref}"`);
    return [{ bookName: ref, chapters: [1] }]; // fallback
  }

  const afterBook = ref.slice(ref.indexOf(bookName) + bookName.length).trim();

  // Case 1: 책 이름만 (장 정보 없음) → 단일 항목으로 유지
  if (!afterBook || afterBook === "서") {
    return [{ bookName, chapters: [0] }]; // 0 = 전체 책 (단일 항목)
  }

  // Case 2: "15:36~18:22" 같은 절 범위 (다른 장에 걸침) — 반드시 양쪽에 : 있어야 함
  const crossChapterMatch = afterBook.match(/(\d+):\d+[~\-](\d+):\d+/);
  if (crossChapterMatch) {
    const startCh = parseInt(crossChapterMatch[1]);
    const endCh = parseInt(crossChapterMatch[2]);
    const chapters = [];
    for (let c = startCh; c <= endCh; c++) chapters.push(c);
    return [{ bookName, chapters }];
  }

  // Case 3: "2:12-13" 같은 같은 장 내 절 범위 → 단일 장
  const sameChapterVerseMatch = afterBook.match(/^(\d+):\d+[~\-]\d+$/);
  if (sameChapterVerseMatch) {
    return [{ bookName, chapters: [parseInt(sameChapterVerseMatch[1])] }];
  }

  // Case 4: "9장~10:10" 같은 혼합 형식
  const mixedMatch = afterBook.match(/(\d+)장?[~\-](\d+)(?:장|편|:\d+)/);
  if (mixedMatch) {
    const startCh = parseInt(mixedMatch[1]);
    const endCh = parseInt(mixedMatch[2]);
    const chapters = [];
    for (let c = startCh; c <= endCh; c++) chapters.push(c);
    return [{ bookName, chapters }];
  }

  // Case 5: "4장" 같은 단일 장
  const singleMatch = afterBook.match(/^(\d+)(?:장|편)?$/);
  if (singleMatch) {
    return [{ bookName, chapters: [parseInt(singleMatch[1])] }];
  }

  // Case 6: "1~18장", "67~71편" 등 장 범위
  const rangeMatch = afterBook.match(/(\d+)[~\-](\d+)(?:장|편)/);
  if (rangeMatch) {
    const startCh = parseInt(rangeMatch[1]);
    const endCh = parseInt(rangeMatch[2]);
    const chapters = [];
    for (let c = startCh; c <= endCh; c++) chapters.push(c);
    return [{ bookName, chapters }];
  }

  // Fallback: 단일 항목 유지
  console.warn(`  [WARN] 파싱 실패, 단일항목 유지: "${ref}"`);
  return [{ bookName, chapters: [0] }];
}

// ── Date helpers ──────────────────────────────────────────────────

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isSunday(d) {
  return d.getDay() === 0;
}

/** 다음 비일요일 날짜 반환 */
function nextNonSunday(d) {
  let date = new Date(d);
  while (isSunday(date)) {
    date = addDays(date, 1);
  }
  return date;
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log("=== QT Plans Migration ===\n");

  // 1. 기존 데이터 읽기
  console.log("1. 기존 qt_plans 데이터 로드...");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/qt_plans?select=id,date,title,reference,text,commentary,sermon_id&order=date.asc`,
    { headers }
  );
  const plans = await res.json();
  console.log(`   → ${plans.length}개 플랜 로드\n`);

  // 2. 각 플랜을 분석하여 1장씩 분리
  console.log("2. Reference 분석 및 분리...");
  const expandedPlans = [];
  let multiChapterCount = 0;

  for (const plan of plans) {
    const parsed = parseReference(plan.reference);

    for (const { bookName, chapters } of parsed) {
      if (chapters.length > 1) multiChapterCount++;

      for (const ch of chapters) {
        const isSingle = chapters.length === 1;
        const isWholeBook = ch === 0; // 전체 책 또는 파싱 실패
        expandedPlans.push({
          originalDate: plan.date,
          bookName,
          chapter: ch,
          originalTitle: plan.title,
          title: isSingle
            ? plan.title
            : `${plan.title} (${bookName} ${ch}장)`,
          reference: isWholeBook ? plan.reference : `${bookName} ${ch}장`,
          // 원본이 1장이면 text/commentary 유지, 아니면 빈값 (재생성 필요)
          text: isSingle ? plan.text : "",
          commentary: isSingle ? plan.commentary : "",
          sermon_id: plan.sermon_id,
        });
      }
    }
  }

  console.log(`   → 원본 ${plans.length}개 → 분리 후 ${expandedPlans.length}개`);
  console.log(`   → 여러 장 묶음 ${multiChapterCount}개가 분리됨\n`);

  // 3. YYYY-MM-DD 날짜 배정 (일요일 제외)
  console.log("3. 날짜 배정 (2026-01-01 시작, 일요일 제외)...");
  let currentDate = new Date(2026, 0, 1); // 2026-01-01
  currentDate = nextNonSunday(currentDate);

  const finalPlans = expandedPlans.map((plan) => {
    const date = formatDate(currentDate);
    currentDate = addDays(currentDate, 1);
    currentDate = nextNonSunday(currentDate);
    return { ...plan, date };
  });

  const lastDate = finalPlans[finalPlans.length - 1]?.date;
  console.log(`   → 시작: 2026-01-01 / 끝: ${lastDate}`);
  console.log(`   → 총 ${finalPlans.length}일 (일요일 제외)\n`);

  // 4. 기존 데이터 삭제 후 새 데이터 삽입
  console.log("4. Supabase 데이터 교체...");

  // 4a. 기존 플랜 전체 삭제
  const deleteRes = await fetch(
    `${SUPABASE_URL}/rest/v1/qt_plans?id=not.is.null`,
    { method: "DELETE", headers: { ...headers, Prefer: "return=minimal" } }
  );
  if (!deleteRes.ok) {
    const err = await deleteRes.text();
    console.error(`   삭제 실패: ${err}`);
    return;
  }
  console.log("   → 기존 데이터 삭제 완료");

  // 4b. 50개씩 배치로 삽입
  const batchSize = 50;
  let inserted = 0;
  for (let i = 0; i < finalPlans.length; i += batchSize) {
    const batch = finalPlans.slice(i, i + batchSize).map(p => ({
      date: p.date,
      title: p.title,
      reference: p.reference,
      text: p.text,
      commentary: p.commentary,
      sermon_id: p.sermon_id,
    }));

    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/qt_plans`,
      { method: "POST", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify(batch) }
    );

    if (!insertRes.ok) {
      const err = await insertRes.text();
      console.error(`   삽입 실패 (batch ${i}): ${err}`);
      return;
    }
    inserted += batch.length;
    process.stdout.write(`\r   → ${inserted}/${finalPlans.length} 삽입 완료`);
  }

  console.log("\n\n=== 마이그레이션 완료! ===");
  console.log(`총 ${finalPlans.length}개 플랜 (${plans.length}개에서 분리)`);
  console.log(`날짜 범위: 2026-01-01 ~ ${lastDate}`);

  // 내용 재생성이 필요한 항목 수 카운트
  const needsRegeneration = finalPlans.filter(p => !p.text || !p.commentary).length;
  console.log(`내용 재생성 필요: ${needsRegeneration}개 (text 또는 commentary 비어있음)`);
}

main().catch(console.error);
