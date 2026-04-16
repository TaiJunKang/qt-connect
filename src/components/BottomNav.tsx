import { tabs, type Tab } from "@/lib/navigation";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-2xl border-t border-border/40 shadow-[0_-2px_10px_-3px_hsl(24_18%_14%/0.08)] md:hidden">
      <div className="flex max-w-lg mx-auto pb-safe">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-200 relative"
            >
              <div className={`w-10 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isActive ? "bg-primary/10" : ""
              }`}>
                <Icon
                  className={`w-[20px] h-[20px] transition-all duration-200 ${
                    isActive ? "text-primary stroke-[2.2px]" : "text-muted-foreground/60 stroke-[1.5px]"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-medium tracking-wide transition-all duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground/60"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
