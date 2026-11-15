// Email utility using nodemailer
import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export function createTransporter(config: EmailConfig) {
  const secure = config.port === 465 ? true : false;
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    auth: { user: config.user, pass: config.password },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export async function sendEmail(
  transporter: nodemailer.Transporter,
  options: EmailOptions,
  fromName: string,
  fromEmail: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// ── Shared branding helpers ──────────────────────────────────

interface BrandOptions {
  storeName?: string;
  logoUrl?: string;
  primaryColor?: string;
  siteUrl?: string;
}

function emailHeader(brand: BrandOptions) {
  const { storeName = 'Our store', logoUrl, primaryColor = '#7FAF8E', siteUrl = '' } = brand;
  const isDefaultLogo = !logoUrl || logoUrl === '/images/logo.png';

  return `
    <tr>
      <td style="text-align:center;padding:28px 0 20px;">
        <a href="${siteUrl}" style="text-decoration:none;display:inline-block;">
          ${isDefaultLogo
            ? `<h1 style="color:${primaryColor};margin:0;font-size:28px;font-family:'Segoe UI',sans-serif;">${storeName}</h1>`
            : `<img src="${logoUrl}" alt="${storeName}" style="max-height:56px;max-width:200px;object-fit:contain;display:block;margin:0 auto;" />`
          }
        </a>
      </td>
    </tr>`;
}

function emailFooter(brand: BrandOptions) {
  const { storeName = 'Our store', primaryColor = '#7FAF8E', siteUrl = '' } = brand;
  return `
    <tr>
      <td style="padding:20px 0;text-align:center;">
        <p style="color:#aaa;font-size:12px;margin:0;font-family:'Segoe UI',sans-serif;">
          © ${new Date().getFullYear()} ${storeName}. All rights reserved.<br>
          <a href="${siteUrl}" style="color:${primaryColor};text-decoration:none;">${siteUrl.replace('https://', '')}</a>
        </p>
      </td>
    </tr>`;
}

function emailWrapper(content: string, brand: BrandOptions) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:16px;">
    ${emailHeader(brand)}
    <tr>
      <td style="background:#fff;border-radius:16px;padding:36px 30px;box-shadow:0 2px 10px rgba(0,0,0,0.07);">
        ${content}
      </td>
    </tr>
    ${emailFooter(brand)}
  </table>
</body>
</html>`;
}

// ── Email templates ──────────────────────────────────────────

export const emailTemplates = {

  registration: (data: { name: string; email: string }, brand: BrandOptions = {}) => {
    const { primaryColor = '#7FAF8E', siteUrl = '' } = brand;
    return {
      subject: `Welcome to ${brand.storeName || 'our store'}, ${data.name}!`,
      html: emailWrapper(`
        <h2 style="color:#333;margin:0 0 16px;font-size:22px;">Welcome, ${data.name}! 🎉</h2>
        <p style="color:#666;line-height:1.6;margin:0 0 16px;">
          Thank you for creating your account at ${brand.storeName || 'our store'}. We're thrilled to have you join our family!
        </p>
        <p style="color:#666;line-height:1.6;margin:0 0 28px;">
          Your account is now active and you can start shopping for the best products.
        </p>
        <div style="text-align:center;">
          <a href="${siteUrl}" style="display:inline-block;background:${primaryColor};color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">
            Start Shopping
          </a>
        </div>
      `, brand),
      text: `Welcome to ${brand.storeName || 'our store'}, ${data.name}!\n\nThank you for creating your account. Start shopping at ${siteUrl}`,
    };
  },

  orderConfirmation: (data: {
    name: string; orderNumber: string; total: string;
    items: Array<{ name: string; quantity: number; price: string }>;
    shippingAddress: string;
  }, brand: BrandOptions = {}) => {
    const { primaryColor = '#7FAF8E', siteUrl = '' } = brand;
    return {
      subject: `Order Confirmed! #${data.orderNumber} 📦`,
      html: emailWrapper(`
        <div style="text-align:center;margin-bottom:24px;">
          <div style="width:56px;height:56px;background:#E8F5E9;border-radius:50%;margin:0 auto 12px;line-height:56px;font-size:28px;">✓</div>
          <h2 style="color:#2E7D32;margin:0;font-size:20px;">Order Confirmed!</h2>
        </div>
        <p style="color:#666;margin:0 0 8px;">Hi ${data.name},</p>
        <p style="color:#666;margin:0 0 20px;">Your order has been placed successfully.</p>
        <div style="background:#F5F5F5;border-radius:12px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;color:#888;font-size:13px;">Order Number</p>
          <p style="margin:4px 0 0;color:#333;font-size:20px;font-weight:700;">#${data.orderNumber}</p>
        </div>
        <h3 style="color:#333;margin:0 0 12px;font-size:16px;">Order Summary</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          ${data.items.map(item => `
            <tr>
              <td style="padding:8px 0;color:#666;border-bottom:1px solid #eee;font-size:14px;">${item.name} × ${item.quantity}</td>
              <td style="padding:8px 0;color:#333;text-align:right;border-bottom:1px solid #eee;font-size:14px;">${item.price}</td>
            </tr>`).join('')}
          <tr>
            <td style="padding:12px 0;color:#333;font-weight:700;">Total</td>
            <td style="padding:12px 0;color:${primaryColor};font-weight:700;text-align:right;font-size:18px;">${data.total}</td>
          </tr>
        </table>
        <h3 style="color:#333;margin:20px 0 10px;font-size:16px;">Shipping Address</h3>
        <p style="color:#666;margin:0 0 24px;line-height:1.6;white-space:pre-line;font-size:14px;">${data.shippingAddress}</p>
        <div style="text-align:center;">
          <a href="${siteUrl}/account/orders" style="display:inline-block;background:${primaryColor};color:#fff;padding:13px 28px;border-radius:12px;text-decoration:none;font-weight:600;">Track Order</a>
        </div>
      `, brand),
      text: `Order Confirmed!\n\nHi ${data.name},\n\nYour order #${data.orderNumber} has been placed.\n\nTotal: ${data.total}\n\nTrack at ${siteUrl}/account/orders`,
    };
  },

  orderShipped: (data: { name: string; orderNumber: string; trackingNumber?: string }, brand: BrandOptions = {}) => {
    const { primaryColor = '#7FAF8E', siteUrl = '' } = brand;
    return {
      subject: `Your Order is on the Way! 🚚`,
      html: emailWrapper(`
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:48px;">🚚</div>
          <h2 style="color:#1976D2;margin:12px 0 0;font-size:20px;">Your Order is on the Way!</h2>
        </div>
        <p style="color:#666;margin:0 0 8px;">Hi ${data.name},</p>
        <p style="color:#666;margin:0 0 20px;">Good news! Your order <strong>#${data.orderNumber}</strong> has been shipped.</p>
        ${data.trackingNumber ? `
          <div style="background:#E3F2FD;border-radius:12px;padding:16px;text-align:center;margin-bottom:20px;">
            <p style="margin:0;color:#666;font-size:13px;">Tracking Number</p>
            <p style="margin:4px 0 0;color:#1976D2;font-size:18px;font-weight:700;font-family:monospace;">${data.trackingNumber}</p>
          </div>` : ''}
        <div style="text-align:center;margin-top:24px;">
          <a href="${siteUrl}/account/orders" style="display:inline-block;background:${primaryColor};color:#fff;padding:13px 28px;border-radius:12px;text-decoration:none;font-weight:600;">Track Order</a>
        </div>
      `, brand),
      text: `Your Order is on the Way!\n\nHi ${data.name},\n\nYour order #${data.orderNumber} has been shipped!\n\n${data.trackingNumber ? `Tracking: ${data.trackingNumber}` : ''}\n\nTrack at ${siteUrl}/account/orders`,
    };
  },

  passwordReset: (data: { name: string; resetLink: string }, brand: BrandOptions = {}) => {
    const { primaryColor = '#7FAF8E' } = brand;
    return {
      subject: `Reset Your Password 🔐`,
      html: emailWrapper(`
        <h2 style="color:#333;margin:0 0 16px;font-size:20px;">Reset Your Password</h2>
        <p style="color:#666;margin:0 0 8px;">Hi ${data.name},</p>
        <p style="color:#666;margin:0 0 24px;">We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${data.resetLink}" style="display:inline-block;background:${primaryColor};color:#fff;padding:13px 28px;border-radius:12px;text-decoration:none;font-weight:600;">Reset Password</a>
        </div>
        <p style="color:#aaa;font-size:13px;text-align:center;margin:0;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      `, brand),
      text: `Reset Your Password\n\nHi ${data.name},\n\nClick here to reset your password: ${data.resetLink}\n\nThis link expires in 1 hour.`,
    };
  },

  emailVerification: (data: { name: string; verifyLink: string }, brand: BrandOptions = {}) => {
    const { storeName = 'Our store', primaryColor = '#7FAF8E' } = brand;
    return {
      subject: `Verify your email to activate your ${storeName} account`,
      html: emailWrapper(`
        <h2 style="color:#333;margin:0 0 16px;font-size:20px;">Hi ${data.name}, welcome! 🎉</h2>
        <p style="color:#666;line-height:1.6;margin:0 0 20px;">
          Thanks for signing up at ${storeName}. Please verify your email address to activate your account and start shopping.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${data.verifyLink}" style="display:inline-block;background:${primaryColor};color:#fff;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">
            Verify Email Address
          </a>
        </div>
        <p style="color:#aaa;font-size:13px;text-align:center;margin:0;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      `, brand),
      text: `Hi ${data.name},\n\nVerify your email to activate your ${storeName} account:\n${data.verifyLink}\n\nThis link expires in 24 hours.`,
    };
  },
};
