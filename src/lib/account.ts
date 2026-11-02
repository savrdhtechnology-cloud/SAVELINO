export type CustomerProfile = { id: string; full_name: string; phone: string; email: string };
export type CustomerAddress = {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};
export type OrderItem = { productId: string; slug?: string; name: string; price: number; size?: string; color?: string; qty: number; preorder?: boolean };
export type MyOrder = {
  order_no: string;
  created_at: string;
  status: string;
  payment_method: "cod" | "upi";
  payment_status: string;
  tracking: string;
  preorder_state: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

/** The stages a customer sees, in order. */
export const ORDER_STEPS = ["Order placed", "Confirmed", "Being stitched", "Quality check", "Shipped", "Delivered"] as const;

/** Which stage an order is at (index into ORDER_STEPS), or -1 when cancelled. */
export function orderStage(status: string): number {
  switch (status) {
    case "new":
    case "payment_review":
      return 0;
    case "processing":
      return 1;
    case "stitching":
      return 2;
    case "qc":
      return 3;
    case "shipped":
      return 4;
    case "delivered":
      return 5;
    default:
      return -1;
  }
}

export function statusLabel(o: Pick<MyOrder, "status" | "payment_method" | "preorder_state">): string {
  if (o.status === "cancelled") return "Cancelled";
  if (o.status === "payment_review") return "Verifying your payment";
  if (o.status === "new" && o.preorder_state === "waiting") return "Pre-order received";
  if (o.status === "new") return "Order placed";
  return ORDER_STEPS[orderStage(o.status)] ?? o.status;
}

/** Only a path on this site may be used as a post-login destination. */
export function safeNext(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}
