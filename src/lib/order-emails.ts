import { prisma } from '@/lib/prisma';
import { createTransporter, sendEmail, emailTemplates } from '@/lib/email';
import { getBrand } from '@/lib/email-brand';
import { formatOrderMoney } from '@/lib/markets';

export type OrderEmailType = 'orderConfirmation' | 'orderShipped';


/** Emails the customer about their order (skipped quietly when SMTP isn't set up). */
export async function sendOrderEmail(type: OrderEmailType, orderId: string): Promise<{ success: boolean; reason?: string }> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  if (!settings?.smtpHost || !settings?.smtpUser) return { success: false, reason: 'SMTP not configured' };

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true, items: true } });
  if (!order?.user?.email) return { success: false, reason: 'Order not found' };

  const transporter = createTransporter({
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpSecure,
    user: settings.smtpUser,
    password: settings.smtpPassword || '',
    fromName: settings.smtpFromName || settings.storeName,
    fromEmail: settings.smtpFromEmail || settings.storeEmail,
  });
  const brand = await getBrand();

  const emailContent = type === 'orderConfirmation'
    ? emailTemplates.orderConfirmation({
        name: order.user.name || 'Customer',
        orderNumber: order.orderNumber,
        total: formatOrderMoney(order, Number(order.total)),
        items: order.items.map((item) => ({ name: item.productName, quantity: item.quantity, price: formatOrderMoney(order, Number(item.price)) })),
        shippingAddress: `${order.shippingAddressLine1}\n${order.shippingAddressLine2 || ''}\n${order.shippingCity}, ${order.shippingState} ${order.shippingPincode}`,
      }, brand)
    : emailTemplates.orderShipped({ name: order.user.name || 'Customer', orderNumber: order.orderNumber, trackingNumber: order.trackingNumber || undefined }, brand);

  const result = await sendEmail(
    transporter,
    { to: order.user.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text },
    settings.smtpFromName || settings.storeName,
    settings.smtpFromEmail || settings.storeEmail
  );
  return { success: result.success };
}
