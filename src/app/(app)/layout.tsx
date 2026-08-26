import { AppSidebar } from "@/components/app-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
