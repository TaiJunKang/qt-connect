import { tabs, type Tab } from "@/lib/navigation";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex max-w-lg mx-auto pb-safe">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 min-h-[56px] transition-colors duration-150"
            >
              <Icon
                className={`w-[22px] h-[22px] transition-colors duration-150 ${
                  isActive ? "text-primary" : "text-muted-foreground/80"
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={`text-[11px] transition-colors duration-150 ${
                  isActive ? "text-primary font-bold" : "text-muted-foreground/80 font-medium"
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
