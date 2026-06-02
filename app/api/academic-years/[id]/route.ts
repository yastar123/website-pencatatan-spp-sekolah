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
    const id = (await params).id;

    const updated = await prisma.academicYear.update({
      where: { id },
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

    const id = (await params).id;

    const yearData = await prisma.academicYear.findUnique({ where: { id } });
    if (!yearData) {
      return NextResponse.json(
        { error: "Academic year not found" },
        { status: 404 },
      );
    }

    // ── 1. Kelas dalam tahun ajaran ini ──────────────────────────────────
    const classes = await prisma.class.findMany({
      where: { academicYearId: id },
      select: { id: true },
    });
    const classIds = classes.map((c) => c.id);

    if (classIds.length > 0) {
      // ── 2. Siswa dalam kelas-kelas tersebut ────────────────────────────
      const students = await prisma.student.findMany({
        where: { classId: { in: classIds } },
        select: { id: true },
      });
      const studentIds = students.map((s) => s.id);

      if (studentIds.length > 0) {
        // Hapus payments siswa
        await prisma.payment.deleteMany({
          where: { studentId: { in: studentIds } },
        });
        // Putus link User → Student
        await prisma.user.updateMany({
          where: { studentId: { in: studentIds } },
          data: { studentId: null },
        });
        // Hapus siswa
        await prisma.student.deleteMany({
          where: { id: { in: studentIds } },
        });
      }

      // ── 3. SPPRate untuk kelas-kelas ini ────────────────────────────────
      await prisma.sPPRate.deleteMany({
        where: { classId: { in: classIds } },
      });

      // ── 4. Hapus kelas ──────────────────────────────────────────────────
      await prisma.class.deleteMany({
        where: { id: { in: classIds } },
      });
    }

    // ── 5. Batch milik tahun ajaran ini (beserta payments via batchId) ──
    const batches = await prisma.batch.findMany({
      where: { academicYearId: id },
      select: { id: true },
    });
    const batchIds = batches.map((b) => b.id);

    if (batchIds.length > 0) {
      // Hapus payments yang masih terhubung ke batch ini
      await prisma.payment.deleteMany({
        where: { batchId: { in: batchIds } },
      });
      await prisma.batch.deleteMany({
        where: { id: { in: batchIds } },
      });
    }

    // ── 6. SPPRate langsung dari academicYearId ─────────────────────────
    await prisma.sPPRate.deleteMany({ where: { academicYearId: id } });

    // ── 7. Hapus tahun ajaran ────────────────────────────────────────────
    await prisma.academicYear.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete academic year error:", error);
    return NextResponse.json(
      { error: "Failed to delete academic year" },
      { status: 500 },
    );
  }
}
