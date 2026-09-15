import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { AppSidebar } from "@/components/app-sidebar";
import { BrandMark } from "@/components/brand-mark";
import { authOptions } from "@/lib/auth-config";
import { brandCta } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Sidebar for signed-in users; marketing header + footer for guests. */
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
          <div className="mx-auto max-w-6xl px-4 pb-10 pt-20 sm:px-6 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-white/6 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <BrandMark />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/help"
              className="rounded-xl px-3 py-2 text-sm text-white/55 transition-colors hover:bg-white/5 hover:text-white"
            >
              راهنما
            </Link>
            <Link
              href="/rules"
              className="hidden rounded-xl px-3 py-2 text-sm text-white/55 transition-colors hover:bg-white/5 hover:text-white sm:inline"
            >
              قوانین
            </Link>
            <Link
              href="/#login"
              className={cn(brandCta, "whitespace-nowrap px-4 py-2 text-sm")}
            >
              <span className="sm:hidden">ورود</span>
              <span className="hidden sm:inline">ورود / ثبت‌نام</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      <footer className="border-t border-white/6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <BrandMark compact />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/help" className="transition-colors hover:text-brand">
              راهنما
            </Link>
            <Link href="/rules" className="transition-colors hover:text-brand">
              قوانین برنامه
            </Link>
            <Link href="/#login" className="transition-colors hover:text-brand">
              ورود
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
