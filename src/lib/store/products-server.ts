import "server-only";
import { unstable_cache } from "next/cache";
import { isStoreConfigured, mutate, rows } from "./neon";
import type { StoreOrder, StoreProduct } from "./types";

export const STORE_TAG = "store";

const PRODUCT_COLUMNS = `p.id, p.slug, p.name, p.category, p.subtitle, p.description, p.price, p.compare_at_price,
  p.colors, p.sizes, p.features, p.is_active, p.sort_order, p.created_at,
  coalesce((select json_agg(json_build_object('id', i.id, 'width', i.width, 'height', i.height) order by i.position, i.created_at)
            from store.product_images i where i.product_id = p.id), '[]'::json) as images`;

const ORDER = `order by p.sort_order, p.created_at desc`;

/** Live products for the website (all, or one category). Empty when the store DB isn't connected. */
export const getLiveProducts = unstable_cache(
  async (category?: string): Promise<StoreProduct[]> => {
    if (!isStoreConfigured()) return [];
    try {
      return category
        ? await rows<StoreProduct>(`select ${PRODUCT_COLUMNS} from store.products p where p.is_active and p.category = $1 ${ORDER}`, [category])
        : await rows<StoreProduct>(`select ${PRODUCT_COLUMNS} from store.products p where p.is_active ${ORDER}`);
    } catch (e) {
      console.error("[store] products", e);
      return [];
    }
  },
  ["store-live-products-v1"],
  { tags: [STORE_TAG], revalidate: 120 },
);

export const getLiveProduct = unstable_cache(
  async (slug: string): Promise<StoreProduct | null> => {
    if (!isStoreConfigured()) return null;
    try {
      const r = await rows<StoreProduct>(`select ${PRODUCT_COLUMNS} from store.products p where p.is_active and p.slug = $1`, [slug]);
      return r[0] ?? null;
    } catch (e) {
      console.error("[store] product", e);
      return null;
    }
  },
  ["store-live-product-v1"],
  { tags: [STORE_TAG], revalidate: 120 },
);

/** Admin: every product including drafts. */
export const adminListProducts = () => rows<StoreProduct>(`select ${PRODUCT_COLUMNS} from store.products p ${ORDER}`);

export const adminGetProduct = async (id: string) =>
  (await rows<StoreProduct>(`select ${PRODUCT_COLUMNS} from store.products p where p.id = $1::uuid`, [id]))[0] ?? null;

export type ProductInput = {
  slug: string;
  name: string;
  category: string;
  subtitle: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  colors: StoreProduct["colors"];
  sizes: string[];
  features: string[];
  is_active: boolean;
  sort_order: number;
};

export async function adminCreateProduct(p: ProductInput) {
  const r = await mutate<{ id: string }>(
    `insert into store.products (slug, name, category, subtitle, description, price, compare_at_price, colors, sizes, features, is_active, sort_order)
     values ($1, $2, $3, $4, $5, $6::int, $7::int, $8::jsonb, $9::jsonb, $10::jsonb, $11::boolean, $12::int) returning id`,
    [p.slug, p.name, p.category, p.subtitle, p.description, p.price, p.compare_at_price, p.colors, p.sizes, p.features, p.is_active, p.sort_order],
  );
  return r[0]?.id ?? null;
}

export async function adminUpdateProduct(id: string, p: ProductInput) {
  const r = await mutate<{ id: string }>(
    `update store.products set slug = $2, name = $3, category = $4, subtitle = $5, description = $6, price = $7::int,
       compare_at_price = $8::int, colors = $9::jsonb, sizes = $10::jsonb, features = $11::jsonb, is_active = $12::boolean,
       sort_order = $13::int, updated_at = now()
     where id = $1::uuid returning id`,
    [id, p.slug, p.name, p.category, p.subtitle, p.description, p.price, p.compare_at_price, p.colors, p.sizes, p.features, p.is_active, p.sort_order],
  );
  return r.length > 0;
}

export async function adminDeleteProduct(id: string) {
  const r = await mutate<{ id: string }>(`delete from store.products where id = $1::uuid returning id`, [id]);
  return r.length > 0;
}

export async function adminAddImage(productId: string, img: { mime: string; data: string; width: number; height: number }) {
  const r = await mutate<{ id: string }>(
    `insert into store.product_images (product_id, position, mime, data, width, height)
     values ($1::uuid, coalesce((select max(position) + 1 from store.product_images where product_id = $1::uuid), 0), $2, decode($3, 'base64'), $4::int, $5::int)
     returning id`,
    [productId, img.mime, img.data, img.width, img.height],
  );
  return r[0]?.id ?? null;
}

export async function adminDeleteImage(imageId: string) {
  const r = await mutate<{ id: string }>(`delete from store.product_images where id = $1::uuid returning id`, [imageId]);
  return r.length > 0;
}

/** Sets the photo order (first = cover) for a product. */
export async function adminOrderImages(productId: string, ids: string[]) {
  await mutate(
    `update store.product_images i set position = o.ord - 1
     from jsonb_array_elements_text($2::jsonb) with ordinality as o(id, ord)
     where i.product_id = $1::uuid and i.id = o.id::uuid returning i.id`,
    [productId, ids],
  );
}

export async function getImage(id: string) {
  const r = await rows<{ mime: string; b64: string }>(`select mime, encode(data, 'base64') as b64 from store.product_images where id = $1::uuid`, [id]);
  return r[0] ?? null;
}

/** Products by id (live only) for pricing an order on the server. */
export const liveProductsByIds = (ids: string[]) =>
  rows<StoreProduct>(`select ${PRODUCT_COLUMNS} from store.products p where p.is_active and p.id = any(array(select jsonb_array_elements_text($1::jsonb))::uuid[])`, [ids]);

export async function createOrder(o: Omit<StoreOrder, "id" | "status" | "created_at">) {
  const r = await mutate<{ id: string; order_no: string }>(
    `insert into store.orders (order_no, customer_name, phone, email, address, city, state, pincode, notes, items, subtotal, shipping, total, payment_method)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::int, $12::int, $13::int, $14) returning id, order_no`,
    [o.order_no, o.customer_name, o.phone, o.email, o.address, o.city, o.state, o.pincode, o.notes, o.items, o.subtotal, o.shipping, o.total, o.payment_method],
  );
  return r[0] ?? null;
}

export const adminListOrders = () =>
  rows<StoreOrder>(
    `select id, order_no, customer_name, phone, email, address, city, state, pincode, notes, items, subtotal, shipping, total,
            payment_method, status, created_at from store.orders order by created_at desc limit 500`,
  );

export async function adminSetOrderStatus(id: string, status: string) {
  const r = await mutate<{ id: string }>(`update store.orders set status = $2, updated_at = now() where id = $1::uuid returning id`, [id, status]);
  return r.length > 0;
}
