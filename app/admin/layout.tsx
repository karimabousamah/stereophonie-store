import { Suspense, type ReactNode } from "react";

import AdminPageTransitionIsland from "@/components/admin/admin-page-transition-island";

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

      {children}
    </div>
  );
}
