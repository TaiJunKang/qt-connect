import { tabs, type Tab } from "@/lib/navigation";

interface DesktopSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function DesktopSidebar({ activeTab, onTabChange }: DesktopSidebarProps) {
  return (
    <aside className="hidden md:flex md:flex-col md:w-60 md:fixed md:inset-y-0 md:left-0 md:z-40 md:border-r md:border-sidebar-border md:bg-sidebar">
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
            <img src="/logo.svg" alt="QT Connect" className="w-full h-full" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-sidebar-foreground tracking-tight">QT Connect</h2>
            <p className="text-[10px] text-sidebar-foreground/40 tracking-wide">홍제감리교회 청년부</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        <p className="text-[10px] font-semibold text-sidebar-foreground/30 tracking-[0.15em] uppercase px-3 mb-2">
          Menu
        </p>
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary shadow-xs"
                  : "text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/80"
              }`}
            >
              <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? "text-sidebar-primary" : ""}`} />
              <span>{label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-5 border-t border-sidebar-border">
        <p className="text-[10px] text-sidebar-foreground/25 leading-relaxed font-scripture italic">
          "말씀이 네 안에 풍성히 거하게 하라"
          <br />
          <span className="text-sidebar-foreground/15 not-italic">골로새서 3:16</span>
        </p>
      </div>
    </aside>
  );
}
