import { Suspense, type ReactNode } from "react";

import AdminPageTransitionIsland from "@/components/admin/admin-page-transition-island";
import AdminV2ReleaseAnnouncement from "@/components/admin/admin-v2-release-announcement";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="st3-admin">
      <Suspense fallback={null}>
        <AdminPageTransitionIsland />
      </Suspense>

      <AdminV2ReleaseAnnouncement />

      {children}
    </div>
  );
}
