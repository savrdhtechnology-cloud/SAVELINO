import type { Metadata, Viewport } from "next";
import { site } from "@/lib/site";
import { themeCss } from "@/lib/settings";
import { getSiteSettings } from "@/lib/settings-server";
import { StudioBridge } from "@/components/site/StudioBridge";
import { SiteEffects } from "@/components/site/SiteEffects";
import { googleFontsHref } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "SAVLINO",
    "designer blouses",
    "custom blouse stitching",
    "ready-made blouses",
    "salwar suits",
    "sarees",
    "shapewear",
    "lingerie",
    "loungewear",
    "Indian luxury fashion",
  ],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: "/",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0B",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSiteSettings();
  // Typefaces load from Google Fonts at runtime (not next/font/google) so the build never depends on
  // Google's CSS; only the house faces plus the Studio choices are requested. Variables live in globals.css.
  const fontsHref = googleFontsHref(["bodoni", "cormorant", "manrope", settings.theme.displayFont, settings.theme.bodyFont]);
  const css = `${themeCss(settings.theme)}${settings.announcement.enabled && settings.announcement.text ? ":root{--announce-h:32px}" : ""}`;
  return (
    <html
      lang="en"
      data-theme={settings.theme.mode}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={fontsHref} />
        {settings.theme.allowToggle && (
          // Applies a visitor's saved light/dark choice before paint (no flash).
          <script
            dangerouslySetInnerHTML={{
              __html: `try{var t=localStorage.getItem("savlino-site-theme");if(t==="light"||t==="dark"||t==="porcelain")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
            }}
          />
        )}
      </head>
      <body>
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
        <StudioBridge />
        <SiteEffects {...settings.effects} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-gold focus:px-4 focus:py-2 focus:text-noir"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
