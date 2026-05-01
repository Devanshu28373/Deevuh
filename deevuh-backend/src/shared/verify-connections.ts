import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import { Resend } from 'resend';
import { MeiliSearch } from 'meilisearch';
import Razorpay from 'razorpay';
import axios from 'axios';
import env from '../config/env';

async function verifyAWS() {
  console.log('🔍 Checking AWS S3...');
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    console.warn('⚠️ AWS credentials missing, skipping.');
    return;
  }
  const s3 = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  try {
    await s3.send(new ListBucketsCommand({}));
    console.log('✅ AWS S3: Connected');
  } catch (error: any) {
    console.error('❌ AWS S3: Connection failed:', error.message);
  }
}

async function verifyResend() {
  console.log('🔍 Checking Resend...');
  if (!env.RESEND_API_KEY) {
    console.warn('⚠️ Resend API key missing, skipping.');
    return;
  }
  const resend = new Resend(env.RESEND_API_KEY);
  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: 'delivered@resend.dev',
      subject: 'Deevuh Connection Test',
      html: '<p>Testing connection to Resend API</p>',
    });
    if (error) throw error;
    console.log('✅ Resend: Connected');
  } catch (error: any) {
    console.error('❌ Resend: Connection failed:', error.message);
  }
}

async function verifyMeilisearch() {
  console.log('🔍 Checking Meilisearch...');
  const client = new MeiliSearch({
    host: env.MEILISEARCH_HOST,
    apiKey: env.MEILISEARCH_API_KEY,
  });
  try {
    const health = await client.isHealthy();
    if (health) console.log('✅ Meilisearch: Healthy');
    else console.warn('⚠️ Meilisearch: Unhealthy');
  } catch (error: any) {
    console.error('❌ Meilisearch: Connection failed:', error.message);
  }
}

async function verifyRazorpay() {
  console.log('🔍 Checking Razorpay...');
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    console.warn('⚠️ Razorpay credentials missing, skipping.');
    return;
  }
  const rzp = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  try {
    // Try to fetch one order to verify keys
    await rzp.orders.all({ count: 1 });
    console.log('✅ Razorpay: Connected');
  } catch (error: any) {
    console.error('❌ Razorpay: Connection failed:', error.message);
  }
}

async function verifyShiprocket() {
  console.log('🔍 Checking Shiprocket...');
  if (!env.SHIPROCKET_EMAIL || !env.SHIPROCKET_PASSWORD) {
    console.warn('⚠️ Shiprocket credentials missing, skipping.');
    return;
  }
  try {
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: env.SHIPROCKET_EMAIL,
      password: env.SHIPROCKET_PASSWORD,
    });
    if (response.data.token) {
      console.log('✅ Shiprocket: Authenticated');
    }
  } catch (error: any) {
    console.error('❌ Shiprocket: Authentication failed:', error.response?.data?.message || error.message);
  }
}

async function runAll() {
  console.log('--- DEEVUH SERVICE CONNECTIVITY CHECK ---');
  await verifyAWS();
  await verifyResend();
  await verifyMeilisearch();
  await verifyRazorpay();
  await verifyShiprocket();
  console.log('------------------------------------------');
}

runAll();
