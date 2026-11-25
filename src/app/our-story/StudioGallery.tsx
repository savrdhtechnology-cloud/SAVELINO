"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import styles from "./story.module.css";

const views = [
  { title: "Studio layout", file: "studio-layout", detail: "Proposed fit-out concept", alt: "Black-and-gold SAVLINO studio concept with display, office, stock and production zones" },
  { title: "Mall frontage", file: "mall-frontage", detail: "Proposed SAVLINO signage", alt: "Concept render of SAVLINO gold signage on the mall frontage" },
  { title: "Workshop interior", file: "workshop", detail: "Proposed production fit-out", alt: "Concept render of the SAVLINO tailoring and production workshop" },
];

export function StudioGallery() {
  const [selected, setSelected] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const active = views[selected];
  const caption = `${active.title} · ${active.detail}`;
  const src = `/our-story/${active.file}.webp`;

  return (
    <div className={styles.showcase}>
      <figure>
        <button type="button" className={styles.imageButton} aria-haspopup="dialog" aria-label={`Enlarge ${active.title.toLowerCase()}`}
          onClick={() => { setEnlarged(true); dialog.current?.showModal(); }}>
          <Image key={src} className={styles.mainImage} src={src} alt={active.alt} fill
            sizes="(max-width: 730px) 100vw, (max-width: 1224px) 60vw, 690px" />
          <span className={styles.enlarge}>View larger ↗</span>
        </button>
        <figcaption className={styles.caption} aria-live="polite">{caption}</figcaption>
      </figure>
      <div className={styles.side}>
        <div>
          <p className={styles.label}>Planned location</p>
          <h3>SAGE Milestone Mall</h3>
          <p className={styles.address}>Top floor · Bhopal, Madhya Pradesh<br />Proposed space · 700 sq ft</p>
        </div>
        <div className={styles.tabs} role="group" aria-label="Studio gallery">
          {views.map((view, index) => (
            <button key={view.file} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>
              <Image src={`/our-story/${view.file}.webp`} alt="" width={68} height={44} />
              {view.title}
            </button>
          ))}
        </div>
        <div className={styles.actions}><Link className={styles.button} href="/contact">Enquire about the studio</Link></div>
      </div>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="studio-image-title" onClose={() => setEnlarged(false)}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        <div className={styles.dialogBar}>
          <strong id="studio-image-title">{caption}</strong>
          <form method="dialog"><button type="submit" aria-label="Close image">Close ×</button></form>
        </div>
        {enlarged && <div className={styles.dialogImage}><Image src={src} alt={active.alt} fill sizes="(max-width: 1150px) 94vw, 1080px" /></div>}
      </dialog>
    </div>
  );
}
