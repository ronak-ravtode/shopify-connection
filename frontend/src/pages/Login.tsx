import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button, Card, Input, Label, Badge } from "../components/primitives";
import { IconAlert, IconSpark } from "../components/icons";

/* Quick-fill targets must match the users actually present in the dev
   database (backend/recon_dev.db). The seeded admin's password is "admin123";
   the page previously offered "Pass123!", which is what the backend test
   fixtures use, so the button filled in a credential that could never log in.
   Passwords are bcrypt hashes and are not recoverable, so these are only ever
   correct for a freshly seeded local database - never for production. */
const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@t.in", password: "admin123" },
] as const;

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const data = await api<{ token: string; user?: any }>(`/api/v1/auth/login`, {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem("token", data.token);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          localStorage.setItem("user", JSON.stringify({ email }));
        }
        window.dispatchEvent(new Event("auth-change"));
        navigate("/dashboard");
      } else {
        const data = await api<{ token: string; user?: any }>(`/api/v1/auth/signup`, {
          method: "POST",
          body: JSON.stringify({
            name: name || undefined,
            email,
            password,
            business_name: businessName || undefined,
          }),
        });
        localStorage.setItem("token", data.token);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          localStorage.setItem("user", JSON.stringify({ email }));
        }
        window.dispatchEvent(new Event("auth-change"));
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(
        err?.message ??
          (mode === "login"
            ? "Login failed. Please check your credentials."
            : "Registration failed. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  const fillDemoCreds = (em: string, pw: string) => {
    setMode("login");
    setEmail(em);
    setPassword(pw);
    setError(null);
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-8">
      {/* Background ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div className="size-[500px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <Card className="relative z-10 w-full max-w-[440px] p-8 sm:p-10 shadow-xl border-border/80 bg-card rounded-2xl">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary font-semibold text-xl shadow-xs">
            R
          </div>
          <Badge variant="secondary" className="mb-2.5 text-[11px] font-semibold tracking-wider uppercase">
            Shopify ReconHub
          </Badge>
          <h1 className="font-heading font-medium tracking-tight text-foreground text-2xl sm:text-3xl mb-1.5">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {mode === "login"
              ? "Sign in to access your Shopify Order Reconciliation platform"
              : "Register to manage orders, reconciliations, and analytics"}
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="mb-6 flex rounded-xl bg-muted/50 p-1 border border-border/60">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              mode === "login"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              mode === "signup"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-2.5 rounded-xl bg-destructive/10 px-4 py-3 text-xs sm:text-sm text-destructive border border-destructive/20"
          >
            <IconAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Ronak Ravtode"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="businessName">Store / Company Name</Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="e.g. Reshamgath"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "login" && (
                <span className="text-[11px] text-muted-foreground">
                  Demo: {DEMO_ACCOUNTS[0].password}
                </span>
              )}
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 w-full h-10 font-semibold shadow-xs hover:shadow-md"
          >
            {loading
              ? mode === "login"
                ? "Signing in..."
                : "Creating Account..."
              : mode === "login"
              ? "Sign In to ReconHub"
              : "Create ReconHub Account"}
          </Button>

          <div className="text-center mt-1">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </form>

        {/* Demo Credentials Quick Fill */}
        {mode === "login" && (
          <div className="mt-6 border-t border-border/80 pt-5 text-center">
            <p className="mb-2.5 text-xs text-muted-foreground">
              Testing locally? Quick-fill demo credentials:
            </p>
            <div className="flex justify-center gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <Button
                  key={acc.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5"
                  onClick={() => fillDemoCreds(acc.email, acc.password)}
                >
                  <IconSpark size={13} />
                  {acc.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
