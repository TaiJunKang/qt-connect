import { useState, useEffect } from "react";
import { BookOpen, Save, Lightbulb, ChevronDown, ChevronUp, Lock, Globe, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function getTodayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
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
}

export default function WriteTab({ userId, userDisplayName }: WriteTabProps) {
  const todayKey = getTodayKey();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [meditation, setMeditation] = useState("");
  const [application, setApplication] = useState("");
  const [prayer, setPrayer] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [scriptureExpanded, setScriptureExpanded] = useState(true);
  const [commentaryExpanded, setCommentaryExpanded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("qt_plans")
        .select("title, reference, text, commentary")
        .eq("date", todayKey)
        .maybeSingle();
      if (data) setPlan(data as Plan);
    })();
  }, [todayKey]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("qt_logs")
        .select("id, meditation, application, prayer, is_public")
        .eq("user_id", userId)
        .eq("date", todayKey)
        .maybeSingle();
      if (data) {
        setMeditation(data.meditation || "");
        setApplication(data.application || "");
        setPrayer(data.prayer || "");
        setIsPublic(data.is_public || false);
        setHasSaved(true);
      }
    })();
  }, [userId, todayKey]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        user_name: userDisplayName,
        date: todayKey,
        meditation,
        application,
        prayer,
        is_public: isPublic,
      };
      if (hasSaved) {
        const { error } = await supabase
          .from("qt_logs")
          .update({ meditation, application, prayer, is_public: isPublic })
          .eq("user_id", userId)
          .eq("date", todayKey);
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
      color: "text-violet-600 bg-violet-500/10 border-violet-200/50",
    },
    {
      key: "application",
      label: "적용",
      subtitle: "내게 주시는 교훈",
      placeholder: "오늘 말씀을 내 삶에 어떻게 적용할 수 있을까요?",
      value: application,
      onChange: setApplication,
      color: "text-blue-600 bg-blue-500/10 border-blue-200/50",
    },
    {
      key: "prayer",
      label: "기도",
      subtitle: "나의 기도",
      placeholder: "오늘 하나님께 드리는 기도를 적어보세요.",
      value: prayer,
      onChange: setPrayer,
      color: "text-amber-600 bg-amber-500/10 border-amber-200/50",
    },
  ];

  return (
    <div className="px-4 pt-7 pb-6 space-y-5 max-w-lg mx-auto md:max-w-2xl md:px-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
          <Pen className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-[0.1em] uppercase">
            {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
          </p>
          <h1 className="text-xl font-bold text-foreground tracking-tight">큐티 작성</h1>
        </div>
      </div>

      {/* ── Scripture block (collapsible) ── */}
      {plan && (
        <div className="rounded-2xl bg-card border border-border/40 shadow-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/40" />
          <button
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/30 transition-colors"
            onClick={() => setScriptureExpanded((v) => !v)}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-primary/60 tracking-[0.15em] uppercase bg-primary/5 inline-block px-1.5 py-0.5 rounded">
                {plan.reference}
              </p>
              <p className="text-[13px] font-semibold text-foreground leading-snug truncate mt-0.5">
                {plan.title}
              </p>
            </div>
            {scriptureExpanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />}
          </button>

          {scriptureExpanded && plan.text && (
            <div
              className="mx-4 mb-4 rounded-xl px-4 py-4 border-l-gold"
              style={{ background: "hsl(var(--scripture-bg))" }}
            >
              <p className="text-[13px] text-foreground/75 leading-[2] whitespace-pre-line font-scripture">
                {plan.text}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Commentary (collapsible) ── */}
      {plan?.commentary && (
        <div className="rounded-2xl bg-card border border-border/40 shadow-xs overflow-hidden">
          <button
            className="w-full flex items-center gap-2.5 px-5 py-3.5 text-left hover:bg-accent/30 transition-colors"
            onClick={() => setCommentaryExpanded((v) => !v)}
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-[11px] font-bold text-amber-700/70 tracking-[0.12em] uppercase flex-1">
              묵상 길잡이
            </span>
            {commentaryExpanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground/40" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground/40" />}
          </button>
          {commentaryExpanded && (
            <p className="px-5 pb-4 text-[13px] text-foreground/70 leading-[1.9] whitespace-pre-line font-scripture">
              {plan.commentary}
            </p>
          )}
        </div>
      )}

      {/* ── Divider ── */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <span className="text-[10px] text-muted-foreground/60 tracking-[0.15em] uppercase font-semibold">나의 묵상</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* ── Form fields ── */}
      <div className="space-y-4">
        {formFields.map(({ key, label, subtitle, placeholder, value, onChange, color }) => (
          <div key={key} className="space-y-2">
            <Label className="flex items-center gap-2">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${color}`}>
                {label}
              </span>
              <span className="text-[11px] text-muted-foreground/60">{subtitle}</span>
            </Label>
            <Textarea
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[120px] bg-card border-border/50 rounded-xl resize-none leading-7 text-[14px] placeholder:text-muted-foreground/35 shadow-xs focus-visible:ring-primary/30 focus-visible:border-primary/30 transition-all"
            />
          </div>
        ))}
      </div>

      {/* ── Public toggle ── */}
      <div className="rounded-2xl bg-card border border-border/40 shadow-card px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isPublic ? "bg-emerald-500/10" : "bg-muted/60"
          }`}>
            {isPublic
              ? <Globe className="w-4 h-4 text-emerald-600" />
              : <Lock className="w-4 h-4 text-muted-foreground" />
            }
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">공동체와 함께 나누기</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">묵상/적용만 공유 (기도는 비공개)</p>
          </div>
        </div>
        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
      </div>

      {/* ── Save button ── */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl py-6 text-[15px] font-semibold shadow-soft flex items-center justify-center gap-2.5 tracking-tight transition-all hover:shadow-glow"
      >
        <Save className="w-4.5 h-4.5" />
        {saving ? "저장 중..." : hasSaved ? "수정하기" : "저장하기"}
      </Button>
    </div>
  );
}
