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

    const student = await prisma.student.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("Get student error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student" },
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

    const { nis, nisn, name, gender, classId, address, phoneOrangTua } =
      await request.json();

    const id = (await params).id;

    const student = await prisma.student.update({
      where: { id },
      data: {
        nis,
        nisn: nisn || null,
        name,
        gender: gender || null,
        classId,
        address,
        phoneOrangTua,
      } as any,
      include: { class: true },
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error("Update student error:", error);
    return NextResponse.json(
      { error: "Failed to update student" },
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

    // Clear any User.studentId references to avoid FK constraint failures, then delete student in a transaction
    const id = (await params).id;

    const student = await prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.user.updateMany({
        where: { studentId: id },
        data: { studentId: null },
      }),
      prisma.student.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete student error:", error);
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 },
    );
  }
}
