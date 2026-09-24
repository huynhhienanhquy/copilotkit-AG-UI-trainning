import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CopilotKit } from "@copilotkit/react-core/v2";

import "./globals.css";
import "@copilotkit/react-core/v2/styles.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weather Assistant",
  description: "Weather assistant built with Mastra and CopilotKit.",
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
        suppressHydrationWarning
      >
        <CopilotKit
          runtimeUrl="/api/copilotkit"
          useSingleEndpoint={false}
          showDevConsole={false}
          enableInspector={false}
        >
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}