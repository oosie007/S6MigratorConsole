import type { Metadata } from "next";
import { AppSidebar } from "@/components/app-sidebar";
import { MigrationsProvider } from "@/contexts/migrations-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "S6 → Catalyst Migration Console",
  description: "Manage migrations from legacy System 6 to Catalyst",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen bg-background text-foreground antialiased font-sans">
        <MigrationsProvider>
          <AppSidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </MigrationsProvider>
      </body>
    </html>
  );
}
