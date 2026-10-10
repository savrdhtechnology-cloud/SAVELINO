/**
 * Single source of truth for the Customer Portal, Partner Portal and Admin CRM.
 * Each section maps to a table protected by Row Level Security
 * (see supabase/migrations/0001_init.sql). Pages render real rows only —
 * nothing is ever fabricated when the backend is not connected.
 */

export type ColumnFormat = "text" | "date" | "currency" | "status";

export type Column = { key: string; label: string; format?: ColumnFormat };

export type PortalSection = {
  slug: string;
  title: string;
  description: string;
  /** Table or view queried with the signed-in user's session (RLS scopes the rows). */
  table: string;
  columns: Column[];
  orderBy?: string;
  empty: string;
  /**
   * Scopes rows to the viewer even for staff accounts whose RLS policies can see more.
   * "user" filters by auth user id; "partner" by the viewer's partner record id.
   */
  owner?: { column: string; by: "user" | "partner" };
};

export const customerSections: PortalSection[] = [
  {
    slug: "profile",
    owner: { column: "id", by: "user" },
    title: "Profile",
    description: "Your name, contact details and saved measurements.",
    table: "profiles",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "created_at", label: "Member since", format: "date" },
    ],
    empty: "Your profile will appear here once your account is set up.",
  },
  {
    slug: "orders",
    owner: { column: "user_id", by: "user" },
    title: "Order history",
    description: "Every SAVLINO order you have placed.",
    table: "orders",
    columns: [
      { key: "order_number", label: "Order" },
      { key: "created_at", label: "Placed", format: "date" },
      { key: "status", label: "Status", format: "status" },
      { key: "total_amount", label: "Total", format: "currency" },
    ],
    orderBy: "created_at",
    empty: "You have not placed any orders yet.",
  },
  {
    slug: "tracking",
    owner: { column: "user_id", by: "user" },
    title: "Order tracking",
    description: "Live shipment status for orders on their way to you.",
    table: "shipments",
    columns: [
      { key: "carrier", label: "Carrier" },
      { key: "tracking_number", label: "Tracking no." },
      { key: "status", label: "Status", format: "status" },
      { key: "shipped_at", label: "Shipped", format: "date" },
    ],
    orderBy: "created_at",
    empty: "No shipments to track right now.",
  },
  {
    slug: "wishlist",
    owner: { column: "user_id", by: "user" },
    title: "Wishlist",
    description: "Pieces you have saved for later.",
    table: "wishlist_items_view",
    columns: [
      { key: "product_name", label: "Piece" },
      { key: "collection_name", label: "Collection" },
      { key: "created_at", label: "Saved", format: "date" },
    ],
    orderBy: "created_at",
    empty: "Your wishlist is empty.",
  },
  {
    slug: "addresses",
    owner: { column: "user_id", by: "user" },
    title: "Saved addresses",
    description: "Delivery addresses for faster checkout.",
    table: "addresses",
    columns: [
      { key: "label", label: "Label" },
      { key: "line1", label: "Address" },
      { key: "city", label: "City" },
      { key: "postal_code", label: "PIN code" },
    ],
    empty: "No saved addresses yet.",
  },
  {
    slug: "returns",
    owner: { column: "user_id", by: "user" },
    title: "Returns & exchanges",
    description: "Requests you have raised and their progress.",
    table: "return_requests",
    columns: [
      { key: "created_at", label: "Requested", format: "date" },
      { key: "type", label: "Type" },
      { key: "reason", label: "Reason" },
      { key: "status", label: "Status", format: "status" },
    ],
    orderBy: "created_at",
    empty: "You have no return or exchange requests.",
  },
];

