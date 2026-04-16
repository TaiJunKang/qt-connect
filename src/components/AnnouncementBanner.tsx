import { useEffect, useState } from "react";
import { Megaphone, Pin, ChevronDown, ChevronUp, AlertTriangle, Calendar, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Info; label: string; color: string }> = {
  general: { icon: Info, label: "공지", color: "bg-primary/10 text-primary border-primary/20" },
  event:   { icon: Calendar, label: "행사", color: "bg-blue-500/10 text-blue-600 border-blue-200/50" },
  urgent:  { icon: AlertTriangle, label: "긴급", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, content, category, is_pinned, created_at")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      setAnnouncements(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading || announcements.length === 0) return null;

  return (
    <div className="space-y-2">
      {announcements.map((a) => {
        const cat = CATEGORY_CONFIG[a.category] ?? CATEGORY_CONFIG.general;
        const Icon = cat.icon;
        const isExpanded = expanded === a.id;

        return (
          <button
            key={a.id}
            onClick={() => setExpanded(isExpanded ? null : a.id)}
            className={`w-full text-left rounded-xl border px-4 py-3 transition-all hover:shadow-xs ${
              a.category === "urgent"
                ? "bg-destructive/5 border-destructive/20"
                : "bg-card border-border/40"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {a.is_pinned && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />}
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cat.color} flex-shrink-0`}>
                {cat.label}
              </span>
              <p className="text-[13px] font-semibold text-foreground flex-1 truncate">{a.title}</p>
              <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">{formatDate(a.created_at)}</span>
              {a.content && (
                isExpanded
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
              )}
            </div>

            {isExpanded && a.content && (
              <p className="text-[12.5px] text-foreground/70 leading-[1.7] whitespace-pre-line mt-2.5 pt-2.5 border-t border-border/30">
                {a.content}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
