import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Calendar as CalendarIcon, List, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MyArchiveProps {
  userId: string;
  onClose: () => void;
}

interface ArchivedLog {
  id: string;
  date: string;        // MM-DD
  meditation: string | null;
  application: string | null;
  prayer: string | null;
  is_public: boolean;
  created_at: string;
  planTitle: string | null;
  planReference: string | null;
}

type ViewMode = "calendar" | "list";

export default function MyArchive({ userId, onClose }: MyArchiveProps) {
  const [logs, setLogs] = useState<ArchivedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedLog, setSelectedLog] = useState<ArchivedLog | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const { data: logData } = await supabase
        .from("qt_logs")
        .select("id, date, meditation, application, prayer, is_public, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!logData || logData.length === 0) {
        setLogs([]);
        setLoading(false);
        return;
      }

      // Fetch plans for the same dates (join by MM-DD)
      const dates = [...new Set(logData.map((l) => l.date))];
      const { data: planData } = await supabase
        .from("qt_plans")
        .select("date, title, reference")
        .in("date", dates);

      const planMap = new Map(planData?.map((p) => [p.date, p]) ?? []);

      setLogs(
        logData.map((l) => ({
          ...l,
          planTitle: planMap.get(l.date)?.title ?? null,
          planReference: planMap.get(l.date)?.reference ?? null,
        }))
      );
      setLoading(false);
    }
    fetchLogs();
  }, [userId]);

  // Calendar view helpers
  const logsByYearMonth = new Map<string, Map<string, ArchivedLog>>();
  logs.forEach((log) => {
    const ym = log.created_at.slice(0, 7); // YYYY-MM
    if (!logsByYearMonth.has(ym)) logsByYearMonth.set(ym, new Map());
    logsByYearMonth.get(ym)!.set(log.date, log);
  });

  const monthsWithLogs = [...logsByYearMonth.keys()].sort().reverse();

  return (
    <div className="fixed inset-0 z-50 bg-background md:left-60 overflow-y-auto">
      <div className="max-w-lg mx-auto md:max-w-2xl min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-accent transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <h2 className="text-[15px] font-bold text-foreground">내 QT 아카이브</h2>
              <p className="text-[11px] text-muted-foreground/60">{logs.length}개의 묵상 기록</p>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/60 border border-border/30">
              <button
                onClick={() => setViewMode("list")}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  viewMode === "list" ? "bg-card text-primary shadow-xs" : "text-muted-foreground/60"
                }`}
                title="리스트"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  viewMode === "calendar" ? "bg-card text-primary shadow-xs" : "text-muted-foreground/60"
                }`}
                title="캘린더"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-[13px] font-medium text-muted-foreground">아직 작성한 묵상이 없어요</p>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-2.5">
              {logs.map((log) => (
                <ArchiveListItem key={log.id} log={log} onClick={() => setSelectedLog(log)} />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {monthsWithLogs.map((ym) => (
                <CalendarMonth
                  key={ym}
                  ym={ym}
                  logMap={logsByYearMonth.get(ym)!}
                  onSelectLog={setSelectedLog}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

function ArchiveListItem({ log, onClick }: { log: ArchivedLog; onClick: () => void }) {
  const dateObj = new Date(log.created_at);
  const dateStr = dateObj.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  const preview = log.meditation || log.application || log.prayer || "(내용 없음)";

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl bg-card border border-border/40 shadow-xs px-4 py-3.5 hover:bg-accent/30 hover:border-primary/30 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] font-bold text-primary bg-primary/8 px-1.5 py-0.5 rounded">
            {log.date}
          </span>
          {log.planReference && (
            <span className="text-[10px] font-medium text-muted-foreground/60 truncate">
              {log.planReference}
            </span>
          )}
        </div>
        {log.is_public ? (
          <Globe className="w-3 h-3 text-emerald-500/60" />
        ) : (
          <Lock className="w-3 h-3 text-muted-foreground/40" />
        )}
      </div>
      {log.planTitle && (
        <p className="text-[12px] font-semibold text-foreground mb-0.5 truncate">{log.planTitle}</p>
      )}
      <p className="text-[11.5px] text-muted-foreground/70 leading-[1.6] line-clamp-2">{preview}</p>
      <p className="text-[10px] text-muted-foreground/40 mt-1.5">{dateStr}</p>
    </button>
  );
}

function CalendarMonth({ ym, logMap, onSelectLog }: {
  ym: string;
  logMap: Map<string, ArchivedLog>;
  onSelectLog: (log: ArchivedLog) => void;
}) {
  const [year, month] = ym.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthLabel = `${year}년 ${month}월`;
  const count = logMap.size;

  return (
    <div className="rounded-2xl bg-card border border-border/40 shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-foreground">{monthLabel}</h3>
        <span className="text-[11px] font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded-md">
          {count}일
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {["일","월","화","수","목","금","토"].map((d) => (
          <div key={d} className="text-[9px] text-muted-foreground/50 text-center font-medium">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const log = logMap.get(key);
          return (
            <button
              key={day}
              onClick={() => log && onSelectLog(log)}
              disabled={!log}
              className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium transition-all ${
                log
                  ? "bg-primary text-primary-foreground hover:scale-105 cursor-pointer"
                  : "bg-muted/40 text-muted-foreground/30 cursor-default"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LogDetailModal({ log, onClose }: { log: ArchivedLog; onClose: () => void }) {
  const dateStr = new Date(log.created_at).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-glow border border-border/50 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border/40 px-5 py-3.5 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-primary/60 tracking-[0.12em] uppercase">{dateStr}</p>
            {log.planTitle && (
              <h3 className="text-[14px] font-bold text-foreground truncate">{log.planTitle}</h3>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {log.planReference && (
            <span className="inline-block text-[10px] font-bold text-primary/70 tracking-[0.15em] uppercase bg-primary/8 px-2 py-1 rounded">
              {log.planReference}
            </span>
          )}

          {log.meditation && (
            <div>
              <p className="text-[10px] font-bold text-violet-600/70 tracking-[0.15em] uppercase mb-1.5">묵상</p>
              <p className="text-[13px] text-foreground/80 leading-[1.9] whitespace-pre-line">{log.meditation}</p>
            </div>
          )}
          {log.application && (
            <div>
              <p className="text-[10px] font-bold text-blue-600/70 tracking-[0.15em] uppercase mb-1.5">적용</p>
              <p className="text-[13px] text-foreground/80 leading-[1.9] whitespace-pre-line">{log.application}</p>
            </div>
          )}
          {log.prayer && (
            <div>
              <p className="text-[10px] font-bold text-amber-600/70 tracking-[0.15em] uppercase mb-1.5">기도</p>
              <p className="text-[13px] text-foreground/80 leading-[1.9] whitespace-pre-line">{log.prayer}</p>
            </div>
          )}

          <div className="pt-2 border-t border-border/30 flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
            {log.is_public ? <><Globe className="w-3 h-3" />공개됨</> : <><Lock className="w-3 h-3" />비공개</>}
          </div>
        </div>
      </div>
    </div>
  );
}
