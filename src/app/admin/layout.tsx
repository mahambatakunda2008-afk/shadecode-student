import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminBottomNav } from "@/components/layout/AdminBottomNav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: isAdmin, error } = await supabase.rpc("has_role", {
    user_id: user.id,
    role_name: "admin",
  });

  if (error || !isAdmin) redirect("/");

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <aside className="hidden h-screen w-[240px] flex-shrink-0 md:flex"><AdminSidebar /></aside>
      <main className="min-w-0 flex-1 overflow-y-auto pb-[80px] md:pb-0">{children}</main>
      <div className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden"><AdminBottomNav /></div>
    </div>
  );
}
