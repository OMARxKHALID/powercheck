import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Zap } from "lucide-react";
import NavLink from "@/components/NavLink";
import ThemeToggle from "@/components/ThemeToggle";

const fontSans  = Inter({ subsets: ["latin"], variable: "--font-sans",  display: "swap" });
const fontSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const fontMono  = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono",  display: "swap" });

export const metadata = {
  title: "PowerCheck — Pakistani Electricity Bill Tracker",
  description: "Fetch and track electricity bills from all Pakistani DISCOs.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} min-h-screen bg-background text-foreground`}>

        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="group flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight">
                Power<span className="text-primary">Check</span>
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <nav className="flex items-center gap-0.5" aria-label="Main navigation">
                <NavLink href="/">Dashboard</NavLink>
                <NavLink href="/history">History</NavLink>
                <NavLink href="/settings">Settings</NavLink>
              </nav>
              <div className="mx-1.5 h-4 w-px bg-border" />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {children}
        </main>

        <footer className="mt-16 border-t border-border py-4">
          <p className="text-center text-xs text-muted-foreground">
            PowerCheck — LESCO · MEPCO · FESCO · GEPCO · IESCO · PESCO · HESCO · SEPCO · QESCO · TESCO · K-Electric
          </p>
        </footer>

      </body>
    </html>
  );
}
