import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import UserMenu from '@/components/UserMenu';

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Party Platypus",
  description: "Create and join events to draw together",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} font-sans antialiased bg-mint-0`}>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-mint-3/90 border-b border-mint-2/30">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <h1 className="text-lg font-semibold text-white tracking-tight">Party Platypus</h1>
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 animate-fade-in-up">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}