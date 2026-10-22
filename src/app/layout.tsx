import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";
import { getEnvironment } from "@/lib/env";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReEntry · Save your place",
  description:
    "Keep your goal, confirmed progress, instructions, and next action together when work is interrupted.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  const env = getEnvironment();
  return (
    <html
      lang="en"
      data-reentry-origin={env.REENTRY_APP_ORIGIN}
      data-reentry-extension-id={env.REENTRY_EXTENSION_ID}
      className={cn(
        "h-full",
        "antialiased",
        geistMono.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
