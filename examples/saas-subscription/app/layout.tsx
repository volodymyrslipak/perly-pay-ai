import type { ReactNode } from "react";

export const metadata = { title: "Pro, paid in crypto" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560, margin: "48px auto", padding: "0 16px", lineHeight: 1.5 }}>{children}</body>
    </html>
  );
}
