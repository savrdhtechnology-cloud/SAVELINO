"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { imageToDataUrl } from "@/components/atelier/image";
import type { DesignSpec } from "@/lib/atelier/constants";

type Draft = {name:string;category:string;spec:DesignSpec;uncertainty:string[];confidence:string;warning:string};
const RUBY_SAMPLE: Draft = {
 name: "Ruby Shimmer Sleeveless Princess Blouse",
 category: "designer-blouses",
 spec: { neckline:"u",backNeck:"round",sleeve:"sleeveless",cut:"princess",darts:["waist"],closure:"back-hooks",fabric:"Ruby red metallic shimmer (visual estimate)",lining:"To verify",embroidery:"None visible",accessories:[],colors:["Ruby red","Metallic red"],instructions:"Reference shows wide scoop neckline, broad shoulder straps and princess panel seams. Verify back, closure, stretch and measurements before drafting production patterns.",notes:"QA SAMPLE — front photograph only; back neckline and back hooks are placeholders, not confirmed." },
 uncertainty:["Back view is missing","Back neckline and closure are not visually confirmed","No reliable size or fabric consumption can be derived from a photo","Pattern-master fitting, stretch and seam allowance checks required"],
 confidence:"Front style only",
 warning:"Demonstration draft from the supplied ruby-blouse reference; no AI request. Verify all inferred construction details before production."
};
const input = "w-full border border-gold/25 bg-noir/40 p-3 text-sm text-ivory outline-none focus:border-gold";
const button = "border border-gold/40 px-5 py-3 text-xs uppercase tracking-widest text-gold hover:bg-gold/10 disabled:opacity-50";
export function PhotoTemplateStudio() {
 const [files,setFiles] = useState<File[]>([]);
 const [busy,setBusy]=useState(false);
 const [draft,setDraft]=useState<Draft|null>(null);
 const [error,setError]=useState("");
 const [saved,setSaved]=useState(false);
 const [photoViews,setPhotoViews]=useState<("front"|"back"|"side")[]>([]);
 const onFiles = (incoming:FileList|null) => {
   const a=Array.from(incoming||[]).slice(0,4);
   if(a.some(f=>!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>1700000)){setError("Use 1–4 JPEG/PNG/WebP files, max 1.7 MB each.");return;}
   setFiles(a);setPhotoViews(a.map((_,i)=>i===0?"front":i===1?"back":"side"));setDraft(null);setSaved(false);setError("");
 };
 const encode=(f:File)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error("Unable to read image"));r.readAsDataURL(f);});
 async function analyze(){
   if(!files.length)return;
   setBusy(true);setError("");setDraft(null);
   try{
     const images=await Promise.all(files.map(encode));
     const res=await fetch("/api/admin/photo-template/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({images})});
     const json=await res.json();
     if(!res.ok)throw new Error(json.error||"Analysis failed");
     setDraft(json as Draft);
   }catch(e){setError(e instanceof Error?e.message:"Analysis failed");}
   finally{setBusy(false);}
 }
 async function save(){
   if(!draft)return;
   setBusy(true);setError("");
   try{
     const client=createSupabaseBrowserClient();
     if(!client)throw new Error("Supabase is not configured");
     const {data:{user},error:authErr}=await client.auth.getUser();
     if(authErr||!user)throw new Error("Sign in as Admin");
     const {data:profile}=await client.from("profiles").select("role").eq("id",user.id).single();
     if(profile?.role!=="admin")throw new Error("Admin role required");
     const sketches = await Promise.all(files.map(async (f,i)=>({name:`${photoViews[i]||"front"}: ${f.name.slice(0,65)}`,view:photoViews[i]==="back"?"back":"front",kind:"reference",data:await imageToDataUrl(f)})));
     const {error:saveErr}=await client.from("garment_designs").insert({name:draft.name,category:draft.category,status:"draft",spec:{...draft.spec,notes:`${draft.spec.notes}\nPHOTO ANALYSIS (UNVERIFIED): ${draft.uncertainty.join("; ")}`},sketches});
     if(saveErr)throw new Error(saveErr.message);
     setSaved(true);
   }catch(e){setError(e instanceof Error?e.message:"Could not save");}
   finally{setBusy(false);}
 }
 return <div className="space-y-8">
  <header><p className="text-xs uppercase tracking-[0.3em] text-gold">Atelier · Image Recognition</p><h1 className="mt-3 font-serif text-4xl text-ivory">Photo to Template</h1><p className="mt-3 max-w-3xl text-sm text-ivory/65">Upload front, back and side photographs. AI proposes editable garment details, then you review and save a Design Studio draft. Images are analyzed by the configured vision provider. On Save Draft, compressed reference copies are attached to the design so the originals remain visible in Design Studio.</p></header>
  <section className="border border-gold/20 bg-noir-soft/40 p-5 space-y-4">
   <label className="block text-xs uppercase tracking-widest text-gold">Reference photographs (1–4)</label>
   <input aria-label="Select garment images" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e=>onFiles(e.target.files)} className={input}/>
   {files.length>0 && <div className="grid gap-3 sm:grid-cols-4">{files.map((f,i)=><div key={i} className="border border-gold/20 p-2 text-xs text-ivory/70"><p className="truncate">{f.name}</p><select className={input} aria-label={`View for ${f.name}`} value={photoViews[i]||"front"} onChange={e=>setPhotoViews(v=>v.map((x,j)=>i===j?e.target.value as "front"|"back"|"side":x))}><option value="front">Front photo</option><option value="back">Back photo</option><option value="side">Side photo</option></select></div>)}</div>}
   <div className="flex flex-wrap gap-3"><button className={button} onClick={()=>{setDraft(RUBY_SAMPLE);setError("");setSaved(false)}} disabled={busy}>Load Ruby Sample Draft</button><button className={button} onClick={analyze} disabled={busy||!files.length}>{busy?"Working…":"Analyze Photos & Generate Draft"}</button></div>
  </section>
  {error && <p role="alert" className="border border-red-500/40 p-4 text-sm text-red-300">{error}</p>}
  {draft && <section className="space-y-5 border border-gold/20 p-5">
   <div><h2 className="font-serif text-2xl text-ivory">Editable design proposal</h2><p className="mt-2 text-xs text-gold">{draft.warning}</p></div>
   <label className="block space-y-2 text-sm text-ivory/70">Design name<input className={input} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
   <label className="block space-y-2 text-sm text-ivory/70">Category<select className={input} value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}>{["designer-blouses","salwar-suits","sarees","shapewear","lingerie","loungewear"].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{(["neckline","backNeck","sleeve","cut","closure","fabric","lining","embroidery"] as const).map(k=><label key={k} className="space-y-2 text-sm text-ivory/70 block">{k}<input className={input} value={draft.spec[k]} onChange={e=>setDraft({...draft,spec:{...draft.spec,[k]:e.target.value}})}/></label>)}</div>
   <p className="text-xs text-ivory/60">Photo analysis proposes style only. Size charts, measured pattern pieces, cutting approval, production batches and QC must be generated through their dedicated verified workflows.</p>
   <label className="block space-y-2 text-sm text-ivory/70">Notes<textarea className={input} value={draft.spec.notes} onChange={e=>setDraft({...draft,spec:{...draft.spec,notes:e.target.value}})}/></label>
   {draft.uncertainty.length>0&&<div><p className="text-sm text-gold">Check before production</p><ul className="list-disc pl-6 text-sm text-ivory/70">{draft.uncertainty.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
   <button className={button} onClick={save} disabled={busy||saved}>{saved?"Draft saved":"Save Draft to Design Studio"}</button>
   {saved&&<p className="text-sm text-gold">Saved as draft. <Link href="/admin/design-studio" className="underline">Open Design Studio</Link> to verify measurements and create production documents.</p>}
  </section>}
 </div>;
}
