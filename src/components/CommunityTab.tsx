import { useState } from "react";
import { Users, HandHeart } from "lucide-react";
import MeditationShare from "./community/MeditationShare";
import PrayerShare from "./community/PrayerShare";

interface CommunityTabProps {
  userId: string;
  userDisplayName: string;
}

type SubTab = "meditation" | "prayer";

export default function CommunityTab({ userId, userDisplayName }: CommunityTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("meditation");

  const dateStr = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" });

  return (
    <div className="px-4 pt-7 pb-6 space-y-5 max-w-lg mx-auto md:max-w-2xl md:px-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
          <Users className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground font-medium tracking-[0.1em] uppercase">
            {dateStr}
          </p>
          <h1 className="text-xl font-bold text-foreground tracking-tight">공동체</h1>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="inline-flex w-full p-1 rounded-2xl bg-muted/60 border border-border/40">
        <button
          onClick={() => setSubTab("meditation")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold rounded-xl transition-all ${
            subTab === "meditation"
              ? "bg-card text-primary shadow-xs"
              : "text-muted-foreground/60 hover:text-foreground"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          묵상 나눔
        </button>
        <button
          onClick={() => setSubTab("prayer")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold rounded-xl transition-all ${
            subTab === "prayer"
              ? "bg-card text-primary shadow-xs"
              : "text-muted-foreground/60 hover:text-foreground"
          }`}
        >
          <HandHeart className="w-3.5 h-3.5" />
          기도 제목
        </button>
      </div>

      {/* Content */}
      {subTab === "meditation" ? (
        <MeditationShare userId={userId} userDisplayName={userDisplayName} />
      ) : (
        <PrayerShare userId={userId} userDisplayName={userDisplayName} />
      )}
    </div>
  );
}
