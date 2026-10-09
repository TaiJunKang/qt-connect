import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MyCommunity {
  id: string;
  name: string;
  role: string;
  is_current: boolean;
}

// '나' 탭 프로필 아래: 지금 보고 있는 공동체 표시, 여러 곳에 속해 있으면 전환
export default function CommunitySwitcher() {
  const [list, setList] = useState<MyCommunity[]>([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.rpc("get_my_communities").then(({ data }) => setList(data ?? []));
  }, []);

  const current = list.find((c) => c.is_current);
  if (!current) return null;
  const canSwitch = list.length > 1;

  const switchTo = async (id: string) => {
    if (id === current.id) { setOpen(false); return; }
    setSwitching(true);
    const { error } = await supabase.rpc("switch_community", { p_community: id });
    if (error) {
      setSwitching(false);
      toast({ title: error.message, variant: "destructive" });
      return;
    }
    // 나눔·랭킹·공지 등 모든 화면을 새 공동체 기준으로 다시 불러옴
    location.reload();
  };

  return (
    <div className="mt-1.5">
      <button
        onClick={() => canSwitch && setOpen((v) => !v)}
        disabled={!canSwitch}
        aria-expanded={canSwitch ? open : undefined}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary bg-primary-soft rounded-lg px-2 py-0.5 disabled:cursor-default"
      >
        {current.name}
        {current.role === "admin" && <span className="font-medium opacity-75">· 관리자</span>}
        {canSwitch && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <ul className="mt-2 rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {list.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => switchTo(c.id)}
                disabled={switching}
                className="w-full flex items-center gap-2 px-3.5 py-3 text-left text-[14px] hover:bg-secondary disabled:opacity-60"
              >
                <span className={`flex-1 ${c.is_current ? "font-bold" : "font-medium"}`}>{c.name}</span>
                {c.role === "admin" && <span className="text-[11px] text-muted-foreground">관리자</span>}
                {c.is_current && <Check className="w-4 h-4 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
