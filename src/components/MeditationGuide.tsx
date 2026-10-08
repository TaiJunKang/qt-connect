interface MeditationGuideProps {
  commentary: string;
}

function QuestionCards({ lines }: { lines: string[] }) {
  return (
    <ol className="space-y-2">
      {lines.map((q, i) => (
        <li key={i} className="flex gap-2.5 rounded-[14px] bg-primary-soft px-3.5 py-3">
          <span className="text-[12px] font-extrabold text-primary tabular-nums mt-[3px]">Q{i + 1}</span>
          <span className="text-[14px] text-foreground/85 leading-[1.6]">{q}</span>
        </li>
      ))}
    </ol>
  );
}

const stripNumber = (l: string) => l.trim().replace(/^\d+[.)]\s*/, "");

// 묵상 길잡이: "오늘의 핵심 / 묵상 질문 / 🙏 …" 섹션. 질문은 Q 카드로 표시
export default function MeditationGuide({ commentary }: MeditationGuideProps) {
  return (
    <div className="space-y-3">
      {commentary.split(/\n\n+/).map((section, i) => {
        const trimmed = section.trim();
        if (!trimmed) return null;

        const headerMatch = trimmed.match(/^(오늘의 핵심|묵상 질문|🙏\s*.+)\n([\s\S]*)$/);
        if (headerMatch) {
          const header = headerMatch[1].replace(/^🙏\s*/, "");
          const body = headerMatch[2].trim();
          if (header === "묵상 질문") {
            return <QuestionCards key={i} lines={body.split("\n").filter((l) => l.trim()).map(stripNumber)} />;
          }
          return (
            <div key={i} className="rounded-[18px] bg-card border border-border px-4 py-3.5">
              <p className="text-[12px] font-bold text-primary mb-1">{header}</p>
              <p className="text-[14px] text-foreground/80 leading-[1.75] whitespace-pre-line">{body}</p>
            </div>
          );
        }

        const lines = trimmed.split("\n").filter((l) => l.trim());
        if (trimmed.includes("?") && lines.every((l) => l.trim().endsWith("?"))) {
          return <QuestionCards key={i} lines={lines.map(stripNumber)} />;
        }

        return (
          <p key={i} className="text-[14px] text-foreground/80 leading-[1.75] whitespace-pre-line px-1">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
