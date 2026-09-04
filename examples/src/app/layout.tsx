import type { Metadata } from "next";
import { CopilotKit } from "@copilotkit/react-core";
import "./globals.css";

export const metadata: Metadata = {
  title: "CopilotKit UI Components Demo - Chat, Sidebar, Popup",
  description: "Interactive UI showcase for CopilotChat, CopilotSidebar, and CopilotPopup",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">
        <CopilotKit runtimeUrl="/api/copilotkit">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
