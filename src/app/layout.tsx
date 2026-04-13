import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/layout/Nav";
import { Header } from "@/components/layout/Header";
import { AgeModeProvider } from "@/hooks/useAgeMode";
import { ageModeFromAge } from "@/lib/utils/age-mode";
import type { AgeMode } from "@/types";

export const metadata: Metadata = {
  title: "Keith Cobb Storybook",
  description:
    "Stories and lessons from Keith Cobb's life — a family archive.",
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

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-800 antialiased">
        <AgeModeProvider initialMode={initialAgeMode}>
          <Nav />
          <Header />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
        </AgeModeProvider>
      </body>
    </html>
  );
}
