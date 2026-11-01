import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sponsor Intel",
  description: "Just-in-time leveraged finance intelligence for financial sponsor meetings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
