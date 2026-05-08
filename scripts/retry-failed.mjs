/**
 * 실패한 항목만 찾아서 Opus로 재생성
 * text에 성경 원문(약어+장:절 패턴)이 남아있는 항목 = 재생성 필요
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const SUPABASE_URL = "https://iftczxnootynvhxyqghv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGN6eG5vb3R5bnZoeHlxZ2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzQyNTMsImV4cCI6MjA5MzExMDI1M30.YjNH9nDGuVx-B9oo-KNaMqhCjRU7NT5Vd9VEtRH1rMM";

const envContent = readFileSync("C:/Users/chris/claudecode/Telegram Bot/.env", "utf8");
const ANTHROPIC_KEY = envContent.match(/ANTHROPIC_API_KEY=(.+)/)[1].trim();

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

// bible.txt 로드
const raw = readFileSync("public/bible.txt");
const bibleText = new TextDecoder("euc-kr").decode(raw);
const bibleLines = bibleText.split("\n").map(l => l.trim()).filter(Boolean);
const chapterIndex = new Map();
for (const line of bibleLines) {
  const m = line.match(/^([가-힣]+)(\d+):/);
  if (m) {
    const key = `${m[1]}${m[2]}`;
    if (!chapterIndex.has(key)) chapterIndex.set(key, []);
    chapterIndex.get(key).push(line.replace(/<[^>]*>/g, "").trim());
  }
}

function getBibleChapter(reference) {
  let bookName = null;
  for (const name of BOOK_NAMES) {
    if (reference.includes(name)) { bookName = name; break; }
  }
  if (!bookName) return "";
  const abbr = NAME_TO_ABBR[bookName];
  if (!abbr) return "";
  const chMatch = reference.match(/(\d+)(?:장|편)/);
  const chapter = chMatch ? parseInt(chMatch[1]) : 1;
  return (chapterIndex.get(`${abbr}${chapter}`) || []).join("\n");
}

// 원본 데이터
const originalPlans = JSON.parse(readFileSync("C:/Users/chris/AppData/Local/Temp/qt_plans_full.json", "utf8"));

function findOriginalPlan(reference) {
  let bookName = null;
  for (const name of BOOK_NAMES) {
    if (reference.includes(name)) { bookName = name; break; }
  }
  if (!bookName) return null;
  const chMatch = reference.match(/(\d+)(?:장|편)/);
  const chapter = chMatch ? parseInt(chMatch[1]) : null;
  if (!chapter) return null;
  for (const p of originalPlans) {
    if (!p.reference.includes(bookName)) continue;
    const singleM = p.reference.match(new RegExp(bookName + "\\s*(\\d+)(?:장|편)$"));
    if (singleM && parseInt(singleM[1]) === chapter) return p;
    const rangeM = p.reference.match(/(\d+)[~\-](\d+)/);
    if (rangeM) {
      const s = parseInt(rangeM[1]), e = parseInt(rangeM[2]);
      if (chapter >= s && chapter <= e) return p;
    }
    const crossM = p.reference.match(/(\d+):\d+[~\-](\d+):\d+/);
    if (crossM) {
      const s = parseInt(crossM[1]), e = parseInt(crossM[2]);
      if (chapter >= s && chapter <= e) return p;
    }
  }
  return null;
}

const EXAMPLE = `가나안에 정착한 이스라엘 백성이 신앙교육에 실패한 결과로 시대 전체가 약 350여 년 이상 긴 어둠의 터널을 지나야 했습니다. 이어지는 사무엘상은 사사 시대의 어두운 고리를 끊고 시대를 개척한 사무엘, 이스라엘의 초대 왕 사울 그리고 그 뒤를 이어 준비되는 다윗의 이야기입니다. 어두운 사사 시대의 역사를 광명의 시대로 인도할 한 사람이 준비되고 있습니다. 한나가 하나님의 전에 와서 눈물로 기도하는데, 그 기도의 내용은 "아들을 주시면 내가 그의 평생에 그를 여호와께 드리고 삭도를 그의 머리에 대지 아니하겠나이다"(삼상 1:11)라는 것이었습니다. 한나는 기도하다 구한 대로 아들을 낳았으며, 서원한 대로 그 아들을 하나님께 바칩니다. 한나가 엘리의 아들들에 관한 나쁜 소문을 몰랐을 리 없습니다. 그럼에도 불구하고 한나는 하나님을 향한 믿음을 가지고 엘리에게 아들을 맡긴 것입니다.`;

const EXAMPLE_COMM = `오늘의 핵심
하나님께서는 350여 년이라는 긴 불순종의 흐름을 끊고 시대를 새롭게 개척할 하나님의 사람으로 사무엘을 선택하여 교육하십니다.

묵상 질문
하나님은 어두운 시대를 바꾸기 위해 한 사람을 준비하시나요?
한나처럼 눈물의 기도로 준비되어야 할 내 삶의 영역은 무엇일까요?
하나님 앞에 온전히 드릴 것이 무엇인지 기도해 보셨나요?`;

const SYSTEM = `너는 기독교 대한 감리회(KMC)의 신앙 전통에 깊이 정통한 목회자로서 큐티 본문을 집필한다.
웨슬리안 신학(선행은총, 자유의지의 응답, 성화)을 자연스럽게 녹여내되, 칼빈주의적 이중예정론은 배제한다.

## 문체 원칙 (반드시 준수)
너는 성경 본문을 읽는 독자에게 그 본문의 의미를 풀어서 설명해주는 해설자다.
성경 속 인물의 시점에서 실황 중계하듯 쓰지 말고, 본문이 우리에게 보여주는 것, 전해주는 것, 가르쳐주는 것을 해석하는 톤으로 서술하라.

좋은 문장 예시:
- "에스겔의 상징적 행동은 하나님께서 주시는 메시지를 더욱 뚜렷하게 전달해 주고 있습니다"
- "포로의 행장을 어깨에 메고 가는 예언자의 모습을 통해 표현됩니다"
- "이렇게 사무엘은 젖을 떼자마자 부모를 떠나 하나님의 사람으로 준비되기 시작합니다"
- "하나님의 인도하심과 은혜였습니다"

나쁜 문장 예시 (이렇게 쓰지 말 것):
- "백성들은 여전히 깨닫지 못하고 있습니다" (실황 중계)
- "에스겔은 이상한 행동을 시작합니다" (소설 톤)
- "특히 주목할 것은" "더욱 안타까운 것은" (인위적 전환어)

추가 규칙:
- 성경 구절 직접 인용("..."(겔 1:1) 형태)은 본문 전체에서 최대 1개만
- 역사적 맥락과 시대 배경을 자연스럽게 녹여냄
- 따뜻하면서도 깊이 있는 목회적 해설 어조`;

function escSQL(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/\n/g, "\\n");
}

const CONCURRENCY = 3;

async function generateQT(plan, bibleChapter, originalPlan) {
  const origRef = originalPlan?.reference || plan.reference;
  const origText = originalPlan?.text || "";
  const origComm = originalPlan?.commentary || "";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-20250514",
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `모범 예시:\n[사무엘상 1장]\n${EXAMPLE}\n\n[묵상 길잡이]\n${EXAMPLE_COMM}\n\n---\n원래 ${origRef}을 아우르는 큐티를 1장 단위로 분리합니다.\n\n[원본 큐티 (${origRef})]\n${origText.slice(0, 1500)}\n\n[원본 묵상 길잡이]\n${origComm.slice(0, 500)}\n\n[${plan.reference} 성경 원문]\n${bibleChapter.slice(0, 3000)}\n\n위 예시의 문체를 정확히 따라서 ${plan.reference}만의 큐티를 작성해 주세요.\n\n형식:\n[TEXT]\n큐티 본문 (600~800자)\n\n[COMMENTARY]\n오늘의 핵심\n(1~2문장)\n\n묵상 질문\n1. (질문)\n2. (질문)\n3. (질문)`,
      }],
    }),
  });

  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const content = data.content?.[0]?.text || "";
  const textMatch = content.match(/\[TEXT\]\s*\n([\s\S]*?)\n\[COMMENTARY\]/);
  const commMatch = content.match(/\[COMMENTARY\]\s*\n([\s\S]*?)$/);
  return {
    text: textMatch ? textMatch[1].trim() : content,
    commentary: commMatch ? commMatch[1].trim() : "",
  };
}

async function main() {
  console.log("=== 실패분 재시도 (Opus) ===\n");

  // 전체 플랜 페이지네이션으로 가져오기
  let all = [];
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/qt_plans?select=date,title,reference,text&order=date.asc&limit=500&offset=${offset}`,
      { headers: { apikey: SUPABASE_KEY } }
    );
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 500) break;
    offset += 500;
  }
  console.log("전체 로드:", all.length);

  // text에 성경 원문 패턴이 있는 항목 = 재생성 필요
  const needsRegen = all.filter(p => /^[가-힣]+\d+:\d+/.test(p.text.trim()));
  console.log("재생성 필요:", needsRegen.length, "\n");

  if (needsRegen.length === 0) {
    console.log("모든 항목이 이미 처리되었습니다.");
    return;
  }

  const items = needsRegen.map(plan => ({
    plan,
    bibleChapter: getBibleChapter(plan.reference),
    originalPlan: findOriginalPlan(plan.reference),
  }));

  const results = [];
  let done = 0;
  const startTime = Date.now();

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(async (item) => {
      try {
        const result = await generateQT(item.plan, item.bibleChapter, item.originalPlan);
        return { date: item.plan.date, ...result, ok: true };
      } catch (e) {
        console.error(`  [FAIL] ${item.plan.date} ${item.plan.reference}: ${e.message.slice(0, 80)}`);
        return { date: item.plan.date, text: "", commentary: "", ok: false };
      }
    }));
    results.push(...batchResults);
    done += batch.length;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = done / elapsed;
    const remaining = Math.round((items.length - done) / rate / 60);
    process.stdout.write(`\r   → ${done}/${items.length} (${rate.toFixed(2)}/s, ~${remaining}분 남음)   `);
    if (i + CONCURRENCY < items.length) await new Promise(r => setTimeout(r, 1000));
  }
  console.log("\n");

  const successful = results.filter(r => r.ok && r.text);
  const failed = results.filter(r => !r.ok);
  console.log(`결과: 성공 ${successful.length}, 실패 ${failed.length}`);

  if (successful.length > 0) {
    const chunkSize = 30;
    let fileIdx = 0;
    for (let i = 0; i < successful.length; i += chunkSize) {
      const batch = successful.slice(i, i + chunkSize);
      const sql = ["BEGIN;"];
      for (const r of batch) {
        sql.push(`UPDATE public.qt_plans SET text = E'${escSQL(r.text)}', commentary = E'${escSQL(r.commentary)}' WHERE date = '${r.date}';`);
      }
      sql.push("COMMIT;");
      writeFileSync(`scripts/retry-${String(fileIdx).padStart(2, "0")}.sql`, sql.join("\n"), "utf8");
      fileIdx++;
    }

    console.log("SQL 실행 중...");
    let sqlOk = 0, sqlFail = 0;
    for (let i = 0; i < fileIdx; i++) {
      try {
        execSync(`npx supabase db query -f scripts/retry-${String(i).padStart(2, "0")}.sql --linked`, { cwd: process.cwd(), timeout: 60000, stdio: "pipe" });
        sqlOk++;
      } catch { sqlFail++; }
    }
    console.log(`SQL: ${sqlOk} ok, ${sqlFail} fail`);
  }

  if (failed.length > 0) {
    console.log("남은 실패:", failed.map(f => f.date).join(", "));
  }
  console.log("\n=== 완료 ===");
}

main().catch(console.error);
