import type { Metadata } from "next";
import { CopilotKit } from "@copilotkit/react-core/v2";

import "./globals.css";
import "@copilotkit/react-core/v2/styles.css";

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
      <body className="antialiased" suppressHydrationWarning>
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
