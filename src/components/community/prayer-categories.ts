export interface PrayerCategory {
  id: string;
  label: string;
  emoji: string;
  colorClass: string; // Tailwind classes for badge
}

export const PRAYER_CATEGORIES: PrayerCategory[] = [
  { id: "general",  label: "일반",   emoji: "🙏", colorClass: "bg-secondary text-foreground/75 border-transparent" },
  { id: "family",   label: "가족",   emoji: "👨‍👩‍👧", colorClass: "bg-secondary text-foreground/75 border-transparent" },
  { id: "health",   label: "건강",   emoji: "💚", colorClass: "bg-secondary text-foreground/75 border-transparent" },
  { id: "work",     label: "진로/학업", emoji: "📚", colorClass: "bg-secondary text-foreground/75 border-transparent" },
  { id: "relation", label: "관계",   emoji: "🤝", colorClass: "bg-secondary text-foreground/75 border-transparent" },
  { id: "church",   label: "교회",   emoji: "⛪", colorClass: "bg-secondary text-foreground/75 border-transparent" },
  { id: "thanks",   label: "감사",   emoji: "✨", colorClass: "bg-secondary text-foreground/75 border-transparent" },
];

export function getCategory(id: string): PrayerCategory {
  return PRAYER_CATEGORIES.find((c) => c.id === id) ?? PRAYER_CATEGORIES[0];
}
