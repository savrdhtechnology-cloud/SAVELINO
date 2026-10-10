import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Monogram } from "@/components/ui/Logo";
import { isBackendConfigured } from "@/lib/supabase/env";
import { AuthForm } from "./AuthForm";

type AuthPageProps = {
  mode: "login" | "register";
  audience: "customer" | "partner";
  eyebrow: string;
  title: string;
  intro: string;
};

export function AuthPage({ mode, audience, eyebrow, title, intro }: AuthPageProps) {
  return (
    <PageShell>
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-10 hidden opacity-[0.06] lg:block"
        >
          <Monogram size={640} />
        </div>
        <div className="relative mx-auto grid max-w-[1200px] gap-14 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-5 font-display text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.02] text-ivory">{title}</h1>
            <p className="mt-6 max-w-md font-serif text-xl leading-relaxed text-ivory/70">{intro}</p>
          </div>
          <div className="border border-gold/20 bg-noir-soft/80 p-7 backdrop-blur md:p-10">
            <Suspense fallback={null}>
              <AuthForm mode={mode} audience={audience} configured={isBackendConfigured()} />
            </Suspense>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
