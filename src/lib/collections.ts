import type { StaticImageData } from "next/image";
import blouses from "@/assets/images/blouses.webp";
import salwar from "@/assets/images/salwar.webp";
import sarees from "@/assets/images/sarees.webp";
import shapewear from "@/assets/images/shapewear.webp";
import lingerie from "@/assets/images/lingerie.webp";
import loungewear from "@/assets/images/loungewear.webp";
import heritage from "@/assets/images/editorial-heritage.webp";

export const images = { blouses, salwar, sarees, shapewear, lingerie, loungewear, heritage };

export type Collection = {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  story: string;
  image: StaticImageData;
  highlights: string[];
};

export const collections: Collection[] = [
  {
    slug: "designer-blouses",
    title: "Designer Blouses",
    kicker: "The signature of SAVLINO",
    summary: "Sculpted silhouettes, hand-finished embroidery and backs designed to be remembered.",
    story:
      "Every SAVLINO blouse begins with the back — the line most people see as you walk away. Deep necklines, zardozi borders and precise darts are balanced so the piece sits beautifully with any saree in your wardrobe.",
    image: blouses,
    highlights: ["Hand embroidery", "Padded & non-padded", "Custom necklines"],
  },
  {
    slug: "ready-made-blouses",
    title: "Ready-Made Blouses",
    kicker: "Standard sizes, couture finish",
    summary: "Designer detailing in carefully graded standard sizes — ready when you are.",
    story:
      "Our ready-made range is cut on graded patterns with generous seam allowances, so small alterations stay simple. Each size is checked against a fit model before release.",
    image: blouses,
    highlights: ["Sizes 32 – 44", "Alteration-friendly seams", "Ready to dispatch"],
  },
  {
    slug: "salwar-suits",
    title: "Salwar Suits",
    kicker: "Regal ease",
    summary: "Flowing anarkalis and tailored suits in rich jewel tones and heirloom embroidery.",
    story:
      "From floor-grazing anarkalis to clean straight-cut kurtas, our salwar suits are made for long celebrations — breathable linings, considered drape and dupattas finished by hand.",
    image: salwar,
    highlights: ["Anarkali & straight cuts", "Hand-finished dupattas", "Festive & occasion"],
  },
  {
    slug: "sarees",
    title: "Sarees",
    kicker: "Six yards of legacy",
    summary: "Woven golds, soft silks and timeless drapes chosen for the moments that matter.",
    story:
      "Our sarees are selected for the hand of the fabric as much as the beauty of the weave — pieces that drape easily, photograph beautifully and last for generations.",
    image: sarees,
    highlights: ["Silk & tissue weaves", "Fall & pico ready", "Blouse pairing service"],
  },
  {
    slug: "shapewear",
    title: "Shapewear",
    kicker: "The foundation of every drape",
    summary: "Smoothing, breathable foundations designed to sit invisibly beneath sarees and suits.",
    story:
      "Designed for Indian silhouettes — saree shapewear that smooths without heat, and bodysuits that disappear beneath fitted blouses.",
    image: shapewear,
    highlights: ["Saree shapewear", "Breathable knits", "Seamless finish"],
  },
  {
    slug: "lingerie",
    title: "Lingerie",
    kicker: "Quiet indulgence",
    summary: "Fine lace and soft support in shades of noir, ivory and deep burgundy.",
    story:
      "Delicate lace, soft cups and thoughtful support. Our lingerie is made to feel as good as it looks — for you first, always.",
    image: lingerie,
    highlights: ["Fine lace", "Everyday & bridal", "Comfort-first support"],
  },
  {
    slug: "loungewear",
    title: "Loungewear",
    kicker: "Luxury, at rest",
    summary: "Satin-soft sets and robes for slow mornings and elegant evenings at home.",
    story:
      "Fluid fabrics in ivory and champagne, cut generously for ease. Loungewear that feels like a deep breath at the end of the day.",
    image: loungewear,
    highlights: ["Satin & modal", "Robes & sets", "Relaxed fits"],
  },
];

export function getCollection(slug: string) {
  return collections.find((c) => c.slug === slug);
}

/** The five category collections presented together on the homepage. */
export const categorySlugs = ["salwar-suits", "sarees", "shapewear", "lingerie", "loungewear"] as const;
