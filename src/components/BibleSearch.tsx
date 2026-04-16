import { useState, useCallback } from "react";
import { Search, X, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchBible, type BibleSearchResult } from "@/lib/bible-parser";

interface BibleSearchProps {
  onClose: () => void;
}

export default function BibleSearch({ onClose }: BibleSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BibleSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchBible(query.trim(), 30);
      setResults(data);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  // Highlight matching keyword in text
  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">{part}</mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background md:left-60">
      <div className="max-w-lg mx-auto md:max-w-2xl h-full flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground flex-1">성경 검색</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="w-8 h-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="검색어를 입력하세요 (예: 사랑, 믿음, 은혜)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-10 text-sm"
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="h-10 px-4 bg-primary hover:bg-primary/90"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : !searched ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                <Search className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">키워드로 성경 구절을 검색해보세요</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">개역개정 전체에서 검색합니다</p>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <p className="text-[13px] text-muted-foreground">"{query}"에 대한 검색 결과가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground mb-3">
                {results.length}개 구절{results.length >= 30 ? " (최대 30개)" : ""}
              </p>
              {results.map((r, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/40 bg-card px-4 py-3 hover:bg-accent/30 transition-colors"
                >
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                    {r.reference}
                  </span>
                  <p className="text-[13px] text-foreground mt-1.5 leading-relaxed font-scripture">
                    {highlight(r.text)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
