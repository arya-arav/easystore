import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { invoicePdf } from '@/lib/invoice-pdf';
import { formatOrderMoney } from '@/lib/markets';

export const dynamic = 'force-dynamic';

const fmt = (p: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p);

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const isStaff = session.user.role === 'ADMIN' || session.user.role === 'SELLER';

    const [order, settings] = await Promise.all([
      prisma.order.findFirst({
        // Customers see their own orders; staff can open any (admin "Invoice" button)
        where: { id: params.id, ...(isStaff ? {} : { userId: session.user.id }) },
        include: { items: true },
      }),
      prisma.siteSettings.findUnique({ where: { id: 'default' } }),
    ]);

    if (!order) return new NextResponse('Order not found', { status: 404 });

    const storeName = settings?.storeName || 'Store';
    const storeEmail = settings?.storeEmail || '';
    const storePhone = settings?.storePhone || '+91 98765 43210';
    const storeAddress = settings?.storeAddress || 'India';
    const gstin = settings?.gstin || '';

    if (new URL(request.url).searchParams.get('format') === 'pdf') {
      const bytes = await invoicePdf(order, { name: storeName, email: storeEmail, phone: storePhone, address: storeAddress, gstin });
      return new NextResponse(bytes as unknown as BodyInit, {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="invoice-${order.orderNumber}.pdf"` },
      });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Invoice #${order.orderNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #333; font-size: 13px; }
  .page { max-width: 720px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #7FAF8E; }
  .brand { font-size: 22px; font-weight: 800; color: #333; }
  .brand span { color: #7FAF8E; }
  .store-info { font-size: 11px; color: #777; margin-top: 4px; line-height: 1.6; }
  .invoice-meta { text-align: right; }
  .invoice-meta h2 { font-size: 20px; font-weight: 700; color: #7FAF8E; letter-spacing: 1px; text-transform: uppercase; }
  .invoice-meta p { font-size: 12px; color: #777; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #DCFCE7; color: #166534; margin-top: 6px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #AAAAAA; margin-bottom: 8px; }
  .address-box { background: #F8F8F6; border-radius: 10px; padding: 14px; }
  .address-box p { line-height: 1.7; color: #555; }
  .address-box strong { color: #333; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: #F5F0E8; }
  th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #777; }
  td { padding: 10px 12px; border-bottom: 1px solid #F0F0F0; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  .text-right { text-align: right; }
  .totals { margin-left: auto; width: 260px; }
  .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #555; }
  .totals-row.discount { color: #7FAF8E; }
  .totals-row.total { font-size: 15px; font-weight: 800; color: #333; border-top: 2px solid #E5E5E5; padding-top: 10px; margin-top: 4px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E5E5; text-align: center; font-size: 11px; color: #AAAAAA; line-height: 1.8; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">${storeName}</div>
      <div class="store-info">
        ${storeAddress ? storeAddress + '<br/>' : ''}
        ${storeEmail} · ${storePhone}
        ${gstin ? '<br/>GSTIN: ' + gstin : ''}
      </div>
    </div>
    <div class="invoice-meta">
      <h2>Invoice</h2>
      <p>#${order.orderNumber}</p>
      <p>Date: ${fmtDate(order.createdAt)}</p>
      <div class="status-badge">${order.status.replace('_', ' ')}</div>
    </div>
  </div>

  <div class="grid-2">
    <div>
      <div class="section-title">Bill To</div>
      <div class="address-box">
        <p><strong>${order.shippingName}</strong></p>
        <p>${order.shippingAddressLine1}${order.shippingAddressLine2 ? ', ' + order.shippingAddressLine2 : ''}</p>
        <p>${order.shippingCity}, ${order.shippingState} – ${order.shippingPincode}</p>
        <p>📞 ${order.shippingPhone}</p>
      </div>
    </div>
    <div>
      <div class="section-title">Payment Info</div>
      <div class="address-box">
        <p><strong>Method:</strong> ${order.paymentMethod}</p>
        <p><strong>Status:</strong> ${order.paymentStatus}</p>
        ${order.couponCode ? `<p><strong>Coupon:</strong> ${order.couponCode}</p>` : ''}
        ${order.trackingNumber ? `<p><strong>Tracking:</strong> ${order.trackingNumber}</p>` : ''}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>SKU</th>
        <th class="text-right">Price</th>
        <th class="text-right">Qty</th>
        <th class="text-right">GST</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${order.items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.productName}${item.variant ? `<br><small>${item.variant}</small>` : ''}</td>
        <td style="color:#AAAAAA;font-size:11px">${item.productSku}</td>
        <td class="text-right">${fmt(Number(item.price))}</td>
        <td class="text-right">${item.quantity}</td>
        <td class="text-right" style="color:#777">${item.gstRate}%</td>
        <td class="text-right"><strong>${fmt(Number(item.price) * item.quantity)}</strong></td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${fmt(Number(order.subtotal))}</span></div>
    ${Number(order.discount) > 0 ? `<div class="totals-row discount"><span>Discount${order.couponCode ? ' (' + order.couponCode + ')' : ''}</span><span>− ${fmt(Number(order.discount))}</span></div>` : ''}
    <div class="totals-row"><span>GST (included)</span><span>${fmt(Number(order.gstAmount))}</span></div>
    <div class="totals-row"><span>Shipping</span><span>${Number(order.shippingCharge) === 0 ? 'FREE' : fmt(Number(order.shippingCharge))}</span></div>
    <div class="totals-row total"><span>Total</span><span>${fmt(Number(order.total))}</span></div>
    ${order.currency && order.currency !== 'INR' ? `<div class="totals-row"><span>Charged in ${order.currency}</span><span>${formatOrderMoney(order, Number(order.total))}</span></div>` : ''}
  </div>

  <div class="footer">
    <p>Thank you for shopping with ${storeName}!</p>
    <p>For queries: ${storeEmail} · ${storePhone}</p>
    <p style="margin-top:8px;font-size:10px">This is a computer-generated invoice and does not require a signature.</p>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    return new NextResponse('Failed to generate invoice', { status: 500 });
  }
}
