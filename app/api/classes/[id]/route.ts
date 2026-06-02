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

    const classData = await prisma.class.findUnique({
      where: { id: params.id },
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

    // Support force delete via query param: ?force=true
    const force = request.nextUrl.searchParams.get("force") === "true";

    // Count students in class
    const studentCount = await prisma.student.count({
      where: { classId: params.id },
    });
    if (studentCount > 0 && !force) {
      return NextResponse.json(
        { error: "Class has enrolled students; remove or reassign them first" },
        { status: 400 },
      );
    }

    if (studentCount > 0 && force) {
      // find student IDs in this class
      const students = await prisma.student.findMany({
        where: { classId: params.id },
        select: { id: true },
      });
      const studentIds = students.map((s) => s.id);

      // clear user.studentId for users linked to these students, then delete students and class in a transaction
      await prisma.$transaction([
        prisma.user.updateMany({
          where: { studentId: { in: studentIds } },
          data: { studentId: null },
        }),
        prisma.student.deleteMany({ where: { id: { in: studentIds } } }),
        prisma.class.delete({ where: { id: params.id } }),
      ]);
    } else {
      await prisma.class.delete({ where: { id: params.id } });
    }

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

    const updated = await prisma.class.update({
      where: { id: params.id },
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
