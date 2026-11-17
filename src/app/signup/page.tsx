"use client";

import { useState } from "react";
import { book } from "@/config/book";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAuthRedirectOrigin } from "@/lib/app-url";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
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

    const supabase = createClient();
    const origin = getAuthRedirectOrigin();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          display_name: trimmed,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session && data.user) {
      await supabase
        .from("sb_profiles")
        .update({
          display_name: trimmed,
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
          <h1 className="type-page-title text-3xl">{book.title}</h1>
          <h2 className="type-page-title mt-1 text-3xl">Create account</h2>
          <p className="type-ui mt-3 text-ink-muted">
            A free account keeps your place, your highlights and your questions.
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
              <div className="notice-error rounded-lg p-3 text-sm">
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
                placeholder="you@example.com"
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
