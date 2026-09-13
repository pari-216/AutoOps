import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AutoOps — AI-powered operations, human-approved.",
    template: "%s · AutoOps",
  },
  description:
    "AutoOps watches incoming operational emails, suggests actions, and lets humans approve before anything happens.",
};

import { AutoOpsProvider } from "@/context/autoops-context";
import { ToastContainer } from "@/components/ui/toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <AutoOpsProvider>
          {children}
          <ToastContainer />
        </AutoOpsProvider>
      </body>
    </html>
  );
}
