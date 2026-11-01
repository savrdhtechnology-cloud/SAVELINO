import type { Metadata, Viewport } from "next";
import { site } from "@/lib/site";
import { themeCss } from "@/lib/settings";
import { getSiteSettings } from "@/lib/settings-server";
import { StudioBridge } from "@/components/site/StudioBridge";
import "./globals.css";

// Typefaces load from Google Fonts at runtime (not next/font/google), so the build never
// depends on fetching and parsing Google's CSS. CSS variables are defined in globals.css.
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900" +
  "&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600" +
  "&family=Manrope:wght@200..800" +
  "&family=Playfair+Display:ital,wght@0,400..900;1,400..900" +
  "&family=DM+Serif+Display:ital@0;1" +
  "&family=Inter:wght@100..900" +
  "&family=Poppins:wght@300;400;500;600" +
  "&family=Lora:ital,wght@0,400..700;1,400..700" +
  "&display=swap";

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
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
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
