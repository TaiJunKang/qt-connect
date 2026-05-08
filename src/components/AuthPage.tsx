import { useState } from "react";
import { signIn, signUp, resetPassword } from "@/lib/supabase-auth";
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
  const [resetMode, setResetMode] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (resetMode) {
        if (!email.trim()) {
          toast({ title: "이메일을 입력해주세요.", variant: "destructive" });
          return;
        }
        const { error } = await resetPassword(email);
        if (error) throw error;
        toast({
          title: "비밀번호 재설정 메일을 보냈습니다",
          description: "이메일을 확인해주세요.",
        });
        setResetMode(false);
      } else if (mode === "login") {
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
      {/* Top area */}
      <div className="flex flex-col items-center pt-20 pb-10 md:pt-24 md:pb-12 px-6">
        {/* Logo */}
        <div className="mb-4">
          <img
            src="/logo.svg"
            alt="HTCT"
            className="h-12 dark:invert"
          />
        </div>

        {/* Brand text */}
        <h1 className="text-[15px] font-medium tracking-wide text-muted-foreground">
          QT Connect
        </h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          홍제감리교회 청년부
        </p>
      </div>

      {/* Form area */}
      <div className="flex-1 flex flex-col items-center px-6 pb-12">
        <div className="w-full max-w-sm">

          {/* Tab switcher */}
          {!resetMode && (
            <div className="flex bg-secondary rounded-xl p-1 mb-6">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg transition-all ${
                    mode === m
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "login" ? "로그인" : "회원가입"}
                </button>
              ))}
            </div>
          )}

          {resetMode && (
            <div className="mb-6">
              <h2 className="text-[17px] font-bold text-foreground tracking-tight">비밀번호 재설정</h2>
              <p className="text-[13px] text-muted-foreground mt-1">가입한 이메일을 입력하시면 재설정 링크를 보내드립니다.</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!resetMode && mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-[13px] font-medium text-foreground">
                  이름
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="공동체에서 사용할 이름"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-12 bg-card border-0 rounded-xl text-[14px] focus-visible:ring-1 focus-visible:ring-primary/30 px-4"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-medium text-foreground">
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-card border-0 rounded-xl text-[14px] focus-visible:ring-1 focus-visible:ring-primary/30 px-4"
              />
            </div>

            {!resetMode && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
                  비밀번호
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="6자 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-card border-0 rounded-xl text-[14px] focus-visible:ring-1 focus-visible:ring-primary/30 px-4"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold tracking-tight rounded-xl text-[15px] transition-colors active:scale-[0.98] mt-2"
            >
              {loading ? "처리 중..." : resetMode ? "재설정 메일 보내기" : mode === "login" ? "로그인" : "회원가입"}
            </button>

            {!resetMode && mode === "login" && (
              <button
                type="button"
                onClick={() => setResetMode(true)}
                className="w-full text-[13px] text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                비밀번호를 잊으셨나요?
              </button>
            )}

            {resetMode && (
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="w-full text-[13px] text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                로그인으로 돌아가기
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="mt-12 text-center text-[12px] text-muted-foreground/50 leading-relaxed font-scripture italic">
          "말씀이 네 안에 풍성히 거하게 하라"
          <br />
          <span className="not-italic">-- 골로새서 3:16</span>
        </p>
      </div>
    </div>
  );
}
