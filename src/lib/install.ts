import { useEffect, useState } from "react";

// 홈 화면에 추가(설치) 지원. 환경마다 방법이 다름:
// - 안드로이드 크롬/삼성 인터넷: beforeinstallprompt로 버튼 한 번에 설치
// - 아이폰/아이패드: 자동 설치 불가 → 공유 > 홈 화면에 추가 안내
// - 카카오톡 등 앱 안 브라우저: 설치 불가 → 외부 브라우저로 열기

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallPlatform =
  | "installed" // 이미 홈 화면 앱으로 실행 중
  | "prompt" // 버튼으로 바로 설치 가능
  | "ios" // 사파리 공유 메뉴 안내
  | "kakao" // 카카오톡 인앱 → 외부 브라우저로
  | "inapp" // 기타 인앱 브라우저 → 외부 브라우저로
  | "manual"; // 그 외: 브라우저 메뉴에서 직접

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// 앱 시작 시 한 번 호출 (이벤트가 화면보다 먼저 올 수 있음)
export function initInstallCapture() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
}

const ua = () => navigator.userAgent;
const isIOS = () => /iPhone|iPad|iPod/i.test(ua()) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function detectPlatform(): InstallPlatform {
  if (installed || isStandalone()) return "installed";
  if (/KAKAOTALK/i.test(ua())) return "kakao";
  if (/Instagram|FBAN|FBAV|Line\/|NAVER|DaumApps|everytimeApp|BAND\//i.test(ua())) return "inapp";
  if (deferred) return "prompt";
  if (isIOS()) return "ios";
  return "manual";
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  notify();
  return outcome === "accepted";
}

// 앱 안 브라우저에서 기본 브라우저(크롬/사파리)로 현재 주소 열기
export function openInExternalBrowser() {
  const url = location.href;
  if (/KAKAOTALK/i.test(ua())) {
    location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    return;
  }
  if (/Android/i.test(ua())) {
    const { host, pathname, search, hash } = location;
    location.href = `intent://${host}${pathname}${search}${hash}#Intent;scheme=https;package=com.android.chrome;end`;
    return;
  }
  // 아이폰의 다른 앱: 자동 전환 방법이 없어 주소 복사로 대신
  navigator.clipboard?.writeText(url).catch(() => {});
}

export function useInstallPlatform() {
  const [platform, setPlatform] = useState<InstallPlatform>(() => detectPlatform());
  useEffect(() => {
    const update = () => setPlatform(detectPlatform());
    listeners.add(update);
    update();
    return () => { listeners.delete(update); };
  }, []);
  return platform;
}
