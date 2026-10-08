// 묵상 노트 톤의 차분한 단색 (흰 글자 대비 4.5:1 이상)
export const AVATAR_COLORS = [
  "bg-[#4D6A58]",
  "bg-[#B4532F]",
  "bg-[#6F5A48]",
  "bg-[#4F6378]",
  "bg-[#7A5C6E]",
  "bg-[#5E6B3A]",
];

export function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
