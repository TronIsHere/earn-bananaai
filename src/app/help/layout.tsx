import { AppOrGuestShell } from "@/components/app-or-guest-shell";

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppOrGuestShell>{children}</AppOrGuestShell>;
}
