import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [{ transactionNo: { contains: search } }];
      // search by student name or nis requires join - use nested filters on student
      // older Prisma client may not support `mode` on contains, so use simple contains
      where.OR.push({ student: { name: { contains: search } } });
      where.OR.push({ student: { nis: { contains: search } } });
    }

    // Filter by user role - students can only see their own payments
    if (session.role === "SISWA") {
      // retrieve user's studentId from User table
      const currentUser = await prisma.user.findUnique({
        where: { id: session.userId },
      });
      if (currentUser?.studentId) {
        where.studentId = currentUser.studentId;
      } else {
        // no linked student - return empty result
        return NextResponse.json({
          payments: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        });
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { student: { select: { name: true, nis: true, id: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== "BENDAHARA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const {
      studentId,
      paymentType,
      amount,
      paymentMethod,
      status,
      proofUrl,
      notes,
    } = await request.json();

    const resolvedStatus = status || "BERHASIL";

    const payment = await prisma.payment.create({
      data: {
        studentId,
        paymentType,
        amount,
        paymentMethod,
        status: resolvedStatus,
        proofUrl,
        notes,
        createdBy: session.userId,
      },
      include: { student: { select: { name: true, nis: true } } },
    });

    // Auto-update student status: BERHASIL → LUNAS, MENUNGGAK → MENUNGGAK
    if (resolvedStatus === "BERHASIL") {
      await prisma.student.update({
        where: { id: studentId },
        data: { status: "LUNAS" },
      });
    } else if (resolvedStatus === "MENUNGGAK") {
      await prisma.student.update({
        where: { id: studentId },
        data: { status: "MENUNGGAK" },
      });
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 },
    );
  }
}
