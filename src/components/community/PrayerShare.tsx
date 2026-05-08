import { useEffect, useState, useCallback } from "react";
import { Plus, HandHeart, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PrayerCard, { type PrayerItem } from "./PrayerCard";
import PrayerComposer from "./PrayerComposer";

interface PrayerShareProps {
  userId: string;
  userDisplayName: string;
}

export default function PrayerShare({ userId, userDisplayName }: PrayerShareProps) {
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

  const fetchPrayers = useCallback(async () => {
    setLoading(true);

    // 1. Fetch all prayer requests
    const { data: requests, error: reqErr } = await supabase
      .from("prayer_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (reqErr || !requests) {
      setLoading(false);
      return;
    }

    // 2. Fetch responses, comments, and avatar URLs in parallel
    const prayerIds = requests.map((r) => r.id);
    const userIds = [...new Set(requests.map((r) => r.user_id))];
    let responses: { prayer_id: string; user_id: string }[] = [];
    let comments: { content_id: string }[] = [];
    const avatarMap = new Map<string, string | null>();
    if (prayerIds.length > 0) {
      const [respRes, commRes, profilesRes] = await Promise.all([
        supabase.from("prayer_responses").select("prayer_id, user_id").in("prayer_id", prayerIds),
        supabase.from("comments").select("content_id").eq("content_type", "prayer_request").in("content_id", prayerIds),
        supabase.from("profiles").select("user_id, avatar_url").in("user_id", userIds),
      ]);
      responses = respRes.data ?? [];
      comments = commRes.data ?? [];
      for (const p of profilesRes.data ?? []) {
        avatarMap.set(p.user_id, p.avatar_url);
      }
    }

    // 3. Aggregate
    const countByPrayer = new Map<string, number>();
    const myResponseSet = new Set<string>();
    const commentCount = new Map<string, number>();
    for (const r of responses) {
      countByPrayer.set(r.prayer_id, (countByPrayer.get(r.prayer_id) ?? 0) + 1);
      if (r.user_id === userId) myResponseSet.add(r.prayer_id);
    }
    for (const c of comments) {
      commentCount.set(c.content_id, (commentCount.get(c.content_id) ?? 0) + 1);
    }

    const items: PrayerItem[] = requests.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_name: r.user_name,
      avatar_url: avatarMap.get(r.user_id) ?? null,
      title: r.title,
      content: r.content,
      category: r.category,
      is_anonymous: r.is_anonymous,
      is_answered: r.is_answered,
      answered_at: r.answered_at,
      created_at: r.created_at,
      response_count: countByPrayer.get(r.id) ?? 0,
      has_prayed: myResponseSet.has(r.id),
      comment_count: commentCount.get(r.id) ?? 0,
    }));

    setPrayers(items);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchPrayers(); }, [fetchPrayers]);

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setComposerOpen(true)}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 text-[13px] font-semibold shadow-soft gap-2"
        >
          <Plus className="w-4 h-4" />
          기도 제목 올리기
        </Button>
        <button
          onClick={fetchPrayers}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent border border-border/40 transition-all shadow-xs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : prayers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
            <HandHeart className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">아직 기도 제목이 없어요</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">첫 번째 기도 제목을 나눠보세요 🙏</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {prayers.map((p) => (
            <PrayerCard
              key={p.id}
              prayer={p}
              currentUserId={userId}
              currentUserName={userDisplayName}
              onChange={fetchPrayers}
            />
          ))}
        </div>
      )}

      {/* Composer */}
      <PrayerComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        userId={userId}
        userDisplayName={userDisplayName}
        onSubmitted={fetchPrayers}
      />
    </div>
  );
}
