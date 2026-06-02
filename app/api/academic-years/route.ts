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

    const activeYear = await prisma.academicYear.findFirst({
      where: { active: true },
    });

    const years = await prisma.academicYear.findMany({
      orderBy: { year: 'desc' },
    });

    return NextResponse.json({ activeYear, years });
  } catch (error) {
    console.error('Get academic years error:', error);
    return NextResponse.json({ error: 'Failed to fetch academic years' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== 'BENDAHARA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { year, startDate, endDate, active } = await request.json();

    const academicYear = await prisma.academicYear.create({
      data: {
        year,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        active: active || false,
      },
    });

    return NextResponse.json(academicYear, { status: 201 });
  } catch (error) {
    console.error('Create academic year error:', error);
    return NextResponse.json({ error: 'Failed to create academic year' }, { status: 500 });
  }
}
