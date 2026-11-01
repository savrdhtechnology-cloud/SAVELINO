"use client";

import { AnimatePresence, Reorder, motion, useDragControls } from "motion/react";
import { useState } from "react";
import { useSiteSettings } from "@/lib/admin/site-settings-client";
import { toast } from "@/lib/admin/store";
import { resolveCategory, isStaticImage } from "@/lib/catalogue";
import { BUILTIN_CATEGORY_SLUGS, CATEGORY_SLUG, MAX_CATEGORIES, type CategorySetting } from "@/lib/settings";
import { Card, SaveBar, TextField } from "./fields";
import { EASE, Icon } from "./ui";

const BUILTIN = new Set<string>(BUILTIN_CATEGORY_SLUGS);
const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export function CategoriesApp({ live }: { live: boolean }) {
  const { settings, setSettings, save, saving, dirty, reset, loading } = useSiteSettings(live);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", kicker: "", summary: "", image: "" });
  const list = settings.catalogue.categories;
  const enabledCount = list.filter((c) => c.enabled).length;

  const setList = (next: CategorySetting[]) => setSettings((s) => ({ ...s, catalogue: { categories: next } }));
  const patch = (slug: string, p: Partial<CategorySetting>) => setList(list.map((c) => (c.slug === slug ? { ...c, ...p } : c)));

  function add() {
    const title = draft.title.trim();
    const slug = slugify(title);
    if (!title || !CATEGORY_SLUG.test(slug)) return toast("Give the category a name", "danger");
    if (list.some((c) => c.slug === slug)) return toast("A category with this name already exists", "danger");
    if (list.length >= MAX_CATEGORIES) return toast(`Up to ${MAX_CATEGORIES} categories`, "danger");
    setList([...list, { slug, enabled: false, title, kicker: draft.kicker.trim(), summary: draft.summary.trim(), image: draft.image.trim() }]);
    setDraft({ title: "", kicker: "", summary: "", image: "" });
    setOpen(slug);
    toast("Category added — switch it on when its products are ready");
  }

  return (
    <div className="pb-24">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <p className="text-[0.6rem] uppercase tracking-[0.4em] text-gold">Website</p>
        <h1 className="mt-2 font-display text-4xl text-ivory md:text-5xl">Categories</h1>
        <p className="mt-2 max-w-2xl font-serif text-lg text-ivory/60">
          Choose which categories the website shows. Switched-off categories disappear from menus, the homepage and their pages —
          turn one on when its products are ready.
        </p>
      </motion.header>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card title={`Live on the website · ${enabledCount} of ${list.length}`} description="Drag to reorder. The order is used in menus and on the collections page.">
          {loading ? (
            <div className="h-72 animate-pulse bg-noir/40" />
          ) : (
            <Reorder.Group axis="y" values={list} onReorder={setList} className="space-y-2">
              {list.map((c) => (
                <CategoryRow
                  key={c.slug}
                  item={c}
                  open={open === c.slug}
                  onOpen={() => setOpen((o) => (o === c.slug ? null : c.slug))}
                  onPatch={(p) => patch(c.slug, p)}
                  onDelete={() => {
                    setList(list.filter((x) => x.slug !== c.slug));
                    setOpen(null);
                  }}
                />
              ))}
            </Reorder.Group>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Add a category" description="For example Kurtis, Lehengas or Dupattas. It starts switched off.">
            <TextField label="Name" value={draft.title} onChange={(v) => setDraft((d) => ({ ...d, title: v }))} placeholder="Lehengas" />
            {draft.title.trim() && <p className="-mt-2 text-xs text-ivory/40">Page: /collections/{slugify(draft.title) || "…"}</p>}
            <TextField label="Small line above the name" value={draft.kicker} onChange={(v) => setDraft((d) => ({ ...d, kicker: v }))} placeholder="Bridal & festive" />
            <TextField label="Short description" value={draft.summary} onChange={(v) => setDraft((d) => ({ ...d, summary: v }))} multiline />
            <TextField label="Photo URL (optional)" value={draft.image} onChange={(v) => setDraft((d) => ({ ...d, image: v }))} placeholder="https://…/lehenga.jpg" />
            <button type="button" onClick={add} className="w-full bg-gold px-4 py-3 text-[0.62rem] font-medium uppercase tracking-[0.25em] text-noir hover:bg-gold-light">
              Add category
            </button>
          </Card>
          <Card title="Products">
            <p className="text-sm leading-relaxed text-ivory/60">
              Add products in <a href="/admin/products" className="text-gold underline-offset-4 hover:underline">Products</a> and pick their category.
              Live products appear on that category’s page while the category is switched on.
            </p>
          </Card>
        </div>
      </div>

      <SaveBar dirty={dirty} saving={saving} live={live} onSave={() => void save()} onReset={reset} />
    </div>
  );
}

function CategoryRow({
  item,
  open,
  onOpen,
  onPatch,
  onDelete,
}: {
  item: CategorySetting;
  open: boolean;
  onOpen: () => void;
  onPatch: (p: Partial<CategorySetting>) => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();
  const shown = resolveCategory(item);
  const builtin = BUILTIN.has(item.slug);
  const thumb = isStaticImage(shown.image) ? shown.image.src : shown.image;
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={controls} className="border border-gold/15 bg-noir/70">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab touch-none text-ivory/35 hover:text-gold active:cursor-grabbing"
          aria-label={`Drag ${shown.title}`}
        >
          <Icon d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" className="h-4 w-4" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt="" className={`h-12 w-9 shrink-0 border border-gold/20 object-cover ${item.enabled ? "" : "opacity-40 grayscale"}`} />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className={`block truncate text-sm ${item.enabled ? "text-ivory" : "text-ivory/45"}`}>{shown.title}</span>
          <span className="block truncate text-[0.68rem] text-ivory/35">
            /collections/{item.slug} · {item.enabled ? "On the website" : "Hidden"}
            {builtin ? "" : " · custom"}
          </span>
        </button>
        <button type="button" onClick={onOpen} className="text-[0.58rem] uppercase tracking-[0.22em] text-ivory/45 hover:text-gold">
          {open ? "Close" : "Edit"}
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={item.enabled}
          aria-label={`Show ${shown.title} on the website`}
          onClick={() => onPatch({ enabled: !item.enabled })}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${item.enabled ? "bg-gold" : "bg-ivory/15"}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-noir transition-all ${item.enabled ? "left-[18px]" : "left-0.5"}`} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-gold/10 p-4">
              {builtin && <p className="text-xs text-ivory/40">Leave a field empty to keep the built-in text and photo.</p>}
              <TextField label="Name" value={item.title} onChange={(v) => onPatch({ title: v })} placeholder={builtin ? resolveCategory({ ...item, title: "" }).title : ""} />
              <TextField label="Small line above the name" value={item.kicker} onChange={(v) => onPatch({ kicker: v })} />
              <TextField label="Short description" value={item.summary} onChange={(v) => onPatch({ summary: v })} multiline />
              <TextField label="Photo URL" value={item.image} onChange={(v) => onPatch({ image: v })} placeholder={builtin ? "Built-in photo" : "https://…"} />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {item.enabled && (
                  <a href={`/collections/${item.slug}`} target="_blank" rel="noreferrer" className="text-[0.6rem] uppercase tracking-[0.22em] text-gold hover:underline">
                    View page ↗
                  </a>
                )}
                {builtin ? (
                  <button
                    type="button"
                    onClick={() => onPatch({ title: "", kicker: "", summary: "", image: "" })}
                    className="text-[0.6rem] uppercase tracking-[0.22em] text-ivory/45 hover:text-gold"
                  >
                    Restore original text & photo
                  </button>
                ) : (
                  <button type="button" onClick={onDelete} className="text-[0.6rem] uppercase tracking-[0.22em] text-red-400/80 hover:text-red-400">
                    Delete category
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
