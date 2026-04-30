import env from '../../config/env';
import redis from '../../config/redis';
import prisma from '../../config/database';
import { Errors } from '../../middleware/errorHandler';

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';
const SHIPROCKET_TOKEN_KEY = 'shiprocket:auth_token';

/**
 * Get or refresh Shiprocket auth token (cached in Redis for 9 days).
 */
async function getAuthToken(): Promise<string> {
  const cached = await redis.get(SHIPROCKET_TOKEN_KEY);
  if (cached) return cached;

  const response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: env.SHIPROCKET_EMAIL,
      password: env.SHIPROCKET_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw Errors.internal('Shiprocket authentication failed');
  }

  const data = await response.json() as { token: string };
  // Cache token for 9 days (Shiprocket tokens expire in 10 days)
  await redis.set(SHIPROCKET_TOKEN_KEY, data.token, 'EX', 9 * 24 * 60 * 60);
  return data.token;
}

async function shiprocketFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getAuthToken();
  const response = await fetch(`${SHIPROCKET_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Shiprocket API error (${endpoint}):`, error);
    throw Errors.internal('Shipping service error');
  }

  return response.json() as Promise<any>;
}

/**
 * Check if delivery is serviceable for a given pincode.
 */
export async function checkServiceability(pincode: string, weight: number = 0.5) {
  const data = await shiprocketFetch(
    `/courier/serviceability/?pickup_postcode=110001&delivery_postcode=${pincode}&weight=${weight}&cod=1`
  );
  return {
    isServiceable: data.data?.available_courier_companies?.length > 0,
    estimatedDays: data.data?.available_courier_companies?.[0]?.estimated_delivery_days || null,
    couriers: (data.data?.available_courier_companies || []).map((c: any) => ({
      name: c.courier_name,
      rate: c.rate,
      estimatedDays: c.estimated_delivery_days,
      cod: c.cod,
    })),
  };
}

/**
 * Create a shipment on Shiprocket after payment is confirmed.
 */
export async function createShipment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      address: true,
      user: { select: { email: true, firstName: true, lastName: true, phone: true } },
    },
  });

  if (!order || !order.address) throw Errors.notFound('Order');

  const shiprocketOrder = await shiprocketFetch('/orders/create/adhoc', {
    method: 'POST',
    body: JSON.stringify({
      order_id: order.orderNumber,
      order_date: order.createdAt.toISOString().split('T')[0],
      pickup_location: 'Primary',
      billing_customer_name: order.user.firstName,
      billing_last_name: order.user.lastName,
      billing_address: order.address.addressLine1,
      billing_address_2: order.address.addressLine2 || '',
      billing_city: order.address.city,
      billing_pincode: order.address.pincode,
      billing_state: order.address.state,
      billing_country: 'India',
      billing_email: order.user.email,
      billing_phone: order.address.phone,
      shipping_is_billing: true,
      order_items: order.items.map(item => ({
        name: item.productName,
        sku: `${item.variantSize}-${item.variantColor}`,
        units: item.quantity,
        selling_price: (item.unitPrice / 100).toFixed(2),
        hsn: '',
      })),
      payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
      sub_total: (order.total / 100).toFixed(2),
      length: 30,
      breadth: 20,
      height: 10,
      weight: 0.5,
    }),
  });

  // Update order with Shiprocket details
  await prisma.order.update({
    where: { id: orderId },
    data: {
      shiprocketOrderId: String(shiprocketOrder.order_id),
      status: 'PROCESSING',
    },
  });

  return shiprocketOrder;
}

/**
 * Get tracking info for an order from Shiprocket.
 */
export async function getTrackingStatus(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !order.shiprocketOrderId) {
    throw Errors.badRequest('No shipment found for this order');
  }

  const data = await shiprocketFetch(
    `/courier/track?order_id=${order.shiprocketOrderId}`
  );

  return {
    currentStatus: data.tracking_data?.track_status || 'Unknown',
    shipmentId: data.tracking_data?.shipment_id,
    awb: data.tracking_data?.awb_code,
    courierName: data.tracking_data?.courier_name,
    estimatedDelivery: data.tracking_data?.edd,
    activities: (data.tracking_data?.shipment_track_activities || []).map((a: any) => ({
      date: a.date,
      status: a.activity,
      location: a.location,
    })),
  };
}
