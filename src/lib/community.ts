import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Community {
  id: string;
  name: string;
}

// 가입 화면용 전체 공동체 목록
export function useCommunities() {
  const [list, setList] = useState<Community[]>([]);
  useEffect(() => {
    supabase
      .from("communities")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => setList(data ?? []));
  }, []);
  return list;
}

// 로그인한 사용자의 소속 공동체 이름 (한 번만 조회해서 공유)
let cache: Promise<string | null> | null = null;
let cachedUser: string | null = null;

export function useMyCommunityName(userId: string | null | undefined) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    if (!cache || cachedUser !== userId) {
      cachedUser = userId;
      cache = (async () => {
        const { data: profile } = await supabase.from("profiles").select("community_id").eq("user_id", userId).maybeSingle();
        if (!profile?.community_id) return null;
        const { data } = await supabase.from("communities").select("name").eq("id", profile.community_id).maybeSingle();
        return data?.name ?? null;
      })();
    }
    let cancelled = false;
    cache.then((n) => { if (!cancelled) setName(n); });
    return () => { cancelled = true; };
  }, [userId]);
  return name;
}
