"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ageModeFromAge } from "@/lib/utils/age-mode";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsEmailConfirm(false);

    const trimmed = firstName.trim();
    if (!trimmed) {
      setError("Please enter your first name.");
      setLoading(false);
      return;
    }

    const ageNum = parseInt(age, 10);
    if (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setError("Please enter a valid age between 1 and 120.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const origin = window.location.origin;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          display_name: trimmed,
          age: ageNum,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session && data.user) {
      const mode = ageModeFromAge(ageNum);
      await supabase
        .from("sb_profiles")
        .update({
          display_name: trimmed,
          age: ageNum,
          age_mode: mode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.user.id);

      window.location.href = "/";
      return;
    }

    setNeedsEmailConfirm(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="type-page-title text-3xl">The Cobb Family</h1>
          <h2 className="type-page-title mt-1 text-3xl">Story Library</h2>
          <p className="type-ui mt-3 text-ink-muted">
            Create an account to explore the stories
          </p>
        </div>

        {needsEmailConfirm ? (
          <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-warm-white p-6 text-center">
            <p className="type-ui text-ink">
              Check your email for a confirmation link. After you confirm,
              you can sign in with your email and password.
            </p>
            <Link
              href="/login"
              className="type-ui inline-block text-burgundy underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="firstName"
                className="type-ui mb-1 block text-ink"
              >
                First name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
                className="type-ui w-full rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 text-ink"
                placeholder="Alex"
              />
            </div>

            <div>
              <label htmlFor="age" className="type-ui mb-1 block text-ink">
                Age
              </label>
              <input
                id="age"
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                className="type-ui w-full rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 text-ink"
                placeholder="e.g. 14"
              />
              <p className="type-ui mt-1 text-xs text-ink-muted">
                We use this to personalize reading level and tone.
              </p>
            </div>

            <div>
              <label htmlFor="email" className="type-ui mb-1 block text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="type-ui w-full rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 text-ink"
                placeholder="you@family.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="type-ui mb-1 block text-ink"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="type-ui w-full rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 text-ink"
                placeholder="At least 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="type-ui w-full rounded-lg bg-clay py-2.5 font-medium text-warm-white transition-colors hover:bg-clay-mid disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

            <p className="type-ui text-center text-sm text-ink-muted">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-burgundy underline-offset-2 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
