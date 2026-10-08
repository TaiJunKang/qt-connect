import { useState, useEffect, useRef } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ChevronDown, Share2, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getDateKey, parseDateKey } from "@/lib/date";
import { cleanPlanTitle } from "@/lib/plan";
import ScripturePassage from "./ScripturePassage";
import MeditationGuide from "./MeditationGuide";
import { QT_SAVED_EVENT } from "./lamb/LambBuddy";

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// 작성 중인 글 임시저장 (앱 업데이트로 새로고침되거나 강제 종료돼도 유지)
type Draft = { meditation: string; application: string; prayer: string };
const draftKey = (userId: string, dateKey: string) => `qt-draft:${userId}:${dateKey}`;

function readDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(key, JSON.stringify(draft));
    else localStorage.removeItem(key);
  } catch {
    // 저장 공간이 막힌 환경에서는 임시저장 없이 동작
  }
}

type Visibility = "public" | "anonymous" | "private";

const VISIBILITY_OPTIONS: { value: Visibility; label: string; saved: string }[] = [
  { value: "public", label: "이름 공개", saved: "나눔에 이름과 함께 올라갔어요." },
  { value: "anonymous", label: "익명 공개", saved: "나눔에 익명으로 올라갔어요." },
  { value: "private", label: "나만 보기", saved: "나만 볼 수 있어요. 참여 기록에는 반영돼요." },
];

interface Plan {
  title: string;
  reference: string;
  text: string;
  commentary: string;
}

interface WriteTabProps {
  userId: string;
  userDisplayName: string;
  initialDate?: string; // YYYY-MM-DD
}

