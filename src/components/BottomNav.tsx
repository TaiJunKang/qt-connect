import { tabs, type Tab } from "@/lib/navigation";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border/60 md:hidden">
      <div className="flex max-w-lg mx-auto pb-safe">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors duration-150 relative"
            >
              <Icon
                className={`w-[22px] h-[22px] transition-colors duration-150 ${
                  isActive ? "text-foreground" : "text-muted-foreground/50"
                }`}
                strokeWidth={isActive ? 2.2 : 1.6}
              />
              <span
                className={`text-[10px] transition-colors duration-150 ${
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground/50 font-medium"
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
