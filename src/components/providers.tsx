"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

/** Rehydrates the compressed localStorage DB; seeds it on first load. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const userId = useStore((s) => s.userId);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      await useStore.persist.rehydrate();
      if (!useStore.getState().seededAt) useStore.getState().seed();
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!userId && path !== "/login") router.replace("/login");
  }, [ready, userId, path, router]);

  if (!ready || (!userId && path !== "/login")) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <div className="flex flex-col items-center gap-4 text-ink-3">
          <Image src="/brand/ogun-seal.png" alt="" width={56} height={56} className="animate-pulse" priority />
          <p className="text-sm">Preparing workspace…</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
