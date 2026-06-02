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

    const classes = await prisma.class.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ classes });
  } catch (error) {
    console.error('Get classes error:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== 'BENDAHARA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, academicYearId } = await request.json();

    const classData = await prisma.class.create({
      data: { name, academicYearId },
      include: { _count: { select: { students: true } } },
    });

    return NextResponse.json(classData, { status: 201 });
  } catch (error) {
    console.error('Create class error:', error);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
}
