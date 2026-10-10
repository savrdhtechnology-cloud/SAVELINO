/**
 * Domain types mirroring supabase/migrations/0001_init.sql.
 * Regenerate precise types with `supabase gen types typescript` once the project is provisioned.
 */
export type UserRole = "customer" | "partner" | "admin";

export type OrderStatus =
  | "pending_payment"
  | "payment_review"
  | "confirmed"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type CommissionStatus = "pending" | "approved" | "paid" | "rejected";
export type PartnerStatus = "pending" | "approved" | "suspended";
export type ReturnStatus = "requested" | "approved" | "received" | "refunded" | "exchanged" | "rejected";
