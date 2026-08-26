import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getServerSession } from "next-auth/next";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { PageViewTracker } from "@/components/page-view-tracker";
import { StoreProvider } from "@/components/store-provider";
import { authOptions } from "@/lib/auth-config";
import "./globals.css";

const iranSans = localFont({
  src: [
    {
      path: "../../public/fonts/IRANSans-Light.woff",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/IRANSans-Reg.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/IRANSans-SemiBold.woff",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/IRANSans-Bold.woff",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-iran-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "کمپین بنانا",
    template: "%s | کمپین بنانا",
  },
  description:
    "با ساخت محتوا برای بنانا در اینستاگرام، پاداش تومانی بگیرید.",
  icons: {
    icon: [
      { url: "/icon/favicon.ico", sizes: "any" },
      { url: "/icon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/icon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: {
      url: "/icon/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
    shortcut: "/icon/favicon.ico",
  },
  manifest: "/icon/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b14",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="fa" dir="rtl" className={`${iranSans.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <AuthSessionProvider session={session}>
          <StoreProvider>
            <PageViewTracker />
            {children}
          </StoreProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
