import { AppOrGuestShell } from "@/components/app-or-guest-shell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppOrGuestShell>{children}</AppOrGuestShell>;
}
