import { getAvatarColor } from "./community/avatar";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  xs: { box: "w-6 h-6", text: "text-[10px]" },
  sm: { box: "w-8 h-8", text: "text-[11px]" },
  md: { box: "w-10 h-10", text: "text-[14px]" },
  lg: { box: "w-16 h-16", text: "text-2xl" },
};

export default function UserAvatar({ name, avatarUrl, size = "sm", className = "" }: UserAvatarProps) {
  const s = SIZES[size];
  const initial = name?.charAt(0) || "?";
  const color = getAvatarColor(name || "");

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${s.box} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${s.box} rounded-full bg-gradient-to-br ${color} flex items-center justify-center ${s.text} font-bold text-white flex-shrink-0 ${className}`}>
      {initial}
    </div>
  );
}
