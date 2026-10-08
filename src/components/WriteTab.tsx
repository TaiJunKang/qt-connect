import { useState, useEffect, useRef } from "react";
import { BookOpen, Save, ChevronLeft, ChevronRight, ChevronDown, Lock, Globe, Share2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ScripturePassage from "./ScripturePassage";
import MeditationGuide from "./MeditationGuide";
import { cleanPlanTitle } from "@/lib/plan";

function getDateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialDate) {
      const [y, m, d] = initialDate.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return today;
  });
  const dateKey = getDateKey(selectedDate);
  const isToday = getDateKey(today) === dateKey;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [meditation, setMeditation] = useState("");
  const [application, setApplication] = useState("");
  const [prayer, setPrayer] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
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
    setIsPublic(false);
    setHasSaved(false);
    setLoadFailed(false);
    dirty.current = false;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("qt_logs")
        .select("id, meditation, application, prayer, is_public")
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
        setIsPublic(data.is_public || false);
        setHasSaved(true);
      }
      const draft = readDraft(draftKey(userId, dateKey));
      if (draft) {
        setMeditation(draft.meditation);
        setApplication(draft.application);
        setPrayer(draft.prayer);
        dirty.current = true;
        toast({ title: "작성 중이던 내용을 불러왔어요", description: "저장하기를 눌러야 반영돼요." });
      }
    })();
    return () => { cancelled = true; };
  }, [userId, dateKey, toast]);

  useEffect(() => {
    if (!dirty.current) return;
    writeDraft(draftKey(userId, dateKey), { meditation, application, prayer });
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
          is_public: isPublic,
        },
        { onConflict: "user_id,date" },
      );
      if (error) throw error;
      dirty.current = false;
      writeDraft(draftKey(userId, dateKey), null);
      setHasSaved(true);
      toast({ title: "저장되었습니다", description: isPublic ? "공동체와 공유되었어요." : "나만 볼 수 있어요." });
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
      subtitle: "내게 주시는 교훈",
      placeholder: "오늘 말씀을 내 삶에 어떻게 적용할 수 있을까요?",
      value: application,
      onChange: (v: string) => { dirty.current = true; setApplication(v); },
    },
    {
      key: "prayer",
      label: "기도",
      subtitle: "나의 기도",
      placeholder: "오늘 하나님께 드리는 기도를 적어보세요.",
      value: prayer,
      onChange: (v: string) => { dirty.current = true; setPrayer(v); },
    },
  ];

  return (
    <div className="px-5 pt-3 pb-8 max-w-lg mx-auto md:max-w-2xl md:px-6 lg:max-w-none lg:px-8">

      {/* ── Header + date navigation ── */}
      <div className="flex items-center gap-2">
        <h1 className="font-display text-[24px] text-foreground flex-1">큐티 작성</h1>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          aria-label="이전 날"
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[14px] text-foreground/80 font-semibold min-w-[64px] text-center tabular-nums">
          {selectedDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
        </span>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          disabled={dateKey >= getDateKey(today)}
          aria-label="다음 날"
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(today)}
            className="text-[13px] text-primary font-semibold px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors"
          >
            오늘
          </button>
        )}
      </div>

      <div className="mt-5 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">

        {/* ── 말씀: 본문·해설·길잡이 모두 펼친 상태로 표시 (넓은 화면에서는 왼쪽 고정) ── */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-2 lg:-mr-2">
          {!planLoaded ? (
            <div className="rounded-2xl bg-card shadow-card h-64 animate-pulse" />
          ) : plan ? (
            <>
              <article className="rounded-2xl bg-card px-5 py-5 md:px-6 shadow-card">
                <div className="flex items-center gap-1.5 text-primary mb-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <p className="text-[12px] font-semibold">{plan.reference}</p>
                </div>
                <h2 className="font-display text-[20px] text-foreground leading-snug">{cleanPlanTitle(plan.title, plan.reference)}</h2>
                <div className="mt-4 pt-4 border-t border-border/60">
                  <ScripturePassage reference={plan.reference} />
                </div>
              </article>

              {plan.text && (
                <section className="rounded-2xl bg-card px-5 py-5 md:px-6 shadow-card">
                  <p className="text-[13px] font-bold text-foreground tracking-tight mb-3">말씀 해설</p>
                  <p className="text-[14px] text-foreground/70 leading-[1.85] whitespace-pre-line">{plan.text}</p>
                </section>
              )}

              {plan.commentary && (
                <section className="rounded-2xl bg-card px-5 py-5 md:px-6 shadow-card">
                  <p className="text-[13px] font-bold text-foreground tracking-tight mb-3">묵상 길잡이</p>
                  <MeditationGuide commentary={plan.commentary} />
                </section>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-card px-5 py-10 text-center shadow-card">
              <BookOpen className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">이 날은 등록된 말씀이 없어요</p>
            </div>
          )}
        </div>

        {/* ── 나의 묵상 ── */}
        <div ref={formRef} className="mt-8 lg:mt-0 space-y-6 scroll-mt-4">
          {/* ── Divider ── */}
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] font-bold tracking-[0.04em] text-primary">나의 묵상</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* ── Form fields ── */}
          <div className="space-y-4">
            {formFields.map(({ key, label, subtitle, placeholder, value, onChange }) => (
              <div key={key}>
                <div className="flex items-baseline gap-1.5 mb-2 px-1">
                  <span className="font-display text-[15px] text-foreground">
                    {label}
                  </span>
                  <span className="text-[12px] text-muted-foreground">{subtitle}</span>
                </div>
                <Textarea
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="min-h-[140px] bg-card shadow-card border-0 rounded-2xl resize-none leading-[1.8] text-[14px] placeholder:text-muted-foreground/35 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all px-5 py-4"
                />
              </div>
            ))}
          </div>

          {/* ── Public toggle ── */}
          <div className="rounded-2xl bg-card shadow-card px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isPublic
                ? <Globe className="w-[18px] h-[18px] text-primary" />
                : <Lock className="w-[18px] h-[18px] text-muted-foreground" />
              }
              <div>
                <p className="text-[14px] font-medium text-foreground">공동체와 함께 나누기</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">묵상/적용만 공유 (기도는 비공개)</p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || loadFailed}
              className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-2xl py-4 text-[15px] font-semibold flex items-center justify-center gap-2 tracking-tight transition-colors active:scale-[0.98]"
            >
              <Save className="w-[18px] h-[18px]" />
              {saving ? "저장 중..." : hasSaved ? "수정하기" : "저장하기"}
            </button>
            {hasSaved && typeof navigator !== "undefined" && navigator.share && (
              <button
                onClick={() => {
                  const text = [`[QT Connect] ${dateKey}`, plan?.reference, plan?.title, '', '묵상: ' + meditation.slice(0, 100), '적용: ' + application.slice(0, 100)].filter(Boolean).join('\n');
                  navigator.share({ title: 'QT 나눔', text }).catch(() => {});
                }}
                className="w-14 bg-secondary hover:bg-secondary/80 text-foreground rounded-2xl flex items-center justify-center transition-colors active:scale-[0.98]"
              >
                <Share2 className="w-[18px] h-[18px]" />
              </button>
            )}
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
