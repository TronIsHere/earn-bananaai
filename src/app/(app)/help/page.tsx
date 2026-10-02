import type { Metadata } from "next";
import { HelpCenter } from "@/components/help-center";

export const metadata: Metadata = {
  title: "راهنما",
  description:
    "راهنما و اسناد کمپین بنانا: ورود، تأیید اینستاگرام، ارسال پست، پاداش و برداشت.",
};

export default function HelpPage() {
  return <HelpCenter />;
}
