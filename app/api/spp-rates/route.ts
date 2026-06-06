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

    const rates = await prisma.sPPRate.findMany({
      include: {
        class: { select: { name: true } },
        academicYear: { select: { year: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rates });
  } catch (error) {
    console.error("Get SPP rates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SPP rates" },
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

    const { classId, academicYearId, amount } = await request.json();

    // If classId provided, create/update only for that class.
    if (classId) {
      const existing = await prisma.sPPRate.findFirst({
        where: { classId, academicYearId },
      });
      let rate;
      if (existing) {
        rate = await prisma.sPPRate.update({
          where: { id: existing.id },
          data: { amount },
          include: { class: { select: { name: true } } },
        });
      } else {
        rate = await prisma.sPPRate.create({
          data: { classId, academicYearId, amount },
          include: { class: { select: { name: true } } },
        });
      }
      return NextResponse.json(rate, { status: 201 });
    }

    // No classId: apply rate for ALL classes for the selected academic year.
    const classes = await prisma.class.findMany({
      select: { id: true, name: true },
    });
    const ops = classes.map(async (c) => {
      const existing = await prisma.sPPRate.findFirst({
        where: { classId: c.id, academicYearId },
      });
      if (existing) {
        return prisma.sPPRate.update({
          where: { id: existing.id },
          data: { amount },
        });
      }
      return prisma.sPPRate.create({
        data: { classId: c.id, academicYearId, amount },
      });
    });

    const results = await Promise.all(ops);

    // After applying rates, generate monthly debt records (MENUNGGAK)
    try {
      const academicYear = await prisma.academicYear.findUnique({
        where: { id: academicYearId },
      });
      if (academicYear) {
        const months: { month: number; year: number }[] = [];
        let cur = new Date(academicYear.startDate);
        cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
        const end = new Date(academicYear.endDate);
        while (cur <= end) {
          months.push({ month: cur.getMonth() + 1, year: cur.getFullYear() });
          cur.setMonth(cur.getMonth() + 1);
        }

        for (const r of results) {
          const classId = (r as any).classId;
          const rateAmount = (r as any).amount;
          if (!classId) continue;

          const students = await prisma.student.findMany({
            where: { classId },
            select: { id: true },
          });

          for (const m of months) {
            let batch = await prisma.batch.findFirst({
              where: { month: m.month, year: m.year, academicYearId },
            });
            if (!batch) {
              batch = await prisma.batch.create({
                data: { month: m.month, year: m.year, academicYearId },
              });
            }

            for (const s of students) {
              const exists = await prisma.payment.findFirst({
                where: {
                  studentId: s.id,
                  paymentType: "SPP",
                  batchId: batch.id,
                },
              });
              if (exists) continue;

              await prisma.payment.create({
                data: {
                  studentId: s.id,
                  paymentType: "SPP",
                  amount: rateAmount,
                  paymentMethod: "-",
                  status: "MENUNGGAK",
                  batchId: batch.id,
                  notes: `Tagihan SPP ${m.month}/${m.year}`,
                },
              });

              // ensure student status reflects outstanding debt
              try {
                await prisma.student.update({
                  where: { id: s.id },
                  data: { status: "MENUNGGAK" },
                });
              } catch (e) {
                // ignore individual update errors
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to generate monthly debts:", e);
    }

    return NextResponse.json({ applied: results.length }, { status: 201 });
  } catch (error) {
    console.error("Create SPP rate error:", error);
    return NextResponse.json(
      { error: "Failed to create SPP rate" },
      { status: 500 },
    );
  }
}
