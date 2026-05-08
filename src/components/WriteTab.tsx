import { useState, useEffect } from "react";
import { BookOpen, Save, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Lock, Globe, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [scriptureExpanded, setScriptureExpanded] = useState(true);
  const [commentaryExpanded, setCommentaryExpanded] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setPlan(null);
    (async () => {
      const { data } = await supabase
        .from("qt_plans")
        .select("title, reference, text, commentary")
        .eq("date", dateKey)
        .maybeSingle();
      if (data) setPlan(data as Plan);
    })();
  }, [dateKey]);

  useEffect(() => {
    setMeditation("");
    setApplication("");
    setPrayer("");
    setIsPublic(false);
    setHasSaved(false);
    (async () => {
      const { data } = await supabase
        .from("qt_logs")
        .select("id, meditation, application, prayer, is_public")
        .eq("user_id", userId)
        .eq("date", dateKey)
        .maybeSingle();
      if (data) {
        setMeditation(data.meditation || "");
        setApplication(data.application || "");
        setPrayer(data.prayer || "");
        setIsPublic(data.is_public || false);
        setHasSaved(true);
      }
    })();
  }, [userId, dateKey]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmedMeditation = meditation.trim();
      const trimmedApplication = application.trim();
      const trimmedPrayer = prayer.trim();
      const payload = {
        user_id: userId,
        user_name: userDisplayName,
        date: dateKey,
        meditation: trimmedMeditation,
        application: trimmedApplication,
        prayer: trimmedPrayer,
        is_public: isPublic,
      };
      if (hasSaved) {
        const { error } = await supabase
          .from("qt_logs")
          .update({ meditation: trimmedMeditation, application: trimmedApplication, prayer: trimmedPrayer, is_public: isPublic })
          .eq("user_id", userId)
          .eq("date", dateKey);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("qt_logs").insert(payload);
        if (error) throw error;
        setHasSaved(true);
      }
      toast({ title: "저장되었습니다", description: isPublic ? "공동체와 공유되었어요." : "나만 볼 수 있어요." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.";
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
      onChange: setMeditation,
    },
    {
      key: "application",
      label: "적용",
      subtitle: "내게 주시는 교훈",
      placeholder: "오늘 말씀을 내 삶에 어떻게 적용할 수 있을까요?",
      value: application,
      onChange: setApplication,
    },
    {
      key: "prayer",
      label: "기도",
      subtitle: "나의 기도",
      placeholder: "오늘 하나님께 드리는 기도를 적어보세요.",
      value: prayer,
      onChange: setPrayer,
    },
  ];

  return (
    <div className="px-5 pt-3 pb-8 space-y-6 max-w-lg mx-auto md:max-w-2xl md:px-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">큐티 작성</h1>
      </div>

      {/* ── Date navigation ── */}
      <div className="flex items-center gap-3 -mt-2">
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[14px] text-foreground/80 font-medium flex-1 text-center">
          {selectedDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
        </span>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(today)}
            className="text-[13px] text-primary font-semibold px-3 py-1.5 rounded-full bg-primary/8 hover:bg-primary/15 transition-colors"
          >
            오늘
          </button>
        )}
      </div>

      {/* ── Scripture block (collapsible) ── */}
      {plan && (
        <div className="rounded-2xl bg-card overflow-hidden">
          <button
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/40 transition-colors"
            onClick={() => setScriptureExpanded((v) => !v)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-primary mb-0.5">
                {plan.reference}
              </p>
              <p className="text-[14px] font-semibold text-foreground leading-snug truncate">
                {plan.title}
              </p>
            </div>
            {scriptureExpanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />}
          </button>

          {scriptureExpanded && plan.text && (
            <div className="mx-4 mb-4 rounded-xl bg-secondary/50 px-5 py-4">
              <p className="text-[13.5px] text-foreground/70 leading-[1.85] whitespace-pre-line">
                {plan.text}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Commentary (collapsible) ── */}
      {plan?.commentary && (
        <div className="rounded-2xl bg-card overflow-hidden">
          <button
            className="w-full flex items-center gap-2.5 px-5 py-3.5 text-left hover:bg-accent/40 transition-colors"
            onClick={() => setCommentaryExpanded((v) => !v)}
          >
            <span className="text-[13px] font-bold text-foreground/80 flex-1">
              묵상 길잡이
            </span>
            {commentaryExpanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground/40" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground/40" />}
          </button>
          {commentaryExpanded && (
            <div className="px-5 pb-4 space-y-3">
              {plan.commentary.split(/\n\n+/).map((section, i) => {
                const trimmed = section.trim();
                if (!trimmed) return null;
                const headerMatch = trimmed.match(/^(오늘의 핵심|묵상 질문|🙏\s*.+)\n([\s\S]*)$/);
                if (headerMatch) {
                  return (
                    <div key={i}>
                      <p className="text-[12px] font-semibold text-primary mb-1">
                        {headerMatch[1].replace(/^🙏\s*/, '')}
                      </p>
                      <p className="text-[13.5px] text-foreground/60 leading-[1.85] whitespace-pre-line">
                        {headerMatch[2].trim()}
                      </p>
                    </div>
                  );
                }
                if (trimmed.includes("?") && trimmed.split("\n").every((l: string) => !l.trim() || l.trim().endsWith("?"))) {
                  return (
                    <div key={i} className="rounded-xl bg-secondary/50 px-4 py-3 space-y-2">
                      {trimmed.split("\n").filter((l: string) => l.trim()).map((q: string, qi: number) => (
                        <p key={qi} className="text-[12.5px] text-foreground/65 leading-relaxed">{q.trim()}</p>
                      ))}
                    </div>
                  );
                }
                return <p key={i} className="text-[13.5px] text-foreground/60 leading-[1.85] whitespace-pre-line">{trimmed}</p>;
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Divider ── */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[12px] text-muted-foreground font-medium">나의 묵상</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── Form fields ── */}
      <div className="space-y-4">
        {formFields.map(({ key, label, subtitle, placeholder, value, onChange }) => (
          <div key={key}>
            <div className="flex items-baseline gap-1.5 mb-2 px-1">
              <span className="text-[13px] font-semibold text-foreground">
                {label}
              </span>
              <span className="text-[11px] text-muted-foreground/70">{subtitle}</span>
            </div>
            <Textarea
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[140px] bg-card border-0 rounded-2xl resize-none leading-[1.8] text-[14px] placeholder:text-muted-foreground/35 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all px-5 py-4"
            />
          </div>
        ))}
      </div>

      {/* ── Public toggle ── */}
      <div className="rounded-2xl bg-card px-5 py-4 flex items-center justify-between gap-4">
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
          disabled={saving}
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
  );
}
