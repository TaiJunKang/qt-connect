import { Home, PenLine, Users, Trophy, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Tab = "home" | "write" | "community" | "ranking" | "settings";

export interface TabItem {
  id: Tab;
  label: string;
  icon: LucideIcon;
}

export const tabs: TabItem[] = [
  { id: "home", label: "홈", icon: Home },
  { id: "write", label: "작성", icon: PenLine },
  { id: "community", label: "공동체", icon: Users },
  { id: "ranking", label: "랭킹", icon: Trophy },
  { id: "settings", label: "설정", icon: Settings },
];
