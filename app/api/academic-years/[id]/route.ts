import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(request: NextRequest, context: any) {
  const { params }: { params: { id: string } } = context || {};
  try {
    const session = await getSession();
    if (session?.role !== "BENDAHARA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { year, startDate, endDate, active } = await request.json();

    const updated = await prisma.academicYear.update({
      where: { id: params.id },
      data: {
        year,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        active,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update academic year error:", error);
    return NextResponse.json(
      { error: "Failed to update academic year" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: any) {
  const { params }: { params: { id: string } } = context || {};
  try {
    const session = await getSession();
    if (session?.role !== "BENDAHARA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Prevent deleting academic year if classes or sppRates exist
    const classesCount = await prisma.class.count({
      where: { academicYearId: params.id },
    });
    const ratesCount = await prisma.sPPRate.count({
      where: { academicYearId: params.id },
    });

    if (classesCount > 0 || ratesCount > 0) {
      return NextResponse.json(
        { error: "Academic year has related data; remove them first" },
        { status: 400 },
      );
    }

    await prisma.academicYear.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete academic year error:", error);
    return NextResponse.json(
      { error: "Failed to delete academic year" },
      { status: 500 },
    );
  }
}
