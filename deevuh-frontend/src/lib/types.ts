/**
 * Shared TypeScript interfaces for API data shapes.
 * These match the backend Prisma models / API response structures.
 * Single source of truth for the frontend — used by pages, components, and the API client.
 */

// ─── Products ───

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  price: number | null;
  stockQuantity: number;
}

export interface ProductSummary {
  slug: string;
  name: string;
  basePrice: number;
  compareAtPrice: number | null;
  images: string[];
  avgRating: number;
  reviewCount: number;
  category: { name: string; slug: string };
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  basePrice: number;
  compareAtPrice: number | null;
  images: string[];
  category: { name: string; slug: string };
  variants: ProductVariant[];
  avgRating: number;
  reviewCount: number;
  occasion: string | null;
  fabric: string | null;
  careInstructions: string | null;
}

// ─── Cart ───

export interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[];
    basePrice: number;
  };
  variant: {
    id: string;
    size: string;
    color: string;
    price: number | null;
    stockQuantity: number;
  };
  unitPrice: number;
  totalPrice: number;
}

export interface CartData {
  id?: string;
  items: CartItem[];
  subtotal: number;
  itemCount?: number;
}

// ─── Orders ───

export interface OrderItem {
  productName: string;
  variantSize: string;
  variantColor: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productImage: string | null;
}

export interface OrderAddress {
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
  address: OrderAddress | null;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

// ─── User & Auth ───

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  loyaltyPoints?: number;
  loyaltyTier?: string;
  createdAt?: string;
}

export interface AuthTokens {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Address {
  id: string;
  label: string;
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

// ─── Wishlist ───

export interface WishlistItem {
  id: string;
  product: {
    slug: string;
    name: string;
    basePrice: number;
    compareAtPrice: number | null;
    images: string[];
    avgRating: number;
    reviewCount: number;
    category: { name: string };
  };
}

// ─── Loyalty ───

export interface LoyaltyInfo {
  points: number;
  tier: string;
}

// ─── Admin ───

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  recentOrders: AdminOrder[];
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
  items?: { length: number }[];
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  images: string[];
  isActive: boolean;
  category: { name: string } | null;
  variants: { stockQuantity: number }[];
}

export interface AdminCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  createdAt: string;
  _count?: { orders: number };
}

export interface PromoCode {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number | null;
  maxUsageTotal: number | null;
  isActive: boolean;
  expiresAt: string | null;
  _count?: { usages: number };
}

// ─── Payments ───

export interface CreateOrderResponse {
  order: { id: string; orderNumber: string };
  razorpay: {
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
  } | null;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// ─── Promo Validation ───

export interface PromoValidationResult {
  message: string;
  discountAmount: number;
}
