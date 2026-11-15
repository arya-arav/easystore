import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch user's saved addresses
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('GET /api/addresses - Session:', session?.user?.email);
    
    if (!session?.user?.email) {
      console.log('GET /api/addresses - No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        addresses: {
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    console.log('GET /api/addresses - Found addresses:', user?.addresses?.length || 0);
    return NextResponse.json({ addresses: user?.addresses || [] });
  } catch (error) {
    console.error('Failed to fetch addresses:', error);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

// POST - Create new address
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('POST /api/addresses - Session:', session?.user?.email);
    
    if (!session?.user?.email) {
      console.log('POST /api/addresses - No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.log('POST /api/addresses - User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = await request.json();
    console.log('POST /api/addresses - Data:', data);
    
    // If this is the first address or isDefault is true, unset other defaults
    const existingAddresses = await prisma.address.count({
      where: { userId: user.id },
    });

    if (data.isDefault || existingAddresses === 0) {
      await prisma.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: user.id,
        name: data.name,
        phone: data.phone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || null,
        landmark: data.landmark || null,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        ...(data.country ? { country: String(data.country).slice(0, 60) } : {}),
        type: data.type || 'HOME',
        isDefault: data.isDefault || existingAddresses === 0,
      },
    });

    console.log('POST /api/addresses - Created address:', address.id);
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error('Failed to create address:', error);
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
}

// PUT - Update address
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { id, ...updateData } = data;

    // Verify ownership
    const address = await prisma.address.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!address || address.user.email !== session.user.email) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      await prisma.address.updateMany({
        where: { userId: address.userId },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        name: updateData.name,
        phone: updateData.phone,
        addressLine1: updateData.addressLine1,
        addressLine2: updateData.addressLine2,
        landmark: updateData.landmark,
        city: updateData.city,
        state: updateData.state,
        pincode: updateData.pincode,
        ...(updateData.country ? { country: String(updateData.country).slice(0, 60) } : {}),
        type: updateData.type,
        isDefault: updateData.isDefault,
      },
    });

    return NextResponse.json({ address: updated });
  } catch (error) {
    console.error('Failed to update address:', error);
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}

// DELETE - Delete address
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Address ID required' }, { status: 400 });
    }

    // Verify ownership
    const address = await prisma.address.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!address || address.user.email !== session.user.email) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    await prisma.address.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete address:', error);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
