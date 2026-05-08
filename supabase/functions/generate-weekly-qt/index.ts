import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BOOK_ABBR = `성경 약어표 (반드시 이 약어만 사용):
구약: 창,출,레,민,신,수,삿,룻,삼상,삼하,왕상,왕하,대상,대하,스,느,에,욥,시,잠,전,아,사,렘,애,겔,단,호,욜,암,옵,욘,미,나,합,습,학,슥,말
신약: 마,막,눅,요,행,롬,고전,고후,갈,엡,빌,골,살전,살후,딤전,딤후,딛,몬,히,약,벧전,벧후,요일,요이,요삼,유,계`;

const SYSTEM_INSTRUCTION = `너는 기독교 대한 감리회(KMC)의 신앙 전통을 바탕으로, 영적으로 깊고 따뜻한 묵상을 나누는 목회자야.
목사님의 주일설교 내용을 바탕으로 한 주간의 큐티를 기획하고, 설교의 은혜가 일상 속에서 깊어지도록 돕는다.

commentary 작성 시 다음 3단계를 자연스럽게 연결해:
1. 본문 묵상: 오늘 말씀이 전하는 핵심 메시지와 하나님의 성품을 따뜻하게 풀어줘.
2. 은혜의 흐름: 하나님의 먼저 찾아오시는 은혜, 우리의 믿음과 응답, 날마다 변화되어 가는 삶을 자연스럽게 연결해줘.
3. 오늘의 적용: 직장, 가정, 관계 속에서 오늘 이 말씀을 어떻게 살아낼지 구체적으로 권면해줘.

절대 금지:
- 딱딱한 신학 용어나 학술적 표현
- "사랑하는 성도 여러분" 같은 도입 인삿말 (바로 말씀 내용으로 시작할 것)
경어체(~습니다, ~해 보세요)로 작성해.`;

// Gemini SDK models to try in order
const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-2.0-flash-lite",
];

// Lovable gateway fallback models
const GATEWAY_MODELS = [
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",
  "openai/gpt-5-nano",
  "openai/gpt-5-mini",
];

function stripMarkdown(raw: string): string {
  return raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}

