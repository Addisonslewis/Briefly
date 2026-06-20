import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Briefly - Your AI-Powered News Digest",
  description:
    "AI reads your X feed and emails you a daily digest. Skip the scroll, keep the signal.",
  openGraph: {
    title: "Briefly - Your AI-Powered News Digest",
    description: "AI reads your X feed and emails you a daily digest. Skip the scroll, keep the signal.",
    url: "https://www.gobriefly.app",
    siteName: "Briefly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Briefly - Your AI-Powered News Digest",
    description: "AI reads your X feed and emails you a daily digest. Skip the scroll, keep the signal.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium">Skip to main content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
