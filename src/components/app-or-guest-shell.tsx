import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { AppSidebar } from "@/components/app-sidebar";
import { authOptions } from "@/lib/auth-config";
import { brandCta } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Sidebar for signed-in users; compact header for guests. */
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
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
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
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/help"
              className="px-3 py-2 text-sm text-white/50 transition-colors hover:text-white"
            >
              راهنما
            </Link>
            <Link
              href="/rules"
              className="hidden px-3 py-2 text-sm text-white/50 transition-colors hover:text-white sm:inline"
            >
              قوانین
            </Link>
            <a href="/#login" className={cn(brandCta, "px-4 py-2 text-sm")}>
              ورود
            </a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