/** Try Gemini SDK directly (uses GEMINI_API_KEY) */
async function callGeminiSDK(prompt: string, apiKey: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = "";

  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`[Gemini SDK] Trying: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_INSTRUCTION,
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text) {
        console.log(`[Gemini SDK] OK: ${modelName}`);
        return text;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (lastError.includes("429") || lastError.includes("quota")) {
        console.warn(`[Gemini SDK] Quota exceeded for ${modelName}, trying next...`);
      } else {
        console.error(`[Gemini SDK] ${modelName} error:`, lastError);
      }
    }
  }
  throw new Error(`Gemini SDK 모두 실패: ${lastError}`);
}

/** Fallback: Lovable AI gateway (uses LOVABLE_API_KEY) */
async function callGateway(prompt: string, apiKey: string): Promise<string> {
  const fullPrompt = `${SYSTEM_INSTRUCTION}\n\n---\n\n${prompt}`;
  let lastError = "";

  for (const model of GATEWAY_MODELS) {
    try {
      console.log(`[Gateway] Trying: ${model}`);
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: fullPrompt }],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        lastError = `${model} [${res.status}]: ${t}`;
        console.error(`[Gateway] ${lastError}`);
        continue;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      if (text) {
        console.log(`[Gateway] OK: ${model}`);
        return text;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error(`[Gateway] ${model} error:`, lastError);
    }
  }
  throw new Error(`게이트웨이 모두 실패: ${lastError}`);
}

/** Call AI with automatic fallback: Gemini SDK → Gateway */
async function callAI(prompt: string, geminiKey: string | undefined, gatewayKey: string | undefined): Promise<string> {
  if (geminiKey) {
    try {
      return await callGeminiSDK(prompt, geminiKey);
    } catch (e) {
      console.warn("Gemini SDK failed, falling back to gateway:", e instanceof Error ? e.message : e);
    }
  }

  if (gatewayKey) {
    return await callGateway(prompt, gatewayKey);
  }

  throw new Error("GEMINI_API_KEY 또는 LOVABLE_API_KEY 중 하나가 필요합니다.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { dates, sermonTitle, sermonContent } = (await req.json()) as {
      dates: string[];
      sermonTitle: string;
      sermonContent: string;
    };

    if (!dates || dates.length !== 7 || !sermonContent) {
      return new Response(JSON.stringify({ error: "dates(7개)와 sermonContent가 필요합니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const gatewayKey = Deno.env.get("LOVABLE_API_KEY");

    if (!geminiKey && !gatewayKey) {
      throw new Error("GEMINI_API_KEY 또는 LOVABLE_API_KEY가 설정되지 않았습니다.");
    }

    // ── Step 1: 설교문 분석 → 7일 QT 구조 + 설교 요약 생성 ─────────────────
    const outlinePrompt = `당신에게 목사님의 주일설교 원고가 주어집니다. 이 설교를 분석하여 7일치 큐티(묵상) 일정을 기획해 주세요.

설교 제목: "${sermonTitle || "(제목 없음)"}"

설교 내용:
"""
${sermonContent}
"""

위 설교에서 핵심 메시지, 주요 주제, 인용된 성경 구절들을 파악하여 7일간의 큐티 제목과 성경 구절을 생성해 주세요.

기획 원칙:
1. 1일차(월): 설교의 핵심 본문 구절로 시작 — 주일 설교를 되새기며 한 주를 시작
2. 2~3일차(화~수): 설교에서 다룬 부주제 또는 관련 성경 구절을 깊이 묵상
3. 4일차(목): 설교의 신학적 깊이를 더하는 관련 구절
4. 5일차(금): 설교의 실천적 적용과 연결되는 성경 구절
5. 6일차(토): 설교 주제를 넓혀서 관련된 다른 성경 인물이나 사건과 연결
6. 7일차(일): 한 주 묵상을 마무리하며 다음 주일을 준비하는 구절

${BOOK_ABBR}

규칙:
- 하루에 반드시 1장(chapter)만 다룰 것. 여러 장을 묶지 말 것 (예: 창1-3 금지)
- reference는 반드시 위 약어 사용. 형식: 약어장:절-절 (예: 롬10:9-17, 히4:12-16, 창1:1-8)
- 절 범위 포함 필수 (단일절 또는 같은 장 내 범위만 허용)
- 설교에서 직접 인용된 구절을 우선 사용하되, 주제와 관련된 다른 구절도 포함 가능

순수 JSON만 응답 (마크다운 코드블록 없이).
응답 형식:
{"plans":[{"date":"MM-DD","title":"제목","reference":"약어장:절"},...], "sermonSummary":"설교 핵심 내용 500자 이내 요약"}
날짜: ${dates.join(",")}`;

    console.log("Step 1: Analyzing sermon and generating outline...");
    const outlineRaw = await callAI(outlinePrompt, geminiKey, gatewayKey);
    const outlineCleaned = stripMarkdown(outlineRaw);
    console.log("Outline raw (first 300):", outlineCleaned.slice(0, 300));

    let outline: {
      plans: Array<{ date: string; title: string; reference: string }>;
      sermonSummary?: string;
    };
    try {
      outline = JSON.parse(outlineCleaned);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Outline parse error:", msg, "\nRaw:", outlineCleaned.slice(0, 400));
      throw new Error(`AI 초안 파싱 실패: ${msg}`);
    }

    if (!Array.isArray(outline.plans) || outline.plans.length !== 7) {
      throw new Error(`AI가 7개 항목을 생성하지 못했습니다. (생성된 수: ${outline.plans?.length ?? 0})`);
    }

    const sermonSummary = outline.sermonSummary || sermonContent.slice(0, 500);

    // ── Step 2: 각 날 묵상 해설 생성 (설교 요약 참조) ─────────────────────────
    console.log("Step 2: Generating commentaries in parallel (sermon-based)...");
    const DAY_LABELS = ["첫째", "둘째", "셋째", "넷째", "다섯째", "여섯째", "일곱째"];

    const plans = await Promise.all(
      outline.plans.map(async (item, idx) => {
        const commentaryPrompt = `목사님의 주일설교를 바탕으로 한 큐티 ${DAY_LABELS[idx]}날 (${item.date})

설교 제목: "${sermonTitle || "(제목 없음)"}"
설교 핵심 요약:
"""
${sermonSummary}
"""

오늘의 큐티:
제목: "${item.title}"
성경 구절: ${item.reference}

위 본문에 대한 묵상 해설(commentary)을 500자~700자로 작성해 줘.
- 주일 설교의 메시지와 자연스럽게 연결하되, 설교 내용을 단순 반복하지 말고 더 깊이 묵상하도록 안내해.
- 오늘의 성경 구절이 설교 주제와 어떻게 연결되는지 풀어줘.
순수 텍스트만 반환해 (JSON, 마크다운 없이).`;

        try {
          const commentary = await callAI(commentaryPrompt, geminiKey, gatewayKey);
          console.log(`Commentary OK: ${item.date} (${commentary.trim().length}자)`);
          return { ...item, commentary: commentary.trim() };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`Commentary failed for ${item.date}:`, msg);
          return { ...item, commentary: "(해설 생성 실패 — 직접 작성해 주세요.)" };
        }
      })
    );

    return new Response(JSON.stringify({ plans }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("generate-weekly-qt error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
