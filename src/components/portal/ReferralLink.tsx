"use client";

import { useState } from "react";

export function ReferralLink({ code, link }: { code: string; link: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        { label: "Referral code", value: code },
        { label: "Referral link", value: link },
      ].map((item) => (
        <div key={item.label} className="border border-gold/30 bg-noir-soft p-6">
          <p className="eyebrow">{item.label}</p>
          <p className="mt-3 break-all font-display text-2xl text-ivory">{item.value}</p>
          <button
            type="button"
            onClick={() => copy(item.value, item.label)}
            className="mt-5 border border-gold/50 px-4 py-2 text-[0.62rem] uppercase tracking-[0.28em] text-gold transition-colors hover:bg-gold hover:text-noir"
          >
            {copied === item.label ? "Copied" : "Copy"}
          </button>
        </div>
      ))}
    </div>
  );
}
