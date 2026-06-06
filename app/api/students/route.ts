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
    const classId = searchParams.get("classId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nis: { contains: search } },
      ];
    }
    if (classId) {
      where.classId = classId;
    }

    const [studentsRaw, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: { class: true },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.student.count({ where }),
    ]);

    // enrich students with owedAmount and owedMonths (based on PMS/SPP unpaid payments and rate)
    const activeYear =
      (await prisma.academicYear.findFirst({ where: { active: true } })) ??
      (await prisma.academicYear.findFirst({ orderBy: { createdAt: "desc" } }));

    const students = await Promise.all(
      studentsRaw.map(async (s) => {
        // sum unpaid PMS/SPP payments
        const agg = await prisma.payment.aggregate({
          where: {
            studentId: s.id,
            status: "MENUNGGAK",
            paymentType: { in: ["SPP", "PMS"] },
          },
          _sum: { amount: true },
        });
        const owedAmount = agg._sum.amount ?? 0;

        // find applicable rate (prefer class.academicYearId else activeYear)
        const ayId = s.class?.academicYearId || activeYear?.id || null;
        let owedMonths = 0;
        if (owedAmount > 0 && ayId) {
          const rate = await prisma.sPPRate.findFirst({
            where: { classId: s.classId, academicYearId: ayId },
            orderBy: { createdAt: "desc" },
          });
          if (rate && rate.amount > 0) {
            owedMonths = Math.ceil(owedAmount / rate.amount);
          }
        }

        return { ...s, owedAmount, owedMonths };
      }),
    );

    return NextResponse.json({
      students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get students error:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
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

    const { nis, nisn, name, gender, classId, address, phoneOrangTua } =
      await request.json();

    const student = await prisma.student.create({
      data: {
        nis,
        nisn: nisn || null,
        name,
        gender: gender || null,
        classId,
        address,
        phoneOrangTua,
        status: "MENUNGGAK",
      } as any,
      include: { class: true },
    });

    // After creating student, create monthly tunggakan based on PMS/SPP rate for the student's class and academic year
    try {
      const cls = student.class;
      if (cls?.academicYearId) {
        const academicYear = await prisma.academicYear.findUnique({
          where: { id: cls.academicYearId },
        });
        if (academicYear) {
          const rate = await prisma.sPPRate.findFirst({
            where: { classId: cls.id, academicYearId: academicYear.id },
            orderBy: { createdAt: "desc" },
          });
          if (rate) {
            // create a debt/payment entry for each month in the academic year
            const start = new Date(academicYear.startDate);
            const end = new Date(academicYear.endDate);
            const ops: Promise<any>[] = [];
            let cur = new Date(start.getFullYear(), start.getMonth(), 1);
            while (cur <= end) {
              const monthName = cur.toLocaleString("id-ID", { month: "long" });
              const yearNum = cur.getFullYear();
              ops.push(
                prisma.payment.create({
                  data: {
                    studentId: student.id,
                    paymentType: "PMS",
                    amount: rate.amount,
                    paymentMethod: "-",
                    status: "MENUNGGAK",
                    notes: `Tunggakan PMS bulan ${monthName} ${yearNum}`,
                    createdBy: session.userId,
                  },
                }),
              );
              // next month
              cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
            }
            await Promise.all(ops);
            // ensure student status is MENUNGGAK
            await prisma.student.update({
              where: { id: student.id },
              data: { status: "MENUNGGAK" },
            });
          }
        }
      }
    } catch (e) {
      console.error("Failed to create initial debts for student:", e);
    }

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error("Create student error:", error);
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 },
    );
  }
}
