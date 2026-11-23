"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { STRINGS } from "@/lib/constants/strings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench, Shield, CheckCircle, UserCheck } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || STRINGS.auth.invalidCredentials);
        toastError(data.message || STRINGS.auth.invalidCredentials);
        setIsLoading(false);
        return;
      }

      toastSuccess(`Welcome back, ${data.user.name}`);

      // Redirect by role
      const role = data.user.role;
      let targetPath = "/requests";
      if (role === "ADMIN") targetPath = "/inbox";
      else if (role === "TECHNICIAN") targetPath = "/jobs";
      else if (role === "UNIT_HEAD") targetPath = "/dashboard";

      router.push(targetPath);
      router.refresh();
    } catch (err) {
      setErrorMessage("An unexpected network error occurred.");
      toastError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-navy text-white shadow-lg mb-1">
            <span className="text-2xl font-bold tracking-tight text-white">CF</span>
          </div>
          <h1 className="text-2xl font-extrabold text-navy tracking-tight">
            {STRINGS.app.name}
          </h1>
          <p className="text-sm text-muted">
            {STRINGS.app.facilitiesUnit} • {STRINGS.app.tagline}
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-borderline shadow-md">
          <CardHeader className="space-y-1">
            <CardTitle>{STRINGS.auth.loginTitle}</CardTitle>
            <CardDescription>{STRINGS.auth.loginSubtitle}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {errorMessage && (
              <div className="p-3 rounded-md bg-semantic-red/10 border border-semantic-red/30 text-semantic-red text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label={STRINGS.auth.emailLabel}
                type="email"
                placeholder={STRINGS.auth.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label={STRINGS.auth.passwordLabel}
                type="password"
                placeholder={STRINGS.auth.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-sm font-semibold"
                isLoading={isLoading}
              >
                {isLoading ? STRINGS.auth.signingIn : STRINGS.auth.signInButton}
              </Button>
            </form>

            {/* Demo Quick-Fill Buttons */}
            <div className="pt-4 border-t border-borderline">
              <p className="text-xs font-semibold text-navy uppercase tracking-wider mb-2.5">
                {STRINGS.auth.demoAccountsTitle}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemoAccount("admin@campusfix.edu")}
                  className="flex items-center gap-1.5 p-2 rounded border border-borderline bg-slate-50 hover:bg-ice/20 text-left transition-colors text-xs text-navy"
                >
                  <Shield className="w-3.5 h-3.5 text-blue flex-shrink-0" />
                  <span className="truncate font-medium">{STRINGS.auth.demoAdmin}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount("unithead@campusfix.edu")}
                  className="flex items-center gap-1.5 p-2 rounded border border-borderline bg-slate-50 hover:bg-ice/20 text-left transition-colors text-xs text-navy"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue flex-shrink-0" />
                  <span className="truncate font-medium">{STRINGS.auth.demoUnitHead}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount("tech.electrical@campusfix.edu")}
                  className="flex items-center gap-1.5 p-2 rounded border border-borderline bg-slate-50 hover:bg-ice/20 text-left transition-colors text-xs text-navy"
                >
                  <Wrench className="w-3.5 h-3.5 text-blue flex-shrink-0" />
                  <span className="truncate font-medium">{STRINGS.auth.demoTech}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount("reporter1@campusfix.edu")}
                  className="flex items-center gap-1.5 p-2 rounded border border-borderline bg-slate-50 hover:bg-ice/20 text-left transition-colors text-xs text-navy"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-blue flex-shrink-0" />
                  <span className="truncate font-medium">{STRINGS.auth.demoReporter}</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Life-safety Emergency Phone Callout */}
        <div className="text-center text-xs text-muted">
          <p>
            {STRINGS.app.emergencyNotice}
            <span className="font-semibold text-semantic-red ml-1">
              {process.env.NEXT_PUBLIC_EMERGENCY_PHONE || "+62 21 555-0911"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
