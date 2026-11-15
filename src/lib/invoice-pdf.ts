import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

// A4 tax invoice as a real PDF (customers download it from their order page). Standard
// PDF fonts have no ₹ glyph, so amounts are written "Rs.".

interface InvoiceOrder {
  orderNumber: string;
  createdAt: Date;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  couponCode: string | null;
  subtotal: unknown;
  discount: unknown;
  gstAmount: unknown;
  shippingCharge: unknown;
  total: unknown;
  currency?: string | null;
  exchangeRate?: unknown;
  shippingName: string;
  shippingPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  shippingCountry: string;
  billingSameAsShipping: boolean;
  billingName: string | null;
  billingAddressLine1: string | null;
  billingCity: string | null;
  billingPincode: string | null;
  items: { productName: string; variant: string | null; productSku: string; price: unknown; quantity: number; gstRate: unknown }[];
}

interface Store { name: string; email: string; phone: string; address: string; gstin: string }

const money = (n: unknown) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Standard fonts only cover Latin-1; replace anything else so drawing never throws.
const safe = (s: unknown) => String(s ?? '').replace(/₹/g, 'Rs.').replace(/[–—]/g, '-').replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

export async function invoicePdf(order: InvoiceOrder, store: Store): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${order.orderNumber}`);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]);
  const M = 48;
  const W = 595.28 - M * 2;
  let y = 841.89 - M;
  const grey = rgb(0.45, 0.45, 0.45);
  const ink = rgb(0.13, 0.13, 0.13);

  const text = (s: unknown, x: number, size = 10, f: PDFFont = font, color = ink) => page.drawText(safe(s), { x, y, size, font: f, color });
  const right = (s: unknown, xRight: number, size = 10, f: PDFFont = font, color = ink) => {
    const str = safe(s);
    page.drawText(str, { x: xRight - f.widthOfTextAtSize(str, size), y, size, font: f, color });
  };
  const fit = (s: unknown, max: number, size = 10, f: PDFFont = font) => {
    let str = safe(s);
    if (f.widthOfTextAtSize(str, size) <= max) return str;
    while (str.length > 1 && f.widthOfTextAtSize(str + '...', size) > max) str = str.slice(0, -1);
    return str + '...';
  };
  const line = () => page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.6, color: rgb(0.88, 0.88, 0.88) });

  // Header
  text(store.name, M, 18, bold);
  right('TAX INVOICE', M + W, 14, bold);
  y -= 16;
  text(store.address, M, 9, font, grey);
  right(`#${order.orderNumber}`, M + W, 10);
  y -= 12;
  text(`${store.email}  |  ${store.phone}`, M, 9, font, grey);
  right(order.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), M + W, 10);
  y -= 12;
  if (store.gstin) text(`GSTIN: ${store.gstin}`, M, 9, font, grey);
  y -= 22;
  line();
  y -= 20;

  // Addresses and payment
  const colW = W / 3;
  text('SHIP TO', M, 8, bold, grey);
  text('BILL TO', M + colW, 8, bold, grey);
  text('PAYMENT', M + colW * 2, 8, bold, grey);
  y -= 14;
  const ship = [order.shippingName, order.shippingAddressLine1, order.shippingAddressLine2, `${order.shippingCity}, ${order.shippingState} ${order.shippingPincode}`, order.shippingCountry, order.shippingPhone].filter(Boolean);
  const bill = order.billingSameAsShipping || !order.billingAddressLine1
    ? ['Same as shipping']
    : [order.billingName, order.billingAddressLine1, `${order.billingCity || ''} ${order.billingPincode || ''}`].filter(Boolean);
  const pay = [order.paymentMethod, order.paymentStatus === 'COMPLETED' ? 'Paid' : order.paymentStatus.toLowerCase(), order.couponCode ? `Coupon ${order.couponCode}` : ''].filter(Boolean);
  const top = y;
  [ship, bill, pay].forEach((rows, col) => {
    y = top;
    rows.forEach((r, i) => { text(fit(r, colW - 12, 9.5, i === 0 ? bold : font), M + colW * col, 9.5, i === 0 ? bold : font); y -= 13; });
  });
  y = top - Math.max(ship.length, bill.length, pay.length) * 13 - 14;

  // Items
  const cols = { item: M, qty: M + W * 0.6, price: M + W * 0.78, total: M + W };
  page.drawRectangle({ x: M, y: y - 6, width: W, height: 20, color: rgb(0.96, 0.96, 0.95) });
  text('Item', cols.item + 6, 9, bold);
  right('Qty', cols.qty, 9, bold);
  right('Price', cols.price, 9, bold);
  right('Amount', cols.total - 6, 9, bold);
  y -= 24;
  for (const it of order.items) {
    if (y < M + 120) { page = pdf.addPage([595.28, 841.89]); y = 841.89 - M; }
    text(fit(it.productName, W * 0.55, 10), cols.item + 6, 10);
    right(it.quantity, cols.qty, 10);
    right(money(it.price), cols.price, 10);
    right(money(Number(it.price) * it.quantity), cols.total - 6, 10);
    y -= 12;
    text(fit([it.variant, it.productSku, `GST ${Number(it.gstRate)}%`].filter(Boolean).join('  |  '), W * 0.55, 8), cols.item + 6, 8, font, grey);
    y -= 16;
  }
  line();
  y -= 18;

  // Totals
  const row = (label: string, value: string, strong = false) => {
    text(label, M + W * 0.55, strong ? 11 : 10, strong ? bold : font, strong ? ink : grey);
    right(value, M + W - 6, strong ? 11 : 10, strong ? bold : font);
    y -= strong ? 18 : 15;
  };
  row('Subtotal', money(order.subtotal));
  if (Number(order.discount) > 0) row(`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, `- ${money(order.discount)}`);
  row('Shipping', Number(order.shippingCharge) === 0 ? 'Free' : money(order.shippingCharge));
  row('GST (included in prices)', money(order.gstAmount));
  y -= 4;
  row('Total', money(order.total), true);
  // Paid in another currency: the invoice stays in INR, with what was actually charged
  if (order.currency && order.currency !== 'INR' && Number(order.exchangeRate) > 0) {
    const charged = Number(order.total) * Number(order.exchangeRate);
    row(`Charged in ${order.currency} (1 INR = ${Number(order.exchangeRate).toFixed(4)})`, `${order.currency} ${charged.toFixed(2)}`);
  }

  y = M + 20;
  text('Thank you for shopping with us! This is a computer-generated invoice and needs no signature.', M, 8.5, font, grey);
  return pdf.save();
}
