/** Shared (client + server) shapes for the website store on Neon. */

export type StoreColor = { name: string; hex: string };
export type StoreImage = { id: string; width: number | null; height: number | null };

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  subtitle: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  colors: StoreColor[];
  sizes: string[];
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  images: StoreImage[];
};

export type OrderItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  size: string;
  color: string;
  qty: number;
};

export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "cancelled";
export const ORDER_STATUSES: OrderStatus[] = ["new", "confirmed", "shipped", "delivered", "cancelled"];

export type StoreOrder = {
  id: string;
  order_no: string;
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
  total: number;
  payment_method: "cod" | "whatsapp";
  status: OrderStatus;
  created_at: string;
};

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "32", "34", "36", "38", "40", "42", "44", "Free size"];

export const COLOR_PRESETS: StoreColor[] = [
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
  { name: "Black", hex: "#141414" },
];

export const imageUrl = (id: string) => `/api/store/image/${id}`;

export const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