export default function WriteTab({ userId, userDisplayName, initialDate }: WriteTabProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(() => (initialDate ? parseDateKey(initialDate) : today));
  const dateKey = getDateKey(selectedDate);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [meditation, setMeditation] = useState("");
  const [application, setApplication] = useState("");
  const [prayer, setPrayer] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [planLoaded, setPlanLoaded] = useState(false);
  const dirty = useRef(false); // 사용자가 직접 고친 내용이 있을 때만 임시저장
  const formRef = useRef<HTMLDivElement>(null);
  const [formVisible, setFormVisible] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setPlan(null);
    setPlanLoaded(false);
    (async () => {
      const { data } = await supabase
        .from("qt_plans")
        .select("title, reference, text, commentary")
        .eq("date", dateKey)
        .maybeSingle();
      if (cancelled) return;
      setPlan((data as Plan) ?? null);
      setPlanLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [dateKey]);

  useEffect(() => {
    setMeditation("");
    setApplication("");
    setPrayer("");
    setVisibility("public");
    setHasSaved(false);
    setDraftSaved(false);
    setLoadFailed(false);
    dirty.current = false;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("qt_logs")
        .select("id, meditation, application, prayer, is_public, is_anonymous")
        .eq("user_id", userId)
        .eq("date", dateKey)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        // 조회 실패 시 빈 폼으로 기존 기록을 덮어쓰지 않도록 저장을 막음
        setLoadFailed(true);
        toast({ title: "기록을 불러오지 못했어요", description: "잠시 후 다시 시도해주세요.", variant: "destructive" });
        return;
      }
      if (data) {
        setMeditation(data.meditation || "");
        setApplication(data.application || "");
        setPrayer(data.prayer || "");
        setVisibility(!data.is_public ? "private" : data.is_anonymous ? "anonymous" : "public");
        setHasSaved(true);
      }
      const draft = readDraft(draftKey(userId, dateKey));
      if (draft) {
        setMeditation(draft.meditation);
        setApplication(draft.application);
        setPrayer(draft.prayer);
        dirty.current = true;
        setDraftSaved(true);
        toast({ title: "작성 중이던 내용을 불러왔어요", description: "저장하기를 눌러야 반영돼요." });
      }
    })();
    return () => { cancelled = true; };
  }, [userId, dateKey, toast]);

  useEffect(() => {
    if (!dirty.current) return;
    writeDraft(draftKey(userId, dateKey), { meditation, application, prayer });
    setDraftSaved(true);
  }, [userId, dateKey, meditation, application, prayer]);

  // 본문이 길어 작성 칸이 화면 밖에 있으면 바로가기 버튼을 띄움
  useEffect(() => {
    const el = formRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting || entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleSave = async () => {
    const trimmedMeditation = meditation.trim();
    const trimmedApplication = application.trim();
    const trimmedPrayer = prayer.trim();
    if (!trimmedMeditation && !trimmedApplication && !trimmedPrayer) {
      toast({ title: "내용을 입력해주세요", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // (user_id, date) 유니크 기준 upsert: 날짜 전환 중 상태가 꼬여도 정확히 해당 날짜에 저장됨
      const { error } = await supabase.from("qt_logs").upsert(
        {
          user_id: userId,
          user_name: userDisplayName,
          date: dateKey,
          meditation: trimmedMeditation,
          application: trimmedApplication,
          prayer: trimmedPrayer,
          is_public: visibility !== "private",
          is_anonymous: visibility === "anonymous",
        },
        { onConflict: "user_id,date" },
      );
      if (error) throw error;
      dirty.current = false;
      writeDraft(draftKey(userId, dateKey), null);
      setDraftSaved(false);
      setHasSaved(true);
      window.dispatchEvent(new Event(QT_SAVED_EVENT)); // 어린 양이 바로 자라도록
      toast({ title: "저장되었습니다", description: VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.saved });
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || "저장 중 오류가 발생했습니다.";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formFields = [
    {
      key: "meditation",
      label: "묵상",
      subtitle: "하나님은 어떤 분이신가",
      placeholder: "말씀을 통해 발견한 하나님의 성품, 하신 일, 약속을 적어보세요.",
      value: meditation,
      onChange: (v: string) => { dirty.current = true; setMeditation(v); },
    },
    {
      key: "application",
      label: "적용",
      subtitle: "오늘 내 삶에 어떻게",
      placeholder: "오늘 말씀을 내 삶에 어떻게 적용할 수 있을까요?",
      value: application,
      onChange: (v: string) => { dirty.current = true; setApplication(v); },
    },
    {
      key: "prayer",
      label: "기도",
      subtitle: "나만 볼 수 있어요",
      placeholder: "오늘 하나님께 드리는 기도를 적어보세요.",
      value: prayer,
      onChange: (v: string) => { dirty.current = true; setPrayer(v); },
    },
  ];

  const canShare = hasSaved && typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="pb-8 max-w-lg mx-auto md:max-w-2xl lg:max-w-none">

      {/* ── Header: 날짜 이동 ── */}
      <header className="flex items-center gap-1 px-3 pt-4 pb-2 lg:px-6">
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          aria-label="이전 날"
          className="w-11 h-11 rounded-full flex items-center justify-center text-foreground hover:bg-secondary"
        >
          <ChevronLeft className="w-[22px] h-[22px]" />
        </button>
        <div className="flex-1 flex flex-col items-center min-w-0">
          <h1 className="text-[16px] font-extrabold tracking-[-0.02em]">
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 큐티
          </h1>
          <span className="text-[12px] text-muted-foreground truncate">
            {plan?.reference ?? (planLoaded ? "등록된 말씀 없음" : " ")}
          </span>
        </div>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          disabled={dateKey >= getDateKey(today)}
          aria-label="다음 날"
          className="w-11 h-11 rounded-full flex items-center justify-center text-foreground hover:bg-secondary disabled:opacity-25 disabled:pointer-events-none"
        >
          <ChevronRight className="w-[22px] h-[22px]" />
        </button>
      </header>

      <div className="px-4 pt-2 lg:px-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">

        {/* ── 말씀: 본문·해설·길잡이 모두 펼친 상태 (넓은 화면에서는 왼쪽 고정) ── */}
        <div className="space-y-3.5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-2">
          {!planLoaded ? (
            <div className="rounded-[22px] bg-card border border-border h-64 animate-pulse" />
          ) : plan ? (
            <>
              <article className="rounded-[22px] bg-card border border-border px-[18px] py-5 space-y-3">
                <h2 className="text-[19px] font-extrabold tracking-[-0.03em] leading-[1.35]">
                  {cleanPlanTitle(plan.title, plan.reference)}
                </h2>
                <ScripturePassage reference={plan.reference} />
              </article>

              {plan.text && (
                <section className="rounded-[22px] bg-card border border-border px-[18px] py-5">
                  <p className="text-[13px] font-bold text-muted-foreground mb-2.5">말씀 해설</p>
                  <p className="text-[15px] text-foreground/80 leading-[1.85] whitespace-pre-line">{plan.text}</p>
                </section>
              )}

              {plan.commentary && (
                <section className="space-y-2">
                  <p className="text-[13px] font-bold text-muted-foreground px-1">묵상 길잡이</p>
                  <MeditationGuide commentary={plan.commentary} />
                </section>
              )}
            </>
          ) : (
            <div className="rounded-[22px] bg-card border border-border px-5 py-10 text-center">
              <BookOpen className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-[14px] text-muted-foreground">이 날은 등록된 말씀이 없어요</p>
            </div>
          )}
        </div>

        {/* ── 나의 묵상 ── */}
        <div ref={formRef} className="mt-6 lg:mt-0 space-y-4 scroll-mt-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[13px] font-bold text-muted-foreground">나의 묵상</span>
            {draftSaved && <span className="text-[12px] text-muted-foreground">임시저장됨</span>}
          </div>

          {formFields.map(({ key, label, subtitle, placeholder, value, onChange }) => (
            <div key={key} className="space-y-2">
              <label htmlFor={`qt-${key}`} className="flex items-baseline gap-1.5 px-1">
                <span className="text-[16px] font-extrabold">{label}</span>
                <span className="text-[12px] text-muted-foreground">{subtitle}</span>
              </label>
              <textarea
                id={`qt-${key}`}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="block w-full min-h-[120px] resize-y rounded-2xl border border-border bg-card px-4 py-3.5 text-[15px] leading-[1.7] text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-2 focus:border-primary focus:px-[15px] focus:py-[13px]"
              />
            </div>
          ))}

          {/* ── 공개 범위 + 저장 ── */}
          <div className="sticky bottom-[calc(57px+env(safe-area-inset-bottom))] md:bottom-4 z-30 -mx-4 lg:mx-0 rounded-none lg:rounded-2xl bg-card border-y lg:border border-border px-4 pt-3 pb-3 space-y-2.5">
            <div role="radiogroup" aria-label="공개 범위" className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
              {VISIBILITY_OPTIONS.map((o) => {
                const active = visibility === o.value;
                return (
                  <button
                    key={o.value}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setVisibility(o.value)}
                    className={`h-9 rounded-[9px] text-[13px] transition-colors ${
                      active ? "bg-card text-foreground font-bold shadow-xs" : "text-muted-foreground font-medium"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || loadFailed}
                className="flex-1 h-[52px] rounded-2xl bg-primary text-primary-foreground text-[16px] font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors active:scale-[0.98]"
              >
                {saving ? "저장 중..." : visibility === "private" ? (hasSaved ? "수정하기" : "저장하기") : hasSaved ? "수정하고 나누기" : "저장하고 나누기"}
              </button>
              {canShare && (
                <button
                  onClick={() => {
                    const text = [`[QT Connect] ${dateKey}`, plan?.reference, plan?.title, "", "묵상: " + meditation.slice(0, 100), "적용: " + application.slice(0, 100)].filter(Boolean).join("\n");
                    navigator.share({ title: "QT 나눔", text }).catch(() => {});
                  }}
                  aria-label="다른 앱으로 공유"
                  className="w-[52px] h-[52px] rounded-2xl bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/80"
                >
                  <Share2 className="w-[18px] h-[18px]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!formVisible && (
        <button
          onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="lg:hidden fixed left-1/2 -translate-x-1/2 bottom-24 z-40 flex items-center gap-1.5 rounded-full bg-foreground text-background pl-4 pr-3.5 py-2.5 text-[13px] font-semibold shadow-lg active:scale-95 transition-transform"
        >
          <PenLine className="w-4 h-4" />
          {hasSaved ? "내 묵상 보기" : "묵상 쓰기"}
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
