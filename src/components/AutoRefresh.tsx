"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 30_000;

// Re-fetches the server-rendered page (served from the ISR cache) while the tab is visible.
// On failure Next keeps the current UI, so the last valid results stay on screen.
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return null;
}
