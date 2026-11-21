import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { AppProviders } from "@/providers/AppProviders";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "IssueFlow — Move work forward",
    template: "%s | IssueFlow",
  },
  description:
    "A clearer, calmer way to manage projects, issues, and team collaboration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppProviders>
          <Navbar />
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-16 pt-24 sm:px-6 lg:px-8">
            {children}
          </main>
          <Footer />
          <Toaster position="bottom-right" richColors />
        </AppProviders>
      </body>
    </html>
  );
}
