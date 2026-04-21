import type { Metadata } from "next";
import { Playfair_Display, Lora, Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/layout/Nav";
import { Header } from "@/components/layout/Header";
import { AgeModeProvider } from "@/hooks/useAgeMode";
import { BodyModeSync } from "@/components/layout/BodyModeSync";
import { ageModeFromAge } from "@/lib/utils/age-mode";
import type { AgeMode } from "@/types";
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
  title: book.title,
  description: book.description,
};

async function getInitialAgeMode(): Promise<AgeMode> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("sb_profiles")
        .select("age, age_mode")
        .eq("id", user.id)
        .single();

      if (profile?.age_mode) return profile.age_mode;
      if (profile?.age) return ageModeFromAge(profile.age);
    }
  } catch {
    // Not logged in or profiles table doesn't exist yet
  }
  return "adult";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialAgeMode = await getInitialAgeMode();
  const fontVars = `${playfair.variable} ${lora.variable} ${inter.variable}`;

  return (
    <html lang="en" className={`h-full ${fontVars}`}>
      <body className="min-h-full flex flex-col antialiased">
        <AgeModeProvider initialMode={initialAgeMode}>
          <BodyModeSync />
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Nav />
          <Header />
          <main id="main-content" className="flex-1 pb-16 md:pb-0">
            {children}
          </main>
        </AgeModeProvider>
      </body>
    </html>
  );
}
