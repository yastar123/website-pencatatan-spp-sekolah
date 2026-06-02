import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: any) {
  const { params }: { params: { id: string } } = context || {};
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = (await params).id;

    const classData = await prisma.class.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } },
    });

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    return NextResponse.json(classData);
  } catch (error) {
    console.error("Get class error:", error);
    return NextResponse.json(
      { error: "Failed to fetch class" },
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

    const classData = await prisma.class.findUnique({ where: { id } });
    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // 1. Kumpulkan semua siswa di kelas ini
    const students = await prisma.student.findMany({
      where: { classId: id },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);

    // 2. Hapus semua data terkait siswa secara eksplisit
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

    // 3. Hapus SPPRate untuk kelas ini
    await prisma.sPPRate.deleteMany({ where: { classId: id } });

    // 4. Hapus kelas
    await prisma.class.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete class error:", error);
    return NextResponse.json(
      { error: "Failed to delete class" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: any) {
  const { params }: { params: { id: string } } = context || {};
  try {
    const session = await getSession();
    if (session?.role !== "BENDAHARA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, academicYearId } = await request.json();
    const id = (await params).id;

    const updated = await prisma.class.update({
      where: { id },
      data: { name, academicYearId },
      include: { _count: { select: { students: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update class error:", error);
    return NextResponse.json(
      { error: "Failed to update class" },
      { status: 500 },
    );
  }
}
