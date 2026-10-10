import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Cormorant_Garamond, DM_Serif_Display, Inter, Lora, Manrope, Playfair_Display, Poppins } from "next/font/google";
import { site } from "@/lib/site";
import { themeCss } from "@/lib/settings";
import { getSiteSettings } from "@/lib/settings-server";
import { StudioBridge } from "@/components/site/StudioBridge";
import "./globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-bodoni",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

// Optional typefaces chosen in Studio / CRM settings (not preloaded to keep the first paint light).
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap", preload: false });
const dmserif = DM_Serif_Display({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-dmserif", display: "swap", preload: false });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });
const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-poppins", display: "swap", preload: false });
const lora = Lora({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-lora", display: "swap", preload: false });

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

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
      className={`${bodoni.variable} ${cormorant.variable} ${manrope.variable} ${playfair.variable} ${dmserif.variable} ${inter.variable} ${poppins.variable} ${lora.variable}`}
    >
      <head>
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
