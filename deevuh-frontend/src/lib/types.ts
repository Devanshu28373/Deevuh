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
  sku?: string;
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
  id?: string;
  productId?: string;
  variantId?: string;
  productName: string;
  variantSize: string;
  variantColor: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productImage: string | null;
  returnStatus?: string;
}

export interface OrderAddress {
  recipientName?: string;
  fullName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  total: number;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  paymentMethod: string;
  razorpayPaymentId?: string;
  loyaltyPointsRedeemed?: number;
  loyaltyPointsEarned?: number;
  cancelReason?: string;
  notes?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: string;
  cancelledAt?: string;
  deliveredAt?: string;
  items: OrderItem[];
  address: OrderAddress | null;
  user?: { id?: string; firstName: string; lastName: string; email: string; phone?: string };
  promoCode?: { code: string; type: string; discountValue: number } | null;
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
  fullName?: string;
  recipientName?: string;
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
  paymentStatus?: string;
  paymentMethod: string;
  total: number;
  subtotal?: number;
  discountAmount?: number;
  shippingAmount?: number;
  taxAmount?: number;
  razorpayPaymentId?: string;
  loyaltyPointsRedeemed?: number;
  trackingNumber?: string;
  cancelReason?: string;
  notes?: string;
  createdAt: string;
  cancelledAt?: string;
  user?: { id?: string; firstName: string; lastName: string; email: string; phone?: string };
  items?: OrderItem[];
  address?: OrderAddress | null;
  promoCode?: { code: string; type: string; discountValue: number } | null;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  basePrice: number;
  compareAtPrice?: number;
  images: string[];
  isActive: boolean;
  isFeatured?: boolean;
  avgRating?: number;
  reviewCount?: number;
  category: { name: string } | null;
  variants: ProductVariant[];
}

export interface AdminCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  createdAt: string;
  _count?: { orders: number; reviews?: number };
  addresses?: Address[];
  orders?: OrderSummary[];
}

export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  type: string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number | null;
  usageLimit: number | null;
  perUserLimit?: number;
  usageCount: number;
  isActive: boolean;
  startsAt?: string;
  expiresAt: string | null;
  createdAt?: string;
  _count?: { promoUsages: number };
}

export interface AdminAnalytics {
  period: { days: number; since: string };
  revenueByDay: { date: string; revenue: number; orders: number }[];
  ordersByStatus: { status: string; count: number }[];
  topProducts: { name: string; id: string; unitsSold: number; revenue: number }[];
  newCustomers: number;
  lowStockVariants: (ProductVariant & { product: { name: string; slug: string; images: string[] } })[];
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

// ─── Pagination ───

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: { pagination: PaginationMeta };
}
