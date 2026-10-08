import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { initInstallCapture } from "./lib/install";

// 홈 화면 추가 이벤트는 화면이 그려지기 전에 올 수 있어 먼저 잡아둠
initInstallCapture();

// 새 버전이 배포되면 서비스워커가 바로 교체되고 페이지가 새로고침됨.
// 홈 화면에 설치한 앱은 백그라운드에 오래 머무르므로, 다시 화면에 올라올 때 업데이트를 확인 (sw.js 한 번 조회, DB 호출 없음).
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") registration.update().catch(() => {});
    });
  },
});

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace" }}>
          <h1 style={{ color: "red" }}>App Error</h1>
          <pre style={{ whiteSpace: "pre-wrap" }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#666" }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
