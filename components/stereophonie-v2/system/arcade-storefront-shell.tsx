"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import ArcadeMotionController from "@/components/stereophonie-v2/system/arcade-motion-controller";

type ArcadeStorefrontShellProps = {
  children: ReactNode;
};

export default function ArcadeStorefrontShell({
  children,
}: ArcadeStorefrontShellProps) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <div className="st-arcade-os">
      <ArcadeMotionController />
      {children}
    </div>
  );
}
