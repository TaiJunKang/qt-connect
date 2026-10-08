interface MeditationGuideProps {
  commentary: string;
}

// 묵상 길잡이: "오늘의 핵심 / 묵상 질문 / 🙏 …" 헤더 섹션과 질문 목록을 구분해 표시
export default function MeditationGuide({ commentary }: MeditationGuideProps) {
  return (
    <div className="space-y-4">
      {commentary.split(/\n\n+/).map((section, i) => {
        const trimmed = section.trim();
        if (!trimmed) return null;

        const headerMatch = trimmed.match(/^(오늘의 핵심|묵상 질문|🙏\s*.+)\n([\s\S]*)$/);
        if (headerMatch) {
          return (
            <div key={i}>
              <p className="text-[12px] font-semibold text-primary mb-1.5">
                {headerMatch[1].replace(/^🙏\s*/, "")}
              </p>
              <p className="text-[14px] text-foreground/70 leading-[1.85] whitespace-pre-line">
                {headerMatch[2].trim()}
              </p>
            </div>
          );
        }

        const lines = trimmed.split("\n").filter((l) => l.trim());
        if (trimmed.includes("?") && lines.every((l) => l.trim().endsWith("?"))) {
          return (
            <ol key={i} className="space-y-2">
              {lines.map((q, qi) => (
                <li key={qi} className="flex gap-2.5 rounded-xl bg-secondary/60 px-4 py-3">
                  <span className="text-[12px] font-bold text-primary tabular-nums mt-px">Q{qi + 1}</span>
                  <span className="text-[13.5px] text-foreground/80 leading-relaxed">{q.trim().replace(/^\d+[.)]\s*/, "")}</span>
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={i} className="text-[14px] text-foreground/70 leading-[1.85] whitespace-pre-line">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
