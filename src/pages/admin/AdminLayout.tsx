import * as React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase/client";
import { getUserAccessInfo, type UserAccessInfo } from "@/lib/supabase/admin";
import { CompanyProvider } from "@/lib/company-context";
import AdminTopBar from "@/components/admin/AdminTopBar";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [accessInfo, setAccessInfo] = React.useState<UserAccessInfo | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const info = await getUserAccessInfo();
      if (!info) {
        navigate("/", { replace: true });
        return;
      }
      setAccessInfo(info);
      setReady(true);
    })();
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  if (!ready || !accessInfo) {
    return (
      <main className="min-h-screen bg-[#fbfbf9] text-black grid place-items-center px-6">
        <p className="text-sm text-black/50">Carregando…</p>
      </main>
    );
  }

  const isCaseFullscreenRoute = /^\/admin\/cases\/[^/]+\/(builder|editar|preview)\/?$/.test(
    location.pathname,
  );

  return (
    <CompanyProvider companies={accessInfo.companies}>
      <div className="min-h-screen bg-[#fbfbf9] text-black">
        {!isCaseFullscreenRoute && (
          <AdminTopBar
            onSignOut={signOut}
            userEmail={accessInfo.email}
            userName={accessInfo.userName}
            userAvatarUrl={accessInfo.userAvatarUrl}
          />
        )}

        {isCaseFullscreenRoute ? (
          <Outlet />
        ) : (
          <div className="w-full px-2">
            <div className="flex gap-2">
              <AdminSidebar isSuperAdmin={accessInfo.isSuperAdmin} />

              <div className="min-w-0 flex-1 pt-2">
                <main className="px-6 md:px-10 lg:px-12 py-10">
                  <div className="mx-auto w-full max-w-6xl">
                    <Outlet />
                  </div>
                </main>
              </div>
            </div>
          </div>
        )}
      </div>
    </CompanyProvider>
  );
}
