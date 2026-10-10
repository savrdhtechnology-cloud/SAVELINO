import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedCategories = ["designer-blouses","salwar-suits","sarees","shapewear","lingerie","loungewear"];
const allowedNecks = ["round","sweetheart","v","boat","square","u","high"];
const allowedBacks = ["round","deep-u","v","square","keyhole"];
const allowedSleeves = ["sleeveless","cap","short","elbow","three-quarter","puff"];
const allowedCuts = ["darted","princess","katori"];
const allowedClosures = ["front-hooks","back-hooks","side-zip","back-zip"];
const allowedDarts = ["bust","waist","side","back-waist"];
const pick = (v: unknown, options: string[], fallback: string) => typeof v === "string" && options.includes(v) ? v : fallback;
const clean = (v: unknown, max=400) => typeof v === "string" ? v.slice(0,max) : "";

export async function POST(req: Request) {
  const session = await getSessionContext();
  if (!session.configured || !session.user || session.role !== "admin") return NextResponse.json({ error: "Admin login required." }, { status: 403 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Image analysis provider is not configured. Add OPENAI_API_KEY as a server-side Vercel environment variable. No template has been generated." }, { status: 503 });
  const body: unknown = await req.json().catch(() => null);
  const images = (body as { images?: unknown } | null)?.images;
  if (!Array.isArray(images) || images.length < 1 || images.length > 4 ||
      !images.every(x => typeof x === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x) && x.length < 2400000)) {
    return NextResponse.json({ error: "Upload 1–4 JPEG, PNG or WebP images, max ~1.7 MB each." }, { status: 400 });
  }
  const payload = {
    model: process.env.SAVLINO_VISION_MODEL || "gpt-4.1-mini",
    response_format: { type: "json_object" },
    temperature: 0.1,
    messages: [{
      role: "system",
      content: "You are a clothing design reference analyst. Return only a JSON object using visual evidence. Do not assume exact measurements or back details when absent. Never invent precision. Fields: name(string), category(one of designer-blouses,salwar-suits,sarees,shapewear,lingerie,loungewear), neckline(one of round,sweetheart,v,boat,square,u,high), backNeck(one of round,deep-u,v,square,keyhole), sleeve(one of sleeveless,cap,short,elbow,three-quarter,puff), cut(one of darted,princess,katori), darts(array of bust,waist,side,back-waist), closure(one of front-hooks,back-hooks,side-zip,back-zip), fabric(string), lining(string), embroidery(string), accessories(array of strings), colors(array of strings), instructions(string), notes(string), uncertainty(array of strings), confidence(string). When not visible mark uncertainties; all inferred values need verification. Do not provide exact cutting dimensions. Long sleeves map to three-quarter as an approximate editor option and explicitly note the limitation."
    },{
      role: "user",
      content: [
        {type:"text",text:"Analyze garment style in these photos. They may show different views of one garment. Generate ONE editable draft, not a production-approved pattern."},
        ...images.map((image_url: string) => ({ type:"image_url", image_url: {url:image_url,detail:"low"} }))
      ]
    }]
  };
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST", headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify(payload), signal:AbortSignal.timeout(60000), cache:"no-store"
    });
  } catch {
    return NextResponse.json({error:"Image analysis service could not be reached. Please retry."},{status:502});
  }
  if (!response.ok) return NextResponse.json({error:"Image analysis unavailable. No design was saved."},{status:502});
  const raw = await response.json().catch(() => null);
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw?.choices?.[0]?.message?.content); }
  catch { return NextResponse.json({error:"Analysis response invalid. Retry with clearer images."},{status:502}); }
  const spec = {
    neckline:pick(parsed.neckline,allowedNecks,"round"),
    backNeck:pick(parsed.backNeck,allowedBacks,"round"),
    sleeve:pick(parsed.sleeve,allowedSleeves,"short"),
    cut:pick(parsed.cut,allowedCuts,"darted"),
    darts:Array.isArray(parsed.darts) ? parsed.darts.filter((x:unknown) => typeof x === "string" && allowedDarts.includes(x)).slice(0,4) : [],
    closure:pick(parsed.closure,allowedClosures,"back-hooks"),
    fabric:clean(parsed.fabric,80)||"To verify",
    lining:clean(parsed.lining,80)||"To verify",
    embroidery:clean(parsed.embroidery,80)||"To verify",
    accessories:Array.isArray(parsed.accessories) ? parsed.accessories.filter((x:unknown) => typeof x === "string").slice(0,8).map((x:string) => x.slice(0,60)) : [],
    colors:Array.isArray(parsed.colors) ? parsed.colors.filter((x:unknown) => typeof x === "string").slice(0,6).map((x:string) => x.slice(0,50)) : [],
    instructions:clean(parsed.instructions,1500),
    notes:clean(parsed.notes,1000)
  };
  return NextResponse.json({
    name:clean(parsed.name,100)||"Photo reference design",
    category:pick(parsed.category,allowedCategories,"designer-blouses"),
    spec,
    uncertainty:Array.isArray(parsed.uncertainty) ? parsed.uncertainty.filter((x:unknown)=>typeof x==="string").slice(0,10) : [],
    confidence:clean(parsed.confidence,80),
    warning:"Style analysis only. Confirm measurements, back construction, fabric, grading and cutting with a pattern master before production."
  });
}
