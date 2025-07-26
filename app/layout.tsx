import "./globals.css";

import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "./providers/theme-provider";

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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
