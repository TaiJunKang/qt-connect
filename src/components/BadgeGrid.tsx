import { Award, Lock } from "lucide-react";
import type { BadgeWithStatus } from "@/lib/badges";

interface BadgeGridProps {
  badges: BadgeWithStatus[];
}

export default function BadgeGrid({ badges }: BadgeGridProps) {
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="rounded-2xl bg-card border border-border/40 px-4 py-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Award className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-[13px] font-semibold text-foreground">획득한 배지</span>
        </div>
        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/40">
          {earnedCount}/{badges.length}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`relative rounded-xl border p-2.5 text-center transition-all group cursor-default ${
              badge.earned
                ? `bg-gradient-to-br ${badge.color} border-transparent shadow-xs`
                : "bg-muted/40 border-border/30"
            }`}
            title={`${badge.title} - ${badge.description}`}
          >
            {/* Icon */}
            <div className={`text-2xl mb-1 ${badge.earned ? "" : "grayscale opacity-40"}`}>
              {badge.earned ? badge.emoji : <Lock className="w-5 h-5 mx-auto text-muted-foreground/40" />}
            </div>

            {/* Title */}
            <p className={`text-[9px] font-bold leading-tight truncate ${
              badge.earned ? "text-white/95" : "text-muted-foreground/50"
            }`}>
              {badge.title}
            </p>

            {/* Progress dot for unearned */}
            {!badge.earned && badge.progress > 0 && badge.progress < 1 && (
              <div className="absolute top-1 right-1 text-[8px] font-bold text-muted-foreground/60 bg-card px-1 rounded">
                {Math.floor(badge.progress * 100)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
