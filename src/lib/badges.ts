export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  category: "streak" | "total" | "community";
  threshold: number;
  color: string; // Tailwind gradient classes
}

export interface BadgeWithStatus extends Badge {
  earned: boolean;
  progress: number; // 0-1
  currentValue: number;
}

export interface UserBadgeStats {
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
  publicShareCount: number;
  prayerRequestCount: number;
  prayerResponseCount: number;
}

export const BADGES: Badge[] = [
  // Streak badges
  { id: "first-step",    emoji: "🌱", title: "첫걸음",        description: "첫 묵상을 완료했어요",   category: "streak", threshold: 1,   color: "from-emerald-400 to-green-500" },
  { id: "streak-7",      emoji: "🔥", title: "일주일 지킴이", description: "7일 연속 묵상",         category: "streak", threshold: 7,   color: "from-orange-400 to-red-500" },
  { id: "streak-30",     emoji: "💪", title: "한 달 꾸준히",  description: "30일 연속 묵상",        category: "streak", threshold: 30,  color: "from-rose-400 to-pink-500" },
  { id: "streak-100",    emoji: "🏆", title: "백일의 기적",   description: "100일 연속 묵상",       category: "streak", threshold: 100, color: "from-amber-400 to-yellow-500" },

  // Total badges
  { id: "total-10",      emoji: "📖", title: "성실한 독자",   description: "총 10회 묵상",          category: "total",  threshold: 10,  color: "from-blue-400 to-sky-500" },
  { id: "total-50",      emoji: "📚", title: "말씀의 사람",   description: "총 50회 묵상",          category: "total",  threshold: 50,  color: "from-indigo-400 to-blue-600" },
  { id: "total-100",     emoji: "🎯", title: "백번의 만남",   description: "총 100회 묵상",         category: "total",  threshold: 100, color: "from-violet-400 to-purple-600" },
  { id: "total-365",     emoji: "👑", title: "일 년의 여정",  description: "총 365회 묵상",         category: "total",  threshold: 365, color: "from-fuchsia-400 to-pink-600" },

  // Community badges
  { id: "first-share",   emoji: "💬", title: "첫 나눔",       description: "처음으로 묵상을 공유",  category: "community", threshold: 1,  color: "from-cyan-400 to-teal-500" },
  { id: "first-prayer",  emoji: "🙏", title: "첫 기도 제목",  description: "기도 제목을 올렸어요",  category: "community", threshold: 1,  color: "from-purple-400 to-indigo-500" },
  { id: "intercessor-10", emoji: "💝", title: "중보기도 10회", description: "10번 '기도했어요'",    category: "community", threshold: 10, color: "from-pink-400 to-rose-500" },
  { id: "intercessor-50", emoji: "🤝", title: "기도의 친구",   description: "50번 '기도했어요'",    category: "community", threshold: 50, color: "from-teal-400 to-emerald-500" },
];

function getValueForBadge(badge: Badge, stats: UserBadgeStats): number {
  switch (badge.id) {
    case "first-step":
    case "total-10":
    case "total-50":
    case "total-100":
    case "total-365":
      return stats.totalDays;
    case "streak-7":
    case "streak-30":
    case "streak-100":
      return Math.max(stats.longestStreak, stats.currentStreak);
    case "first-share":
      return stats.publicShareCount;
    case "first-prayer":
      return stats.prayerRequestCount;
    case "intercessor-10":
    case "intercessor-50":
      return stats.prayerResponseCount;
    default:
      return 0;
  }
}

export function calculateBadges(stats: UserBadgeStats): BadgeWithStatus[] {
  return BADGES.map((badge) => {
    const currentValue = getValueForBadge(badge, stats);
    const earned = currentValue >= badge.threshold;
    const progress = Math.min(currentValue / badge.threshold, 1);
    return { ...badge, earned, progress, currentValue };
  });
}

export function getEarnedCount(badges: BadgeWithStatus[]): number {
  return badges.filter((b) => b.earned).length;
}
