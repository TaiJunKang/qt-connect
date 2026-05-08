/**
 * Claude Opus로 비어있는 commentary를 생성하는 스크립트
 * 병렬 5개씩, 결과를 SQL로 모아서 supabase db query로 실행
 */

import { writeFileSync, readFileSync } from "fs";
import { execSync } from "child_process";

// Telegram Bot .env에서 키 로드
const envContent = readFileSync("C:/Users/chris/claudecode/Telegram Bot/.env", "utf8");
const ANTHROPIC_API_KEY = envContent.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim();
if (!ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY not found"); process.exit(1); }

const SUPABASE_URL = "https://iftczxnootynvhxyqghv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGN6eG5vb3R5bnZoeHlxZ2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzQyNTMsImV4cCI6MjA5MzExMDI1M30.YjNH9nDGuVx-B9oo-KNaMqhCjRU7NT5Vd9VEtRH1rMM";

const CONCURRENCY = 5;

const SYSTEM_PROMPT = `너는 기독교 대한 감리회(KMC)와 존 웨슬리의 신학에 정통한 목회자야. 내가 전달하는 성경 본문을 바탕으로, 선행은총, 자유의지의 응답, 성화를 강조하는 300자 내외의 따뜻한 큐티 해설을 작성해 줘. 칼빈주의적 이중예정론은 절대 배제해. 해설은 자연스러운 한국어 산문으로만 작성하고, 불필요한 머리말이나 안내 문구 없이 바로 본문 내용으로 시작해.`;

function escSQL(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/\n/g, "\\n");
}

async function callClaude(reference, text) {
  const trimmedText = text.slice(0, 3000);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `성경 구절: ${reference}\n\n성경 본문:\n${trimmedText}\n\n위 본문에 대한 웨슬리안 감리교 신학 관점의 큐티 해설을 작성해 주세요.`,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function processBatch(items) {
  return Promise.all(
    items.map(async (item) => {
      try {
        const commentary = await callClaude(item.reference, item.text);
        return { date: item.date, commentary, ok: true };
      } catch (e) {
        console.error(`  [FAIL] ${item.date} ${item.reference}: ${e.message.slice(0, 100)}`);
        return { date: item.date, commentary: "", ok: false };
      }
    })
  );
}

async function main() {
  console.log("=== Commentary Generation (Claude) ===\n");

  // 1. 빈 항목 가져오기
  console.log("1. 빈 commentary 항목 로드...");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/qt_plans?select=date,reference,text&commentary=eq.&order=date.asc`,
    { headers: { apikey: SUPABASE_KEY } }
  );
  const plans = await res.json();
  console.log(`   → ${plans.length}개 항목\n`);

  if (plans.length === 0) {
    console.log("모든 항목에 commentary가 있습니다.");
    return;
  }

  // 2. 병렬 처리
  console.log(`2. Claude Sonnet 4.5로 해설 생성 (${CONCURRENCY}개 병렬)...`);
  const results = [];
  let done = 0;
  const startTime = Date.now();

  for (let i = 0; i < plans.length; i += CONCURRENCY) {
    const batch = plans.slice(i, i + CONCURRENCY);
    const batchResults = await processBatch(batch);
    results.push(...batchResults);
    done += batch.length;

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = done / elapsed;
    const remaining = Math.round((plans.length - done) / rate / 60);
    process.stdout.write(`\r   → ${done}/${plans.length} (${rate.toFixed(1)}/s, ~${remaining}분 남음)   `);

    // Rate limit: 약간의 딜레이
    if (i + CONCURRENCY < plans.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log("\n");

  // 3. SQL 파일 생성
  const successful = results.filter(r => r.ok && r.commentary);
  const failed = results.filter(r => !r.ok);
  console.log(`3. 결과: 성공 ${successful.length}, 실패 ${failed.length}`);

  const chunkSize = 50;
  let fileIdx = 0;
  for (let i = 0; i < successful.length; i += chunkSize) {
    const batch = successful.slice(i, i + chunkSize);
    const sql = ["BEGIN;"];
    for (const r of batch) {
      sql.push(`UPDATE public.qt_plans SET commentary = E'${escSQL(r.commentary)}' WHERE date = '${r.date}';`);
    }
    sql.push("COMMIT;");
    writeFileSync(`scripts/fill-commentary-${String(fileIdx).padStart(2, "0")}.sql`, sql.join("\n"), "utf8");
    fileIdx++;
  }
  console.log(`4. ${fileIdx}개 SQL 파일 생성`);

  // 4. SQL 자동 실행
  console.log("5. SQL 실행 중...");
  let sqlSuccess = 0, sqlFail = 0;
  for (let i = 0; i < fileIdx; i++) {
    const fname = `scripts/fill-commentary-${String(i).padStart(2, "0")}.sql`;
    try {
      execSync(`npx supabase db query -f ${fname} --linked`, { cwd: process.cwd(), timeout: 60000, stdio: "pipe" });
      sqlSuccess++;
    } catch (e) {
      console.error(`  SQL FAIL: ${fname}`);
      sqlFail++;
    }
  }
  console.log(`   → SQL 성공: ${sqlSuccess}, 실패: ${sqlFail}`);
  console.log("\n=== 완료! ===");
}

main().catch(console.error);
