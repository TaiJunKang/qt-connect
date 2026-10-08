import { Home, PenLine, MessageCircle, Users, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Tab = "home" | "write" | "community" | "ranking" | "settings";

export interface TabItem {
  id: Tab;
  label: string;
  icon: LucideIcon;
}

export const tabs: TabItem[] = [
  { id: "home", label: "홈", icon: Home },
  { id: "write", label: "쓰기", icon: PenLine },
  { id: "community", label: "나눔", icon: MessageCircle },
  { id: "ranking", label: "함께", icon: Users },
  { id: "settings", label: "나", icon: UserRound },
];
