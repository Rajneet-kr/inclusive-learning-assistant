import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inclusive Learning Assistant",
  description:
    "Accessible study companion for dyslexic, low-vision, and deaf/hard-of-hearing students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
