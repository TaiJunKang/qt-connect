import { useState } from "react";
import { Share, SquarePlus, MoreVertical, X, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { openInExternalBrowser, promptInstall, useInstallPlatform, type InstallPlatform } from "@/lib/install";

const DISMISS_KEY = "qt-install-dismissed";
const DISMISS_DAYS = 7;

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[12px] font-bold flex items-center justify-center flex-shrink-0 mt-px">{n}</span>
      <span className="text-[15px] leading-relaxed">{children}</span>
    </li>
  );
}

function Guide({ platform }: { platform: InstallPlatform }) {
  if (platform === "ios") {
    return (
      <ol className="space-y-3.5">
        <Step n={1}>
          화면 아래(아이패드는 위)의 <b>공유 버튼</b>
          <Share className="inline w-4 h-4 mx-1 -mt-1 text-[#007AFF]" />을 눌러요
        </Step>
        <Step n={2}>
          메뉴를 내려서 <b>홈 화면에 추가</b>
          <SquarePlus className="inline w-4 h-4 mx-1 -mt-1" />를 눌러요
        </Step>
        <Step n={3}>오른쪽 위 <b>추가</b>를 누르면 끝이에요</Step>
      </ol>
    );
  }
  if (platform === "inapp" && isIOS()) {
    return (
      <ol className="space-y-3.5">
        <Step n={1}>주소를 복사했어요. <b>사파리</b>를 열어 주소창에 붙여넣어 주세요</Step>
        <Step n={2}>사파리에서 <b>공유</b> <Share className="inline w-4 h-4 mx-1 -mt-1 text-[#007AFF]" /> → <b>홈 화면에 추가</b>를 눌러요</Step>
      </ol>
    );
  }
  return (
    <ol className="space-y-3.5">
      <Step n={1}>
        브라우저 오른쪽 위 <b>메뉴</b> <MoreVertical className="inline w-4 h-4 mx-0.5 -mt-1" />를 눌러요
      </Step>
      <Step n={2}><b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 눌러요</Step>
    </ol>
  );
}

// 배너와 '나' 탭 메뉴가 함께 쓰는 설치 흐름
export function useInstallFlow() {
  const platform = useInstallPlatform();
  const [guideOpen, setGuideOpen] = useState(false);
  const { toast } = useToast();

  const start = async () => {
    if (platform === "prompt") {
      const ok = await promptInstall();
      if (ok) toast({ title: "홈 화면에 추가했어요" });
      return;
    }
    if (platform === "kakao" || (platform === "inapp" && !isIOS())) {
      openInExternalBrowser();
      return;
    }
    if (platform === "inapp") openInExternalBrowser(); // 아이폰 기타 앱: 주소 복사
    setGuideOpen(true);
  };

  const dialog = (
    <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-[19px] font-extrabold">홈 화면에 추가하기</DialogTitle>
          <DialogDescription>앱처럼 아이콘을 눌러 바로 큐티를 시작할 수 있어요.</DialogDescription>
        </DialogHeader>
        <Guide platform={platform} />
        <img src="/icons/icon-180.png" alt="" className="w-14 h-14 rounded-2xl mx-auto mt-2 border border-border" />
      </DialogContent>
    </Dialog>
  );

  const label =
    platform === "kakao" || platform === "inapp" ? "브라우저로 열기" : platform === "prompt" ? "추가하기" : "방법 보기";

  return { platform, start, dialog, label };
}

// 홈 상단 배너: 아직 설치 안 했을 때만, 닫으면 7일 뒤 다시
export default function InstallPrompt() {
  const { platform, start, dialog, label } = useInstallFlow();
  const [hidden, setHidden] = useState(() => {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  });

  if (platform === "installed" || hidden) return dialog;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* 저장 불가 환경 */ }
    setHidden(true);
  };

  const inApp = platform === "kakao" || platform === "inapp";

  return (
    <>
      <section className="rounded-[20px] bg-card border border-border pl-3 pr-2 py-3 flex items-center gap-3">
        <img src="/icons/icon-180.png" alt="" className="w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold leading-snug">{inApp ? "브라우저에서 열면 홈 화면에 추가할 수 있어요" : "홈 화면에 추가하기"}</p>
          <p className="text-[12px] text-muted-foreground leading-snug">{inApp ? "카톡 안에서는 설치가 안 돼요" : "아이콘을 누르면 앱처럼 바로 열려요"}</p>
        </div>
        <button
          onClick={start}
          className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-[13px] font-bold flex items-center gap-1 flex-shrink-0 hover:bg-primary/90"
        >
          {inApp && <ExternalLink className="w-3.5 h-3.5" />}
          {label}
        </button>
        <button onClick={dismiss} aria-label="닫기" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </section>
      {dialog}
    </>
  );
}
