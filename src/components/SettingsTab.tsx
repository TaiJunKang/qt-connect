import { useState } from "react";
import { LogOut, User, ShieldCheck, ChevronRight, Bell, BellOff, Settings, BookMarked, BookOpenCheck, Moon, Sun, ImageIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { signOut } from "@/lib/supabase-auth";
import { useToast } from "@/hooks/use-toast";
import MyArchive from "./MyArchive";
import BibleReadingPlan from "./BibleReadingPlan";
import CardNewsGenerator from "./CardNewsGenerator";
import {
  isNotificationSupported,
  getNotificationEnabled,
  setNotificationEnabled,
  requestPermission,
  getPermissionStatus,
} from "@/lib/notifications";

interface SettingsTabProps {
  email: string;
  displayName: string;
  userId: string;
  isAdmin: boolean;
  onSignOut: () => void;
}

export default function SettingsTab({ email, displayName, userId, isAdmin, onSignOut }: SettingsTabProps) {
  const [showArchive, setShowArchive] = useState(false);
  const [showReadingPlan, setShowReadingPlan] = useState(false);
  const [showCardNews, setShowCardNews] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();
  const navigate = useNavigate();

  const supported = isNotificationSupported();
  const [notifEnabled, setNotifEnabled] = useState(getNotificationEnabled());

  const handleNotifToggle = async (checked: boolean) => {
    if (checked) {
      const granted = await requestPermission();
      if (!granted) {
        toast({
          title: "알림 권한이 필요합니다",
          description: "브라우저 설정에서 알림을 허용해 주세요.",
          variant: "destructive",
        });
        return;
      }
    }
    setNotificationEnabled(checked);
    setNotifEnabled(checked);
    toast({ title: checked ? "알림이 활성화되었습니다" : "알림이 비활성화되었습니다" });
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: "로그아웃 중 오류가 발생했습니다.", variant: "destructive" });
    } else {
      onSignOut();
    }
  };

  const initial = displayName?.charAt(0) || email?.charAt(0) || "?";

  if (showArchive) {
    return <MyArchive userId={userId} onClose={() => setShowArchive(false)} />;
  }

  if (showReadingPlan) {
    return <BibleReadingPlan userId={userId} onClose={() => setShowReadingPlan(false)} />;
  }

  if (showCardNews) {
    return <CardNewsGenerator onClose={() => setShowCardNews(false)} />;
  }

  return (
    <div className="px-4 pt-7 pb-6 space-y-5 max-w-lg mx-auto md:max-w-2xl md:px-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
          <Settings className="w-4.5 h-4.5 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">설정</h1>
      </div>

      {/* ── Profile card ── */}
      <div className="rounded-2xl bg-card border border-border/40 shadow-card overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
        <div className="px-5 pb-5 -mt-8">
          <div className="flex items-end gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-soft border-4 border-card">
              <span className="text-2xl font-bold text-primary-foreground">{initial}</span>
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <p className="text-[16px] font-bold text-foreground truncate">{displayName || "사용자"}</p>
              <p className="text-[12px] text-muted-foreground/60 truncate">{email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Menu items ── */}
      <div className="rounded-2xl bg-card border border-border/40 shadow-card divide-y divide-border/30 overflow-hidden">
        {/* My Archive */}
        <button
          onClick={() => setShowArchive(true)}
          className="w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-accent/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 flex items-center justify-center flex-shrink-0 border border-emerald-200/40">
            <BookMarked className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-foreground">내 QT 아카이브</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">지금까지 작성한 묵상 모아보기</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
        </button>

        {/* Bible Reading Plan */}
        <button
          onClick={() => setShowReadingPlan(true)}
          className="w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-accent/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 flex items-center justify-center flex-shrink-0 border border-blue-200/40">
            <BookOpenCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-foreground">성경 통독표</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">66권 체크하며 통독 계획 관리</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
        </button>

        {/* Card News */}
        <button
          onClick={() => setShowCardNews(true)}
          className="w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-accent/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 flex items-center justify-center flex-shrink-0 border border-violet-200/40">
            <ImageIcon className="w-4 h-4 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-foreground">카드뉴스 만들기</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">말씀을 예쁜 이미지 카드로 변환</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
        </button>

        {/* Dark mode toggle */}
        <div className="flex items-center gap-3.5 px-5 py-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
            isDark
              ? "bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border-indigo-400/40"
              : "bg-gradient-to-br from-yellow-400/15 to-orange-400/5 border-yellow-300/40"
          }`}>
            {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-yellow-600" />}
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-foreground">다크 모드</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              {isDark ? "어두운 테마 사용 중" : "밝은 테마 사용 중"}
            </p>
          </div>
          <Switch
            checked={isDark}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-accent/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground">관리자 대시보드</p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">큐티 말씀 일정 관리</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
          </button>
        )}

        {/* Notification toggle */}
        {supported && (
          <div className="flex items-center gap-3.5 px-5 py-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
              notifEnabled
                ? "bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-amber-200/40"
                : "bg-muted/40 border-border/30"
            }`}>
              {notifEnabled ? (
                <Bell className="w-4 h-4 text-amber-600" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground">큐티 알림</p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                {getPermissionStatus() === "denied"
                  ? "브라우저에서 알림이 차단되어 있습니다"
                  : "미작성 시 앱 열면 알림"}
              </p>
            </div>
            <Switch
              checked={notifEnabled}
              onCheckedChange={handleNotifToggle}
              disabled={getPermissionStatus() === "denied"}
            />
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-destructive/5 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-destructive/8 flex items-center justify-center flex-shrink-0 border border-destructive/10">
            <LogOut className="w-4 h-4 text-destructive/60" />
          </div>
          <span className="text-[13px] font-semibold text-destructive/70 group-hover:text-destructive flex-1">
            로그아웃
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground/20" />
        </button>
      </div>

      {/* ── Footer quote ── */}
      <div className="pt-4 text-center">
        <p className="text-[11px] text-muted-foreground/40 leading-relaxed font-scripture italic">
          "말씀이 네 안에 풍성히 거하게 하라"
          <br />
          <span className="text-muted-foreground/25 not-italic">골로새서 3:16</span>
        </p>
      </div>
    </div>
  );
}
