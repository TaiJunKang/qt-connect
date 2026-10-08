import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDateKey } from "@/lib/date";
import MeditationShare, { type FeedRange } from "./community/MeditationShare";
import PrayerShare from "./community/PrayerShare";

interface CommunityTabProps {
  userId: string;
  userDisplayName: string;
}

type SubTab = "meditation" | "prayer";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "meditation", label: "묵상" },
  { id: "prayer", label: "기도제목" },
];

const RANGES: { id: FeedRange; label: string }[] = [
  { id: "today", label: "오늘" },
  { id: "week", label: "이번 주" },
];

export default function CommunityTab({ userId, userDisplayName }: CommunityTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("meditation");
  const [range, setRange] = useState<FeedRange>("today");
  const [reference, setReference] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("qt_plans")
      .select("reference")
      .eq("date", getDateKey(new Date()))
      .maybeSingle()
      .then(({ data }) => setReference(data?.reference ?? null));
  }, []);

  const summary = [reference, subTab === "meditation" && range === "today" && count !== null ? `${count}명` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="px-4 pt-6 pb-6 space-y-3.5 max-w-lg mx-auto md:max-w-2xl md:px-6">
      <header className="flex items-end justify-between gap-3 px-1">
        <h1 className="text-[25px] font-extrabold tracking-[-0.03em]">나눔</h1>
        {summary && <span className="text-[13px] text-muted-foreground pb-1">{summary}</span>}
      </header>

      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={subTab === t.id}
            onClick={() => setSubTab(t.id)}
            className={`h-[38px] rounded-[9px] text-[14px] transition-colors ${
              subTab === t.id ? "bg-card text-foreground font-bold shadow-xs" : "text-muted-foreground font-medium"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "meditation" ? (
        <>
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                aria-pressed={range === r.id}
                className={`h-8 px-3.5 rounded-full text-[13px] transition-colors ${
                  range === r.id
                    ? "bg-foreground text-background font-bold"
                    : "bg-card border border-border text-foreground/80 font-medium hover:bg-secondary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <MeditationShare userId={userId} userDisplayName={userDisplayName} range={range} onCount={setCount} />
        </>
      ) : (
        <PrayerShare userId={userId} userDisplayName={userDisplayName} />
      )}
    </div>
  );
}
