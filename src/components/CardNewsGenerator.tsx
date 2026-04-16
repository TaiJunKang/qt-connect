import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Download, Palette, Type, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface CardNewsGeneratorProps {
  onClose: () => void;
  initialReference?: string;
  initialText?: string;
}

interface CardStyle {
  id: string;
  name: string;
  bg: string;
  bgGradient?: [string, string];
  textColor: string;
  accentColor: string;
  refColor: string;
}

const CARD_STYLES: CardStyle[] = [
  { id: "navy",    name: "딥 네이비",  bg: "#1a2742", bgGradient: ["#1a2742", "#0f1a30"], textColor: "#e8ecf2",  accentColor: "#c8a44e", refColor: "#7b8fb0" },
  { id: "cream",   name: "웜 크림",    bg: "#f5f0e8", bgGradient: ["#f8f4ed", "#ede6da"], textColor: "#2c2520",  accentColor: "#8b6b3d", refColor: "#9c8870" },
  { id: "forest",  name: "포레스트",    bg: "#1e3a2f", bgGradient: ["#1e3a2f", "#142820"], textColor: "#dce8e2",  accentColor: "#7dba95", refColor: "#7a9e8c" },
  { id: "sunset",  name: "선셋",       bg: "#3d2040", bgGradient: ["#3d2040", "#2a1530"], textColor: "#f0e4ec",  accentColor: "#d4a0c0", refColor: "#a88098" },
  { id: "slate",   name: "슬레이트",    bg: "#2d3748", bgGradient: ["#2d3748", "#1a202c"], textColor: "#e2e8f0",  accentColor: "#63b3ed", refColor: "#8da0b8" },
  { id: "white",   name: "클린 화이트", bg: "#ffffff", bgGradient: ["#ffffff", "#f7f8fa"], textColor: "#1a202c",  accentColor: "#2b6cb0", refColor: "#718096" },
];

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");
  for (const para of paragraphs) {
    if (para.trim() === "") { lines.push(""); continue; }
    let currentLine = "";
    for (const char of para) {
      const testLine = currentLine + char;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

export default function CardNewsGenerator({ onClose, initialReference, initialText }: CardNewsGeneratorProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [reference, setReference] = useState(initialReference ?? "");
  const [verseText, setVerseText] = useState(initialText ?? "");
  const [subtitle, setSubtitle] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>("navy");
  const [fontSize, setFontSize] = useState(26);
  const [fontsReady, setFontsReady] = useState(false);

  const style = CARD_STYLES.find((s) => s.id === selectedStyle) ?? CARD_STYLES[0];

  // Wait for fonts to load
  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  const renderCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = 1080;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pad = 90;

    // ── Background gradient ──
    if (style.bgGradient) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, style.bgGradient[0]);
      grad.addColorStop(1, style.bgGradient[1]);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = style.bg;
    }
    ctx.fillRect(0, 0, W, H);

    // ── Decorative accent line ──
    ctx.fillStyle = style.accentColor;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(pad, 85, 100, 4);
    ctx.globalAlpha = 1;

    // ── Church name ──
    ctx.font = `500 20px -apple-system, 'Segoe UI', sans-serif`;
    ctx.fillStyle = style.refColor;
    ctx.textBaseline = "top";
    ctx.fillText("홍제감리교회 청년부", pad, 110);

    // ── Reference ──
    let refY = 155;
    if (reference) {
      ctx.font = `bold 26px -apple-system, 'Segoe UI', sans-serif`;
      ctx.fillStyle = style.accentColor;
      ctx.fillText(reference, pad, refY);
      refY += 50;
    }

    // ── Thin separator ──
    ctx.fillStyle = style.accentColor;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(pad, refY, W - pad * 2, 1);
    ctx.globalAlpha = 1;

    // ── Main verse text ──
    if (verseText) {
      ctx.font = `${fontSize}px Georgia, 'Noto Serif KR', serif`;
      ctx.fillStyle = style.textColor;
      const lineHeight = fontSize * 2;
      const lines = wrapText(ctx, verseText, W - pad * 2);

      const textBlockHeight = lines.length * lineHeight;
      const availableSpace = H - refY - 60 - 120; // space between ref and footer
      const startY = Math.max(refY + 50, refY + 50 + (availableSpace - textBlockHeight) / 2);

      lines.forEach((line, i) => {
        if (line === "") return;
        ctx.fillText(line, pad, startY + i * lineHeight);
      });
    }

    // ── Subtitle ──
    if (subtitle) {
      ctx.font = `500 20px -apple-system, 'Segoe UI', sans-serif`;
      ctx.fillStyle = style.refColor;
      ctx.fillText(subtitle, pad, H - 130);
    }

    // ── Bottom accent line ──
    ctx.fillStyle = style.accentColor;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(pad, H - 90, W - pad * 2, 2);
    ctx.globalAlpha = 1;

    // ── Brand ──
    ctx.font = `bold 18px -apple-system, 'Segoe UI', sans-serif`;
    ctx.fillStyle = style.refColor;
    ctx.globalAlpha = 0.6;
    ctx.textAlign = "right";
    ctx.fillText("HTCT QT Connect", W - pad, H - 55);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }, [reference, verseText, subtitle, style, fontSize]);

  // Re-render whenever inputs or fonts change
  useEffect(() => {
    if (fontsReady) renderCard();
  }, [fontsReady, renderCard]);

  const handleDownload = () => {
    renderCard();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `qt-card-${reference || "card"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast({ title: "카드 이미지가 다운로드되었습니다" });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background md:left-60 overflow-y-auto">
      <div className="max-w-lg mx-auto md:max-w-3xl min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-accent transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <h2 className="text-[15px] font-bold text-foreground">카드뉴스 만들기</h2>
              <p className="text-[11px] text-muted-foreground/60">말씀을 예쁜 이미지로</p>
            </div>
            <Button onClick={handleDownload} className="h-9 px-4 gap-1.5 text-[12px] font-semibold rounded-xl">
              <Download className="w-3.5 h-3.5" />
              다운로드
            </Button>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 space-y-5 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
          {/* Input panel */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                성경 구절
              </Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="예: 롬 10:17"
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                말씀 내용
              </Label>
              <Textarea
                value={verseText}
                onChange={(e) => setVerseText(e.target.value)}
                placeholder="성경 본문이나 묵상 내용을 입력해주세요..."
                className="min-h-[120px] text-sm resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                부제목 <span className="text-muted-foreground/40 normal-case">(선택)</span>
              </Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="예: 2026년 4월 셋째 주"
                className="h-10 text-sm"
              />
            </div>

            {/* Font size */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1">
                <Type className="w-3 h-3" /> 글씨 크기: {fontSize}px
              </Label>
              <input
                type="range"
                min={18}
                max={36}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            {/* Style selector */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1">
                <Palette className="w-3 h-3" /> 스타일
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {CARD_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStyle(s.id)}
                    className={`rounded-lg p-2.5 border text-[11px] font-medium transition-all ${
                      selectedStyle === s.id
                        ? "ring-2 ring-primary border-primary/40"
                        : "border-border/40 hover:border-primary/30"
                    }`}
                  >
                    <div
                      className="w-full h-6 rounded-md mb-1.5"
                      style={{ backgroundColor: s.bg, border: s.bg === "#ffffff" ? "1px solid #e2e8f0" : "none" }}
                    />
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> 미리보기
            </p>
            <div className="rounded-xl border border-border/40 overflow-hidden shadow-card bg-muted/30 p-2">
              <canvas
                ref={canvasRef}
                className="w-full h-auto rounded-lg"
                style={{ aspectRatio: "1/1" }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center">1080 x 1080px PNG로 다운로드됩니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}
