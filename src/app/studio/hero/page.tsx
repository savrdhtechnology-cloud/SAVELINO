import type { Metadata } from "next";
import { Hero } from "@/components/hero/Hero";
import { HERO_PRESETS, type HeroPreset } from "@/lib/settings";
import { getSiteSettings } from "@/lib/settings-server";

export const metadata: Metadata = { title: "Hero preview", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ preset?: string }> };

/** Hero only, used for the theme thumbnails in CRM → Appearance Studio. */
export default async function HeroPreview({ searchParams }: Props) {
  const { preset } = await searchParams;
  const settings = await getSiteSettings();
  const chosen = HERO_PRESETS.includes(preset as HeroPreset) ? (preset as HeroPreset) : settings.hero.preset;
  return (
    <main className="pointer-events-none select-none overflow-hidden">
      <Hero content={{ ...settings.hero, preset: chosen, height: 100 }} still />
    </main>
  );
}
