export const site = {
  name: "SAVLINO",
  tagline: "A Legacy of Elegance",
  description:
    "SAVLINO — timeless women’s luxury. Designer blouses, custom stitching, salwar suits, sarees, shapewear, lingerie and loungewear, crafted with Indian heritage.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:2736").replace(/\/$/, ""),
  logo: {
    lockup: "/branding/savlino-logo-lockup-alpha.png",
    lockupWidth: 627,
    lockupHeight: 382,
    monogram: "/branding/savlino-monogram-alpha.png",
    monogramSize: 774,
  },
} as const;

export type NavItem = { label: string; href: string };

export const primaryNav: NavItem[] = [
  { label: "Blouses", href: "/#designer-blouses" },
  { label: "Collections", href: "/#collections" },
  { label: "Custom Stitching", href: "/#custom-stitching" },
  { label: "Lookbook", href: "/#lookbook" },
  { label: "Heritage", href: "/#heritage" },
  { label: "Partners", href: "/#partners" },
];
