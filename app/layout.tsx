import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Airtel SCM — Statement of Work",
  description: "Submit and manage Statements of Work for Airtel Supply Chain Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
