import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/lib/supabase-auth";
import { showQtReminder } from "@/lib/notifications";
import AuthPage from "@/components/AuthPage";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import HomeTab from "@/components/HomeTab";
import WriteTab from "@/components/WriteTab";
import CommunityTab from "@/components/CommunityTab";
import RankingTab from "@/components/RankingTab";
import SettingsTab from "@/components/SettingsTab";
import InstallPrompt from "@/components/InstallPrompt";
import type { User } from "@supabase/supabase-js";
import type { Tab } from "@/lib/navigation";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setDisplayName("");
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch display name + role when user logs in
  useEffect(() => {
    if (user) {
      getProfile(user.id).then(({ data }) => {
        setDisplayName(data?.display_name || user.email?.split("@")[0] || "사용자");
        setIsAdmin(data?.role === "admin");
      });
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Check if user needs a QT reminder notification
  useEffect(() => {
    if (!user) return;

    const checkAndNotify = async () => {
      const now = new Date();
      const todayKey = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const { data } = await supabase
        .from("qt_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", todayKey)
        .maybeSingle();

      // Only show reminder if user hasn't written today's QT
      if (!data) {
        showQtReminder();
      }
    };

    // Small delay to avoid blocking initial render
    const timer = setTimeout(checkAndNotify, 2000);
    return () => clearTimeout(timer);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab onWriteClick={() => setActiveTab("write")} userId={user.id} />;
      case "write":
        return <WriteTab userId={user.id} userDisplayName={displayName} />;
      case "community":
        return <CommunityTab userId={user.id} userDisplayName={displayName} />;
      case "ranking":
        return <RankingTab userId={user.id} />;
      case "settings":
        return (
          <SettingsTab
            email={user.email || ""}
            displayName={displayName}
            userId={user.id}
            isAdmin={isAdmin}
            onSignOut={() => {
              setUser(null);
              setActiveTab("home");
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Desktop sidebar — hidden on mobile */}
      <DesktopSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main content area */}
      <div className="flex-1 md:ml-60">
        <div className="max-w-lg mx-auto md:max-w-2xl min-h-screen flex flex-col">
          <main className="flex-1 overflow-y-auto pb-20 md:pb-6 md:pt-2">
            {renderTab()}
          </main>
        </div>
      </div>

      {/* Bottom navigation — hidden on desktop */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* PWA install prompt */}
      <InstallPrompt />
    </div>
  );
};

export default Index;
