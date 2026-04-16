import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODELS = [
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",
  "google/gemini-3-flash-preview",
  "openai/gpt-5-nano",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { reference, text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `너는 기독교 대한 감리회(KMC)와 존 웨슬리의 신학에 정통한 목회자야. 내가 전달하는 성경 본문을 바탕으로, 선행은총, 자유의지의 응답, 성화를 강조하는 300자 내외의 따뜻한 큐티 해설을 작성해 줘. 칼빈주의적 이중예정론은 절대 배제해. 해설은 자연스러운 한국어 산문으로만 작성하고, 불필요한 머리말이나 안내 문구 없이 바로 본문 내용으로 시작해.`;

    const userPrompt = `성경 구절: ${reference}\n\n성경 본문:\n${text}\n\n위 본문에 대한 웨슬리안 감리교 신학 관점의 큐티 해설을 작성해 주세요.`;

    let commentary = "";
    let lastError = "";

    for (const model of MODELS) {
      try {
        console.log(`Trying model: ${model}`);
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Model ${model} failed [${response.status}]:`, errText);
          lastError = `${response.status}: ${errText}`;
          continue;
        }

        const data = await response.json();
        commentary = data.choices?.[0]?.message?.content ?? "";
        if (commentary) {
          console.log(`Success with model: ${model}`);
          break;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`Model ${model} error:`, lastError);
      }
    }

    if (!commentary) {
      return new Response(JSON.stringify({ error: `모든 AI 모델 호출에 실패했습니다. 잠시 후 다시 시도해주세요.` }), {
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
