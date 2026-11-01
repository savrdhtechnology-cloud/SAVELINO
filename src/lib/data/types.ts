/** Shapes of the SAVLINO database (supabase/schema.sql), shared by the website and the CRM. */

export type Color = { name: string; hex: string };

export type Category = {
  id: string;
  slug: string;
  name: string;
  kicker: string;
  description: string;
  image_url: string;
  is_visible: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at?: string;
};

/** "photo" = raw upload from the CRM; "creative" = branded image generated from those photos. */
export type ImageKind = "photo" | "creative";

export type ProductImage = {
  id: string;
  product_id?: string;
  url: string;
  storage_path?: string | null;
  position: number;
  width: number | null;
  height: number | null;
  kind?: ImageKind;
};

/** How a raw photo sits inside a creative frame (fractions of the photo). */
export type Framing = { top: number; zoom: number; x: number; y: number };

/** Position and size of the logo and feature icons on a creative (offsets in design pixels). */
export type CreativeLayout = {
  showLogo: boolean;
  logoScale: number;
  logoX: number;
  logoY: number;
  showIcons: boolean;
  iconScale: number;
  iconGap: number;
  iconsX: number;
  iconsY: number;
};

/** Product Studio creative settings, saved on the product (products.creative). */
export type CreativeSettings = {
  brandLine: string;
  titleTop: string;
  titleBottom: string;
  tagline: string;
  features: string[];
  showColors: boolean;
  showSizes: boolean;
  showShopNow: boolean;
  hideFaces: boolean;
  singleStyle: "classic" | "elegant" | "mix";
  combo: boolean;
  singles: boolean;
  /** Generated items left out of the website, e.g. "combo" or "single:<image id>". */
  skip: string[];
  /** Also show the raw photos on the website after the creatives. */
  showRaw: boolean;
  /** Photo-inspired background tint controls (saved with each product). */
  backgroundAuto: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundSize: number;
  /** Logo & icon placement (optional — older products use the defaults). */
  layout?: Partial<CreativeLayout>;
  /** Framing per raw photo id. */
  framing: Record<string, Framing>;
};

export type ProductStatus = "draft" | "live" | "archived";

export type Product = {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  category_id: string | null;
  subtitle: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  colors: Color[];
  sizes: string[];
  features: string[];
  stock: number;
  status: ProductStatus;
  sort_order: number;
  created_at: string;
  updated_at?: string;
  images: ProductImage[];
  creative?: Partial<CreativeSettings> | null;
  /** Website only: true when images are generated creatives (set by the catalogue loader). */
  generated?: boolean;
};

export type OrderItem = { productId: string; slug: string; name: string; price: number; size: string; color: string; qty: number };

export const ORDER_STATUSES = ["new", "payment_review", "processing", "stitching", "qc", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  payment_review: "Payment review",
  processing: "Processing",
  stitching: "Stitching",
  qc: "QC",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type PaymentStatus = "pending" | "verified" | "rejected" | "refunded";

export type Order = {
  id: string;
  order_no: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  payment_method: "cod" | "upi";
  payment_status: PaymentStatus;
  status: OrderStatus;
  tracking: string;
  internal_note: string;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  order_id: string;
  method: "upi" | "cod" | "bank" | "card" | "cash";
  amount: number;
  reference: string;
  status: PaymentStatus;
  note: string;
  verified_at: string | null;
  created_at: string;
  orders?: Pick<Order, "order_no" | "customer_name" | "phone" | "total"> | null;
};

export type Profile = { id: string; email: string | null; full_name: string; role: "none" | "staff" | "admin"; created_at: string };

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "32", "34", "36", "38", "40", "42", "44", "Free size"];

export const COLOR_PRESETS: Color[] = [
  { name: "Rani Pink", hex: "#D6246E" },
  { name: "Maroon", hex: "#7A1F2B" },
  { name: "Red", hex: "#C0172B" },
  { name: "Coral", hex: "#F0663A" },
  { name: "Mustard", hex: "#F2A900" },
  { name: "Gold", hex: "#C9A13B" },
  { name: "Champagne", hex: "#E8D9B5" },
  { name: "Ivory", hex: "#F6F0E1" },
  { name: "Teal Blue", hex: "#1C7FA6" },
  { name: "Peacock Blue", hex: "#0F4C81" },
  { name: "Navy", hex: "#1B2A4A" },
  { name: "Bottle Green", hex: "#1F7A3A" },
  { name: "Emerald", hex: "#1E5E3A" },
  { name: "Lavender", hex: "#A68BC9" },
  { name: "Purple", hex: "#5B2A6E" },
  { name: "Black", hex: "#141414" },
];

export const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