export const partnerSections: PortalSection[] = [
  {
    slug: "referrals",
    owner: { column: "user_id", by: "user" },
    title: "Referral code & link",
    description: "Your personal code and shareable link.",
    table: "partners",
    columns: [
      { key: "referral_code", label: "Referral code" },
      { key: "status", label: "Status", format: "status" },
      { key: "approved_at", label: "Approved", format: "date" },
    ],
    empty: "Your referral code is issued once your partner application is approved.",
  },
  {
    slug: "orders",
    owner: { column: "partner_id", by: "partner" },
    title: "Referred customer orders",
    description: "Orders placed using your code or link.",
    table: "partner_referred_orders_view",
    columns: [
      { key: "order_number", label: "Order" },
      { key: "created_at", label: "Placed", format: "date" },
      { key: "order_status", label: "Status", format: "status" },
      { key: "order_total", label: "Order value", format: "currency" },
    ],
    orderBy: "created_at",
    empty: "No referred orders yet.",
  },
  {
    slug: "commissions",
    owner: { column: "partner_id", by: "partner" },
    title: "Commission earnings",
    description: "Commission on each verified referred order, and its status.",
    table: "commissions",
    columns: [
      { key: "created_at", label: "Date", format: "date" },
      { key: "amount", label: "Commission", format: "currency" },
      { key: "status", label: "Status", format: "status" },
    ],
    orderBy: "created_at",
    empty: "No commission recorded yet.",
  },
  {
    slug: "payouts",
    owner: { column: "partner_id", by: "partner" },
    title: "Payout history",
    description: "Payouts made to your registered account.",
    table: "payouts",
    columns: [
      { key: "paid_at", label: "Paid on", format: "date" },
      { key: "amount", label: "Amount", format: "currency" },
      { key: "reference", label: "Reference" },
      { key: "status", label: "Status", format: "status" },
    ],
    orderBy: "created_at",
    empty: "No payouts yet.",
  },
];

export const adminModules: PortalSection[] = [
  { slug: "products", title: "Products", description: "Catalogue, pricing and media.", table: "products", columns: [{ key: "name", label: "Name" }, { key: "price", label: "Price", format: "currency" }, { key: "is_active", label: "Active" }], orderBy: "created_at", empty: "No products yet." },
  { slug: "collections", title: "Collections", description: "Collection pages and merchandising.", table: "collections", columns: [{ key: "name", label: "Name" }, { key: "slug", label: "Slug" }, { key: "sort_order", label: "Order" }], empty: "No collections yet." },
  { slug: "inventory", title: "Inventory", description: "Stock by variant and size.", table: "inventory_view", columns: [{ key: "sku", label: "SKU" }, { key: "product_name", label: "Product" }, { key: "size", label: "Size" }, { key: "quantity", label: "Qty" }], empty: "No inventory records yet." },
  { slug: "orders", title: "Orders", description: "All orders and fulfilment status.", table: "orders", columns: [{ key: "order_number", label: "Order" }, { key: "created_at", label: "Placed", format: "date" }, { key: "status", label: "Status", format: "status" }, { key: "total_amount", label: "Total", format: "currency" }], orderBy: "created_at", empty: "No orders yet." },
  { slug: "customers", title: "Customers", description: "Customer accounts and profiles.", table: "profiles", columns: [{ key: "full_name", label: "Name" }, { key: "phone", label: "Phone" }, { key: "role", label: "Role" }, { key: "created_at", label: "Joined", format: "date" }], orderBy: "created_at", empty: "No customers yet." },
  { slug: "partners", title: "Partners", description: "Applications, approvals and referral codes.", table: "partners", columns: [{ key: "business_name", label: "Business" }, { key: "referral_code", label: "Code" }, { key: "status", label: "Status", format: "status" }], orderBy: "created_at", empty: "No partners yet." },
  { slug: "commissions", title: "Referral commission", description: "Approve, reject and settle commission.", table: "commissions", columns: [{ key: "created_at", label: "Date", format: "date" }, { key: "amount", label: "Amount", format: "currency" }, { key: "status", label: "Status", format: "status" }], orderBy: "created_at", empty: "No commission records yet." },
  { slug: "payments", title: "Payment verification", description: "Verify payments before orders are confirmed.", table: "payments", columns: [{ key: "created_at", label: "Date", format: "date" }, { key: "method", label: "Method" }, { key: "amount", label: "Amount", format: "currency" }, { key: "status", label: "Status", format: "status" }], orderBy: "created_at", empty: "No payments to verify." },
  { slug: "shipping", title: "Shipping", description: "Shipments, carriers and tracking.", table: "shipments", columns: [{ key: "carrier", label: "Carrier" }, { key: "tracking_number", label: "Tracking" }, { key: "status", label: "Status", format: "status" }], orderBy: "created_at", empty: "No shipments yet." },
  { slug: "analytics", title: "Analytics", description: "Sales, conversion and partner performance.", table: "admin_sales_daily_view", columns: [{ key: "day", label: "Day", format: "date" }, { key: "orders", label: "Orders" }, { key: "revenue", label: "Revenue", format: "currency" }], orderBy: "day", empty: "Analytics appear once orders are recorded." },
  { slug: "content", title: "Content management", description: "Homepage sections, lookbook and banners.", table: "content_blocks", columns: [{ key: "key", label: "Block" }, { key: "title", label: "Title" }, { key: "updated_at", label: "Updated", format: "date" }], orderBy: "updated_at", empty: "No content blocks yet." },
];
