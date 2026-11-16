import type { Metadata } from "next";
import { Playfair_Display, Lora, Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/layout/Nav";
import { Header } from "@/components/layout/Header";
import { AgeModeProvider } from "@/hooks/useAgeMode";
import { BodyModeSync } from "@/components/layout/BodyModeSync";
import { book } from "@/config/book";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: book.title, template: `%s · ${book.title}` },
  description: book.description,
};

async function getIsSignedIn(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const signedIn = await getIsSignedIn();
  const fontVars = `${playfair.variable} ${lora.variable} ${inter.variable}`;

  return (
    <html lang="en" className={`h-full ${fontVars}`}>
      <body className="min-h-full flex flex-col antialiased">
        <AgeModeProvider initialMode="adult">
          <BodyModeSync />
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Nav signedIn={signedIn} />
          <Header signedIn={signedIn} />
          <main id="main-content" className="flex-1 pb-16 md:pb-0">
            {children}
          </main>
        </AgeModeProvider>
      </body>
    </html>
  );
}
