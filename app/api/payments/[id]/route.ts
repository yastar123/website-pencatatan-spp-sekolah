import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function extractId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/");
  return parts[parts.length - 1];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = extractId(request);
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { student: { include: { class: { select: { name: true } } } } },
    });
    if (!payment)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(payment);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== "BENDAHARA")
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const id = extractId(request);
    const body = await request.json();
    const { amount, paymentMethod, status, notes } = body as any;

    const updated = await prisma.payment.update({
      where: { id },
      data: { amount, paymentMethod, status, notes },
      include: { student: { select: { id: true } } },
    });

    // Recompute student status
    const studentId = updated.student?.id;
    if (studentId) {
      const sisa = await prisma.payment.count({
        where: { studentId, status: "MENUNGGAK" },
      });
      await prisma.student.update({
        where: { id: studentId },
        data: { status: sisa > 0 ? "MENUNGGAK" : "LUNAS" },
      });
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== "BENDAHARA")
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const id = extractId(request);
    const toDelete = await prisma.payment.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!toDelete)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.payment.delete({ where: { id } });

    // Recompute student status
    const studentId = toDelete.student?.id;
    if (studentId) {
      const sisa = await prisma.payment.count({
        where: { studentId, status: "MENUNGGAK" },
      });
      await prisma.student.update({
        where: { id: studentId },
        data: { status: sisa > 0 ? "MENUNGGAK" : "LUNAS" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
