import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, BookOpenCheck, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BIBLE_BOOKS, TOTAL_CHAPTERS, type BibleBook } from "@/lib/bible-books";

interface BibleReadingPlanProps {
  userId: string;
  onClose: () => void;
}

type Testament = "all" | "old" | "new";

export default function BibleReadingPlan({ userId, onClose }: BibleReadingPlanProps) {
  const { toast } = useToast();
  const [readSet, setReadSet] = useState<Set<string>>(new Set()); // "책-장" 형식
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Testament>("all");
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bible_readings")
      .select("book, chapter")
      .eq("user_id", userId);
    const set = new Set<string>();
    data?.forEach((r) => set.add(`${r.book}-${r.chapter}`));
    setReadSet(set);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchReadings(); }, [fetchReadings]);

  const toggleChapter = async (book: string, chapter: number) => {
    const key = `${book}-${chapter}`;
    const wasRead = readSet.has(key);

    // Optimistic update
    const next = new Set(readSet);
    if (wasRead) next.delete(key);
    else next.add(key);
    setReadSet(next);

    try {
      if (wasRead) {
        await supabase.from("bible_readings").delete().eq("user_id", userId).eq("book", book).eq("chapter", chapter);
      } else {
        await supabase.from("bible_readings").insert({ user_id: userId, book, chapter });
      }
    } catch (e) {
      // Rollback
      setReadSet(readSet);
      const msg = e instanceof Error ? e.message : "오류 발생";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const filteredBooks = BIBLE_BOOKS.filter((b) => filter === "all" || b.testament === filter);
  const totalRead = readSet.size;
  const overallPct = Math.round((totalRead / TOTAL_CHAPTERS) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-background md:left-60 overflow-y-auto">
      <div className="max-w-lg mx-auto md:max-w-2xl min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-accent transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <h2 className="text-[15px] font-bold text-foreground">성경 통독표</h2>
              <p className="text-[11px] text-muted-foreground/60">{totalRead}/{TOTAL_CHAPTERS}장 ({overallPct}%)</p>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
              style={{ width: `${Math.max(overallPct, 1)}%` }}
            />
          </div>

          {/* Testament filter */}
          <div className="flex gap-1 p-0.5 mt-3 rounded-xl bg-muted/60 border border-border/30">
            {[
              { id: "all" as const,  label: "전체" },
              { id: "old" as const,  label: "구약" },
              { id: "new" as const,  label: "신약" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                  filter === t.id ? "bg-card text-primary shadow-xs" : "text-muted-foreground/60"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-4 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            filteredBooks.map((book) => (
              <BookRow
                key={book.abbr}
                book={book}
                readSet={readSet}
                expanded={expandedBook === book.abbr}
                onToggleExpand={() => setExpandedBook(expandedBook === book.abbr ? null : book.abbr)}
                onToggleChapter={toggleChapter}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function BookRow({
  book,
  readSet,
  expanded,
  onToggleExpand,
  onToggleChapter,
}: {
  book: BibleBook;
  readSet: Set<string>;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleChapter: (book: string, chapter: number) => void;
}) {
  let readCount = 0;
  for (let c = 1; c <= book.chapters; c++) {
    if (readSet.has(`${book.abbr}-${c}`)) readCount++;
  }
  const pct = Math.round((readCount / book.chapters) * 100);
  const isDone = readCount === book.chapters;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isDone ? "bg-emerald-50/40 border-emerald-200/50" : "bg-card border-border/40"
    }`}>
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/20 transition-colors"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isDone ? "bg-emerald-500 text-white" : book.testament === "old" ? "bg-amber-500/10 text-amber-700" : "bg-blue-500/10 text-blue-700"
        }`}>
          {isDone ? <Check className="w-4 h-4" /> : <span className="text-[11px] font-bold">{book.abbr}</span>}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{book.name}</p>
          <p className="text-[10px] text-muted-foreground/60">{readCount}/{book.chapters}장</p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className={`text-[12px] font-bold ${isDone ? "text-emerald-600" : "text-primary"}`}>{pct}%</p>
          <div className="w-16 h-1 rounded-full bg-muted overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-500 ${isDone ? "bg-emerald-500" : "bg-primary/70"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </button>

      {/* Chapter grid */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border/20">
          <div className="grid grid-cols-10 gap-1.5 mt-3">
            {Array.from({ length: book.chapters }, (_, i) => {
              const chapter = i + 1;
              const isRead = readSet.has(`${book.abbr}-${chapter}`);
              return (
                <button
                  key={chapter}
                  onClick={() => onToggleChapter(book.abbr, chapter)}
                  className={`aspect-square rounded-md text-[10px] font-bold transition-all ${
                    isRead
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20"
                  }`}
                >
                  {chapter}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
