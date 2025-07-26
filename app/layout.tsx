import "./globals.css";

import type { Metadata, Viewport } from "next";

import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { ThemeProvider } from "./providers/theme-provider";
import { UserSync } from "@/components/user-sync";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Karaoke Battle - Sing, Compete, Win!",
  description:
    "The ultimate karaoke competition platform. Battle friends in real-time with voice recognition scoring.",
  keywords: ["karaoke", "music", "gaming", "voice recognition", "competition"],
  authors: [{ name: "Karaoke Battle Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <UserSync />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
