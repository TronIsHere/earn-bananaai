import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { AppSidebar } from "@/components/app-sidebar";
import { authOptions } from "@/lib/auth-config";
import { brandCtaGhost } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Sidebar for signed-in users; compact header for guests. Used by /rules and /help. */
export async function AppOrGuestShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    return (
      <div className="min-h-screen">
        <AppSidebar />
        <main className="min-h-screen lg:pr-72">
          <div className="mx-auto max-w-6xl px-4 py-6 pt-16 sm:px-6 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/login" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/logo.jpeg"
            alt="بنانا"
            width={40}
            height={40}
            className="size-10 rounded-md"
          />
          <div>
            <div className="text-sm font-bold text-white">کمپین بنانا</div>
            <p className="text-[11px] text-white/45">برنامه رسمی کسب درآمد</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/help"
            className="px-3 py-2 text-sm text-white/50 transition-colors hover:text-white"
          >
            راهنما
          </Link>
          <Link href="/login" className={cn(brandCtaGhost, "px-4 py-2 text-sm")}>
            ورود
          </Link>
        </div>
      </header>
      <main className="px-4 pb-12 sm:px-6">{children}</main>
    </div>
  );
}
