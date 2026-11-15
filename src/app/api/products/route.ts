import { NextRequest, NextResponse } from 'next/server';
import { productQueryFromParams, queryProducts } from '@/lib/product-query';

// GET - List products with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    return NextResponse.json(await queryProducts(productQueryFromParams((key) => searchParams.get(key))));
  } catch (error: any) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({
      error: 'Failed to fetch products',
      detail: error?.message,
      code: error?.code,
    }, { status: 500 });
  }
}
