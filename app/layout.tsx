import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CampusOS — University Management System",
  description: "Unified campus data manager with live database sync and AI assistant.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white min-h-screen flex flex-col lg:flex-row antialiased`}>
        <ToastProvider>
          <Sidebar />
          <main className="flex-1 lg:pl-64 min-h-screen flex flex-col bg-black">
            <div className="flex-1 w-full">{children}</div>
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
