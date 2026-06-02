import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rates = await prisma.sPPRate.findMany({
      include: { class: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ rates });
  } catch (error) {
    console.error('Get SPP rates error:', error);
    return NextResponse.json({ error: 'Failed to fetch SPP rates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== 'BENDAHARA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { classId, academicYearId, amount } = await request.json();

    const rate = await prisma.sPPRate.create({
      data: {
        classId,
        academicYearId,
        amount,
      },
      include: { class: { select: { name: true } } },
    });

    return NextResponse.json(rate, { status: 201 });
  } catch (error) {
    console.error('Create SPP rate error:', error);
    return NextResponse.json({ error: 'Failed to create SPP rate' }, { status: 500 });
  }
}
