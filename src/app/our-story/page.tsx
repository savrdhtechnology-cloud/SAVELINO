import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { Reveal } from "@/components/ui/Reveal";
import { StudioGallery } from "./StudioGallery";
import styles from "./story.module.css";

export const metadata: Metadata = {
  title: "Our story",
  description: "Discover SAVLINO’s Indian tailoring heritage and its proposed designer blouse studio in Bhopal.",
  alternates: { canonical: "/our-story" },
};

const values = [
  ["Heritage first", "Indian embroidery and tailoring traditions across our collections."],
  ["Made with care", "Each garment is finished and checked by hand."],
  ["For every woman", "From occasionwear to everyday essentials."],
];

const craftsmanship = [
  ["Hand embroidery", "Zardozi, aari and sequin work."],
  ["Fabric selection", "Chosen for hand-feel and drape."],
  ["Precision fit", "Thoughtful pattern and seam construction."],
  ["Finishing", "Clean seams and checked details."],
];

export default function OurStoryPage() {
  return (
    <PageShell>
      <div className={styles.page}>
        <section className={styles.intro}>
          <Reveal className={styles.wrap} y={16}>
            <p className={styles.label}>Our story</p>
            <SplitHeadline as="h1" text="A legacy of elegance" trigger="mount" />
            <p className={styles.introCopy}>The house of SAVLINO was born from a love of Indian craft and a belief that every woman deserves to feel it.</p>
            <Link className={styles.jump} href="#bhopal-studio">Discover the proposed Bhopal studio ↓</Link>
          </Reveal>
        </section>
        <section id="heritage" className={`${styles.wrap} ${styles.story}`}>
          <Reveal>
            <Image className={styles.heritageImage} src="/our-story/heritage.webp" width={1200} height={896}
              sizes="(max-width: 730px) 100vw, (max-width: 1224px) 50vw, 570px"
              alt="SAVLINO heritage editorial in gold embroidery" />
          </Reveal>
          <Reveal delay={0.12}>
            <p className={styles.label}>Our heritage</p>
            <h2>Rooted in India.<br />Made for every shade of a woman.</h2>
            <p className={styles.bodyCopy}>Our blouses draw on India’s embroidery and tailoring traditions, with silhouettes made for today.</p>
          </Reveal>
        </section>
        <section className={styles.values} aria-label="Our values">
          <div className={`${styles.wrap} ${styles.valuesGrid}`}>
            {values.map(([title, description], index) => (
              <Reveal delay={index * 0.08} key={title}>
                <h3>{title}</h3><p>{description}</p>
              </Reveal>
            ))}
          </div>
        </section>
        <section id="craftsmanship" className={styles.craft}>
          <div className={styles.wrap}>
            <Reveal className={styles.craftHeading}>
              <p className={styles.label}>Craftsmanship</p>
              <h2>The hand behind every stitch</h2>
            </Reveal>
            <div className={styles.craftGrid}>
              {craftsmanship.map(([title, description], index) => (
                <Reveal className={styles.craftCard} delay={index * 0.08} key={title}>
                  <h3>{title}</h3><p>{description}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
        <section id="bhopal-studio" className={styles.studio}>
          <div className={styles.wrap}>
            <Reveal className={styles.studioHead}>
              <div><p className={styles.label}>The SAVLINO studio</p><h2>Our proposed Bhopal outlet</h2></div>
              <div>
                <span className={styles.status}>Proposed outlet</span>
                <p className={styles.bodyCopy}>A planned designer blouse studio with a front display and an adjoining workshop for cutting, stitching and finishing.</p>
              </div>
            </Reveal>
            <Reveal delay={0.1}><StudioGallery /></Reveal>
          </div>
        </section>
        <section className={styles.closing}>
          <Reveal className={styles.wrap}>
            <h2>Tradition in style, always.</h2>
            <div className={styles.actions}>
              <Link className={styles.button} href="/collections">Explore collections</Link>
              <Link className={`${styles.button} ${styles.outline}`} href="/contact">Get in touch</Link>
            </div>
          </Reveal>
        </section>
      </div>
    </PageShell>
  );
}
