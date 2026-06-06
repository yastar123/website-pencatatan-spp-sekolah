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
    const studentIdQ = searchParams.get("studentId") || "";
    const statusQ = searchParams.get("status") || "";
    const paymentTypeQ = searchParams.get("paymentType") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const requestedLimit = parseInt(searchParams.get("limit") || "10");
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 1000)
        : 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { transactionNo: { contains: search } },
        { student: { name: { contains: search } } },
        { student: { nis: { contains: search } } },
      ];
    }

    // Filter by studentId (BENDAHARA only)
    if (studentIdQ && session.role === "BENDAHARA") {
      where.studentId = studentIdQ;
    }

    // Filter by status
    if (statusQ) {
      where.status = statusQ;
    }

    // Filter by paymentType
    if (paymentTypeQ) {
      where.paymentType = paymentTypeQ;
    }

    // Students can only see their own payments
    if (session.role === "SISWA") {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.userId },
      });
      if (currentUser?.studentId) {
        where.studentId = currentUser.studentId;
      } else {
        return NextResponse.json({
          payments: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        });
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          student: { include: { class: { select: { name: true } } } },
          batch: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
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
      month,
      year,
    } = await request.json();

    // normalize UI "PMS" type to stored "SPP" so queries and FIFO match
    const canonicalType = paymentType === "PMS" ? "SPP" : paymentType;

    const resolvedStatus = status || "BERHASIL";

    // Get or create batch for this month/year
    const activeYear = await prisma.academicYear.findFirst({
      where: { active: true },
    });

    let batchId: string | null = null;
    if (activeYear && month && year) {
      const batch = await prisma.batch.findFirst({
        where: {
          month,
          year,
          academicYearId: activeYear.id,
        },
      });

      if (batch) {
        batchId = batch.id;
      } else {
        const newBatch = await prisma.batch.create({
          data: {
            month,
            year,
            academicYearId: activeYear.id,
          },
        });
        batchId = newBatch.id;
      }
    }

    // Jika jenis pembayaran SPP (UI may send PMS), periksa nominal yang berlaku untuk siswa
    if (canonicalType === "SPP") {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });
      const activeYear = await prisma.academicYear.findFirst({
        where: { active: true },
      });
      const rate =
        student && activeYear
          ? await prisma.sPPRate.findFirst({
              where: {
                classId: student.classId,
                academicYearId: activeYear.id,
              },
            })
          : null;

      const expected = rate?.amount ?? 0;

      // Pembayaran kurang dari nominal SPP: buat record bayar + buat tunggakan untuk sisa
      if (amount < expected) {
        // find oldest debt batch to attach to payment if any
        const oldestDebt = await prisma.payment.findFirst({
          where: { studentId, status: "MENUNGGAK", paymentType: canonicalType },
          orderBy: { createdAt: "asc" },
        });
        const attachBatchId = oldestDebt?.batchId ?? batchId;

        // catat pembayaran yang masuk
        const paid = await prisma.payment.create({
          data: {
            studentId,
            paymentType: canonicalType,
            amount,
            paymentMethod,
            status: "BERHASIL",
            proofUrl,
            notes,
            batchId: attachBatchId,
            createdBy: session.userId,
          },
        });

        // buat entry tunggakan untuk sisa
        const remaining = expected - amount;
        const debt = await prisma.payment.create({
          data: {
            studentId,
            paymentType: canonicalType,
            amount: remaining,
            paymentMethod: "-",
            status: "MENUNGGAK",
            notes: `Sisa SPP bulan, dari pembayaran sebagian Rp ${amount.toLocaleString("id-ID")}`,
            batchId: attachBatchId,
            createdBy: session.userId,
          },
        });

        // set status siswa menjadi SETENGAH
        await prisma.student.update({
          where: { id: studentId },
          data: { status: "SETENGAH" },
        });

        return NextResponse.json({ paid, debt }, { status: 201 });
      }

      // amount >= expected → biarkan alokasi FIFO yang ada menangani logika
    }

    // ── Buat payment baru (untuk kasus non-SPP atau jika amount >= expected) ──
    const payment = await prisma.payment.create({
      data: {
        studentId,
        paymentType: canonicalType,
        amount,
        paymentMethod,
        status: resolvedStatus,
        proofUrl,
        notes,
        batchId,
        createdBy: session.userId,
      },
      include: { student: { include: { class: { select: { name: true } } } } },
    });

    // ── Alokasi FIFO: tutup tunggakan paling lama terlebih dahulu ────────────
    let closedDebts: string[] = [];

    if (resolvedStatus === "BERHASIL") {
      // Ambil semua MENUNGGAK untuk siswa ini, terlama dulu
      const debts = await prisma.payment.findMany({
        where: { studentId, status: "MENUNGGAK", paymentType: canonicalType },
        orderBy: { createdAt: "asc" },
      });

      const firstDebtBatchId = debts.length > 0 ? debts[0].batchId : null;

      let remaining = amount;

      for (const debt of debts) {
        if (remaining <= 0) break;

        if (remaining >= debt.amount) {
          // Lunas penuh → hapus tunggakan ini
          await prisma.payment.delete({ where: { id: debt.id } });
          closedDebts.push(debt.id);
          remaining -= debt.amount;
        } else {
          // Lunas sebagian → kurangi jumlah tunggakan
          await prisma.payment.update({
            where: { id: debt.id },
            data: {
              amount: debt.amount - remaining,
              notes: `${debt.notes ? debt.notes + " | " : ""}Dibayar sebagian Rp ${remaining.toLocaleString("id-ID")}`,
            },
          });
          remaining = 0;
        }
      }

      // Update status siswa berdasarkan sisa tunggakan
      const sisaTunggakan = await prisma.payment.count({
        where: { studentId, status: "MENUNGGAK" },
      });
      await prisma.student.update({
        where: { id: studentId },
        data: { status: sisaTunggakan > 0 ? "MENUNGGAK" : "LUNAS" },
      });
      // Attach payment to the batch of the first debt it covered if available
      if (!payment.batchId && firstDebtBatchId) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { batchId: firstDebtBatchId },
        });
      }
    } else if (resolvedStatus === "MENUNGGAK") {
      await prisma.student.update({
        where: { id: studentId },
        data: { status: "MENUNGGAK" },
      });
    }

    return NextResponse.json({ ...payment, closedDebts }, { status: 201 });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 },
    );
  }
}
