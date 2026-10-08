// 사진이 없을 때의 기본 프로필: 앱 톤의 연한 바탕 + 같은 계열의 진한 글자
export const AVATAR_COLORS = [
  "bg-[#F4E3D8] text-[#8F3F22] dark:bg-[#3A2A22] dark:text-[#F0C3AC]", // 테라코타
  "bg-[#E3EBE4] text-[#33503F] dark:bg-[#24302A] dark:text-[#B9D2C1]", // 세이지
  "bg-[#ECE3D6] text-[#5C4634] dark:bg-[#33291F] dark:text-[#E2CDB3]", // 모래
  "bg-[#E2E7EE] text-[#36495F] dark:bg-[#232A33] dark:text-[#BCCBDD]", // 슬레이트
  "bg-[#EEE3EA] text-[#634357] dark:bg-[#30242C] dark:text-[#E0C3D5]", // 모브
  "bg-[#E9E8D8] text-[#4D532C] dark:bg-[#2B2C20] dark:text-[#D3D6AE]", // 올리브
];

export function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
