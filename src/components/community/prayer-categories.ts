export interface PrayerCategory {
  id: string;
  label: string;
  emoji: string;
  colorClass: string; // Tailwind classes for badge
}

export const PRAYER_CATEGORIES: PrayerCategory[] = [
  { id: "general",  label: "일반",   emoji: "🙏", colorClass: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "family",   label: "가족",   emoji: "👨‍👩‍👧", colorClass: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "health",   label: "건강",   emoji: "💚", colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "work",     label: "진로/학업", emoji: "📚", colorClass: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "relation", label: "관계",   emoji: "🤝", colorClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "church",   label: "교회",   emoji: "⛪", colorClass: "bg-violet-50 text-violet-700 border-violet-200" },
  { id: "thanks",   label: "감사",   emoji: "✨", colorClass: "bg-yellow-50 text-yellow-700 border-yellow-200" },
];

export function getCategory(id: string): PrayerCategory {
  return PRAYER_CATEGORIES.find((c) => c.id === id) ?? PRAYER_CATEGORIES[0];
}
