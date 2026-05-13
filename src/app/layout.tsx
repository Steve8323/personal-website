import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Steve Hou",
  description: "Personal site of Steve Hou — writing, work, and reading recommendations.",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/readings", label: "Readings" },
  { href: "/lunch", label: "Lunch" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-black/[.06] dark:border-white/[.08]">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
            <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
              steve hou
            </Link>
            <ul className="flex items-center gap-5 text-sm">
              {navLinks
                .filter((l) => l.href !== "/")
                .map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
          {children}
        </main>
        <footer className="border-t border-black/[.06] py-8 dark:border-white/[.08]">
          <div className="mx-auto flex max-w-3xl flex-col items-start gap-2 px-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <Link
                href="/admin/login"
                aria-label="Admin"
                className="cursor-default text-inherit no-underline hover:text-inherit"
              >
                ©
              </Link>{" "}
              {new Date().getFullYear()} Steve Hou
            </span>
            <a
              href="mailto:contact.levu@proton.me"
              className="font-mono hover:text-foreground"
            >
              contact.levu@proton.me
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
