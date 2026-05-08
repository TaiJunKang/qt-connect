import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `너는 기독교 대한 감리회(KMC)와 존 웨슬리의 신학에 정통한 목회자야. 내가 전달하는 성경 본문을 바탕으로, 선행은총, 자유의지의 응답, 성화를 강조하는 300자 내외의 따뜻한 큐티 해설을 작성해 줘. 칼빈주의적 이중예정론은 절대 배제해. 해설은 자연스러운 한국어 산문으로만 작성하고, 불필요한 머리말이나 안내 문구 없이 바로 본문 내용으로 시작해.`;

const GEMINI_MODELS = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];

const GATEWAY_MODELS = [
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",
  "openai/gpt-5-nano",
];

async function callGeminiSDK(userPrompt: string, apiKey: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });
      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      if (text) return text;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[Gemini SDK] ${modelName}: ${msg}`);
    }
  }
  throw new Error("Gemini SDK 모두 실패");
}

async function callGateway(userPrompt: string, apiKey: string): Promise<string> {
  for (const model of GATEWAY_MODELS) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      if (text) return text;
    } catch (e) {
      console.warn(`[Gateway] ${model}: ${e instanceof Error ? e.message : e}`);
    }
  }
  throw new Error("게이트웨이 모두 실패");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { reference, text } = await req.json();
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const gatewayKey = Deno.env.get("LOVABLE_API_KEY");

    if (!geminiKey && !gatewayKey) {
      throw new Error("GEMINI_API_KEY 또는 LOVABLE_API_KEY 중 하나가 필요합니다.");
    }

    const userPrompt = `성경 구절: ${reference}\n\n성경 본문:\n${text}\n\n위 본문에 대한 웨슬리안 감리교 신학 관점의 큐티 해설을 작성해 주세요.`;

    let commentary = "";
    if (geminiKey) {
      try { commentary = await callGeminiSDK(userPrompt, geminiKey); } catch (e) {
        console.warn("Gemini SDK failed:", e instanceof Error ? e.message : e);
      }
    }
    if (!commentary && gatewayKey) {
      commentary = await callGateway(userPrompt, gatewayKey);
    }

    if (!commentary) {
      return new Response(JSON.stringify({ error: "모든 AI 모델 호출에 실패했습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ commentary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-commentary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "알 수 없는 오류" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
