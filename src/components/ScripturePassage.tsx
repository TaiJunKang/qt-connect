import { useEffect, useState } from "react";
import { loadChapters, parseReference, type Verse } from "@/lib/bible-parser";

interface ScripturePassageProps {
  reference: string; // "신명기 1장", "창세기 1~2장"
  className?: string;
}

// 개역개정 본문을 절 번호·소제목과 함께 표시
export default function ScripturePassage({ reference, className = "" }: ScripturePassageProps) {
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setVerses(null);
    setFailed(false);
    loadChapters(parseReference(reference))
      .then((v) => { if (!cancelled) setVerses(v); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [reference]);

  if (failed || (verses && verses.length === 0)) {
    return (
      <p className={`text-[13px] text-muted-foreground text-center py-6 ${className}`}>
        본문을 불러올 수 없어요.
      </p>
    );
  }

  if (!verses) {
    return (
      <div className={`space-y-2.5 py-1 ${className}`}>
        {[92, 100, 85, 96, 70].map((w, i) => (
          <div key={i} className="h-3.5 rounded bg-muted animate-pulse" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }

  const multiChapter = new Set(verses.map((v) => v.chapter)).size > 1;

  return (
    <div className={`font-scripture text-[15px] leading-[2] text-foreground/85 ${className}`}>
      {verses.map((v, i) => (
        <div key={i}>
          {multiChapter && (i === 0 || verses[i - 1].chapter !== v.chapter) && (
            <p className="font-sans text-[12px] font-bold text-primary tracking-tight mt-5 first:mt-0 mb-1">
              {v.chapter}장
            </p>
          )}
          {v.heading && (
            <p className="font-sans text-[12.5px] font-semibold text-foreground/55 tracking-tight mt-4 mb-1 first:mt-0">
              {v.heading}
            </p>
          )}
          {v.text && (
            <p>
              {v.verse && (
                <sup className="font-sans text-[10px] font-semibold text-primary/70 mr-1.5 tabular-nums">{v.verse}</sup>
              )}
              {v.text}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
