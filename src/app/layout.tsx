import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { AppShell } from "@/components/dashboard/app-shell";

export const metadata: Metadata = {
  title: "Job Hunter AI",
  description: "Local-first internship discovery and application workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={GeistSans.className}><AppShell>{children}</AppShell></body></html>;
}
