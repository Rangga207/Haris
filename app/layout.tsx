import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CampusFix - Campus Facility Complaint & Service Request System",
  description: "Facility Complaint and Service Request System for Campus Facilities Unit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-canvas text-body antialiased selection:bg-ice/50 selection:text-navy">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
