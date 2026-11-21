import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ServiceStatusBanner } from "@/components/common/ServiceStatusBanner";
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
  openGraph: {
    title: "IssueFlow — Move work forward",
    description:
      "A clearer, calmer way to manage projects, issues, and team collaboration.",
    siteName: "IssueFlow",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
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
      data-scroll-behavior="smooth"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppProviders>
          <Navbar />
          <div className="pt-16">
            <ServiceStatusBanner />
          </div>
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-16 pt-4 sm:px-6 lg:px-8">
            {children}
          </main>
          <Footer />
          <Toaster position="bottom-right" richColors />
        </AppProviders>
      </body>
    </html>
  );
}
