import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMarkets } from '@/lib/markets-server';
import { claimCouponUse, spendPoints } from '@/lib/discounts';
import { includedGst } from '@/lib/tax';
import { priceOrder } from '@/lib/pricing';
import { reserveStock } from '@/lib/variant-stock';
import { countryName, toCountryCode, usableCurrencies } from '@/lib/markets';


// Generate order number: BB + 9 digits (BB012345678)
function generateOrderNumber(): string {
  const digits = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  return `BB${digits}`;
}

// GET - Get user's orders
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              include: { images: { where: { isPrimary: true }, take: 1 } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST - Create order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Destination, delivery and payment methods all come from the region that sells to
    // this country (Admin → Settings → Regions); pricing refuses countries with no region.
    const country = toCountryCode(data.shippingCountry);
    const markets = await getMarkets();

    // Get cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
    });

    if (cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    // Prices include GST, so the tax inside a price is price × rate / (100 + rate)
    // (a region can set its own rate, e.g. 0% for exports)
    let regionTax: number | null = null;
    const lineGst = (item: (typeof cartItems)[number]) => includedGst(Number(item.product.price), regionTax ?? Number(item.product.gstRate)) * item.quantity;
    // Discounts, shipping and total come from the shared pricing (the checkout quote uses the same);
    // amounts sent by the browser are ignored.
    const priced = await priceOrder({
      lines: cartItems.map((item) => ({
        productId: item.productId,
        categoryId: item.product.categoryId,
        price: Number(item.product.price),
        quantity: item.quantity,
      })),
      country,
      markets,
      userId: session.user.id,
      couponCode: typeof data.couponCode === 'string' ? data.couponCode : null,
      pointsToRedeem: Number(data.pointsToRedeem) || 0,
      giftWrap: !!data.giftWrap,
      shippingOptionId: typeof data.shippingOptionId === 'string' ? data.shippingOptionId : null,
      paymentMethod: data.paymentMethod,
    });
    if ('error' in priced) return NextResponse.json({ error: priced.error }, { status: 400 });
    if (!priced.paymentMethods.includes(data.paymentMethod)) {
      return NextResponse.json({ error: 'This payment method is not available here. Please choose another.' }, { status: 400 });
    }
    const { shippingCharge, discount, total, pointsUsed, codFee } = priced;
    // Discounts lower the taxable value, so GST shrinks in proportion
    regionTax = priced.region?.taxRate ?? null;
    const itemsGst = cartItems.reduce((sum, item) => sum + lineGst(item), 0);
    const gstAmount = Math.round(itemsGst * (subtotal > 0 ? Math.max(0, subtotal - discount) / subtotal : 1) * 100) / 100;
    const couponId = priced.coupon?.id ?? null;
    const couponCode = priced.coupon?.code ?? null;

    // Card payments abroad are charged in the shopper's currency at today's rate, fixed on the order.
    const requestedCurrency = typeof data.currency === 'string' ? data.currency : 'INR';
    const usable = usableCurrencies(markets);
    const regionCurrency = priced.region?.currency && usable.includes(priced.region.currency) && priced.region.currency !== 'INR' ? priced.region.currency : null;
    const currency = data.paymentMethod !== 'STRIPE' ? 'INR'
      : usable.includes(requestedCurrency) && requestedCurrency !== 'INR' ? requestedCurrency
      : regionCurrency || (usable.includes('USD') ? 'USD' : 'INR');
    const exchangeRate = markets.rates[currency] ?? 1;

    // Take the items out of stock (per size/colour where tracked), all or nothing, so two
    // orders can't both buy the last one. Released again if anything below fails.
    const stock = await reserveStock(cartItems.map((item) => ({
      productId: item.productId,
      variant: item.variant,
      quantity: item.quantity,
      name: item.product.name,
    })));
    if ('error' in stock) return NextResponse.json({ error: stock.error }, { status: 400 });

    // Reserve the coupon use before creating the order (it may have just hit its limit)
    if (couponId && !(await claimCouponUse(couponId))) {
      await stock.release();
      return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 400 });
    }

    // Generate unique order number
    let orderNumber = generateOrderNumber();
    let existingOrder = await prisma.order.findUnique({ where: { orderNumber } });
    while (existingOrder) {
      orderNumber = generateOrderNumber();
      existingOrder = await prisma.order.findUnique({ where: { orderNumber } });
    }

    // Create order
    let order;
    try {
      order = await prisma.order.create({
        data: {
          userId: session.user.id,
          orderNumber,
          shippingName: data.shippingName,
          shippingPhone: data.shippingPhone,
          shippingAddressLine1: data.shippingAddressLine1,
          shippingAddressLine2: data.shippingAddressLine2,
          shippingCity: data.shippingCity,
          shippingState: data.shippingState,
          shippingPincode: data.shippingPincode,
          shippingCountry: countryName(country),
          // Billing address, when the shopper gave a different one
          billingSameAsShipping: data.billingSameAsShipping !== false,
          ...(data.billingSameAsShipping === false ? {
            billingName: String(data.billingName || '').slice(0, 120) || null,
            billingAddressLine1: String(data.billingAddressLine1 || '').slice(0, 200) || null,
            billingAddressLine2: String(data.billingAddressLine2 || '').slice(0, 200) || null,
            billingCity: String(data.billingCity || '').slice(0, 80) || null,
            billingState: String(data.billingState || '').slice(0, 80) || null,
            billingPincode: String(data.billingPincode || '').slice(0, 20) || null,
          } : {}),
          subtotal,
          discount,
          couponCode,
          gstAmount,
          shippingCharge,
          shippingMethod: priced.shippingOption?.name || null,
          codFee,
          total,
          paymentMethod: data.paymentMethod,
          currency,
          exchangeRate,
          paymentStatus: 'PENDING',
          status: 'PENDING',
          customerNotes: data.customerNotes,
          giftWrap: data.giftWrap || false,
          giftMessage: data.giftMessage || null,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              productSku: item.product.sku,
              productImage: item.product.images?.[0]?.url || null,
              variant: item.variant || null,
              price: Number(item.product.price),
              gstRate: regionTax ?? Number(item.product.gstRate),
              gstAmount: Math.round(lineGst(item) * 100) / 100,
              quantity: item.quantity,
            })),
          },
        },
      });
    } catch (error) {
      if (couponId) await prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { decrement: 1 } } }).catch(() => {});
      await stock.release().catch(() => {});
      throw error;
    }

    if (pointsUsed > 0 && !(await spendPoints(session.user.id, pointsUsed, `Redeemed on order #${order.orderNumber}`, order.id))) {
      // Balance changed since checking (e.g. another order); the discount stands but log it for review.
      console.warn(`Points for order ${order.orderNumber} could not be deducted`);
    }

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { userId: session.user.id },
    });


    // Loyalty points and referral rewards are credited when the order is delivered (src/lib/order-rewards.ts).

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    // Log the details; database errors can contain internals customers shouldn't see
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'We couldn’t place your order. Please try again.' },
      { status: 500 }
    );
  }
}
