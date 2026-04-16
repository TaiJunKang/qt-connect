import { useState } from "react";
import { signIn, signUp } from "@/lib/supabase-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BookOpen } from "lucide-react";

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onAuthSuccess();
      } else {
        if (!displayName.trim()) {
          toast({ title: "이름을 입력해주세요.", variant: "destructive" });
          return;
        }
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
        toast({
          title: "회원가입 완료!",
          description: "이메일 확인 후 로그인해 주세요.",
        });
        setMode("login");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "오류가 발생했습니다.";
      toast({ title: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top decorative area */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl" />

        <div className="relative flex flex-col items-center pt-16 pb-8 md:pt-20 md:pb-10">
          {/* Logo */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-3xl bg-primary/8 blur-2xl scale-[2]" />
            <div className="relative w-20 h-20 rounded-2xl shadow-soft overflow-hidden">
              <img
                src="/logo.svg"
                alt="QT Connect 로고"
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Brand text */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            QT Connect
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1.5 tracking-wide">
            홍제감리교회 청년부
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mt-6 w-48">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border" />
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground/30" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border" />
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center px-6 pb-12">
        <div className="w-full max-w-sm bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden">

          {/* Tab switcher */}
          <div className="flex bg-muted/30">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-3.5 text-[13px] font-semibold transition-all relative ${
                  mode === m
                    ? "text-primary"
                    : "text-muted-foreground/60 hover:text-foreground"
                }`}
              >
                {m === "login" ? "로그인" : "회원가입"}
                {mode === m && (
                  <span className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                  이름
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="공동체에서 사용할 이름"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-11 bg-background/50 border-border/50 rounded-xl text-sm focus-visible:ring-primary/30"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-background/50 border-border/50 rounded-xl text-sm focus-visible:ring-primary/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-background/50 border-border/50 rounded-xl text-sm focus-visible:ring-primary/30"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 font-semibold tracking-wide mt-2 rounded-xl text-[14px] shadow-soft hover:shadow-glow transition-all"
            >
              {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[11px] text-muted-foreground/40 leading-relaxed font-scripture italic">
          "말씀이 네 안에 풍성히 거하게 하라"
          <br />
          <span className="not-italic">— 골로새서 3:16</span>
        </p>
      </div>
    </div>
  );
}
