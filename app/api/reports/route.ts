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
    const year = searchParams.get("year") || "2023/2024";

    // Get academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { year },
    });

    if (!academicYear) {
      return NextResponse.json({
        monthlyRevenue: [],
        byClassData: [],
        studentStats: { lunas: 0, menunggak: 0 },
      });
    }

    // Accept optional filters: month (1-12) and classId
    const monthParam = searchParams.get("month");
    const classId = searchParams.get("classId");

    // Base payment filter
    let baseStudentFilter: any = { class: { academicYearId: academicYear.id } };
    if (classId) baseStudentFilter = { classId };

    // Build payment where clause and optionally narrow by month
    const basePaymentWhere: any = {
      status: "BERHASIL",
      student: baseStudentFilter,
    };

    let paymentsWhere = basePaymentWhere;

    if (monthParam) {
      const monthInt = parseInt(monthParam, 10);
      // Determine calendar year for the selected month within the academic year
      const calendarYear = monthInt >= 7 ? academicYear.startDate.getFullYear() : academicYear.endDate.getFullYear();
      const monthStart = new Date(calendarYear, monthInt - 1, 1);
      const monthEnd = new Date(calendarYear, monthInt, 0, 23, 59, 59, 999);

      paymentsWhere = {
        ...basePaymentWhere,
        OR: [
          { batch: { academicYearId: academicYear.id, month: monthInt } },
          { createdAt: { gte: monthStart, lte: monthEnd } },
        ],
      };
    }

    // Get all matching payments for monthly breakdown (include batch info)
    const payments = await prisma.payment.findMany({
      where: paymentsWhere,
      select: {
        amount: true,
        createdAt: true,
        batch: { select: { month: true, year: true, academicYearId: true } },
      },
    });

    // Process monthly data
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyData = Array(12).fill(0);

    payments.forEach((payment) => {
      // Prefer batch month if payment is attached to a batch in this academic year
      let monthIndex = -1;
      if (
        payment.batch &&
        payment.batch.academicYearId === academicYear.id &&
        typeof payment.batch.month === "number"
      ) {
        monthIndex = payment.batch.month - 1;
      } else {
        monthIndex = new Date(payment.createdAt).getMonth();
      }
      if (monthIndex >= 0 && monthIndex < 12)
        monthlyData[monthIndex] += payment.amount;
    });

    const monthlyRevenue = months.map((month, index) => ({
      month,
      amount: monthlyData[index],
    }));

    // Get revenue by class
    // Fetch classes (optionally a single class if filtered)
    const classes = await prisma.class.findMany({
      where: classId ? { id: classId, academicYearId: academicYear.id } : { academicYearId: academicYear.id },
    });

    const byClassData = await Promise.all(
      classes.map(async (cls) => {
        // Build where for class aggregates, apply same month filter if present
        let classWhere: any = {
          status: "BERHASIL",
          student: { classId: cls.id },
        };

        if (monthParam) {
          const monthInt = parseInt(monthParam, 10);
          const calendarYear = monthInt >= 7 ? academicYear.startDate.getFullYear() : academicYear.endDate.getFullYear();
          const monthStart = new Date(calendarYear, monthInt - 1, 1);
          const monthEnd = new Date(calendarYear, monthInt, 0, 23, 59, 59, 999);

          classWhere = {
            ...classWhere,
            OR: [
              { batch: { academicYearId: academicYear.id, month: monthInt } },
              { createdAt: { gte: monthStart, lte: monthEnd } },
            ],
          };
        } else {
          // default to academic year range or batch
          classWhere = {
            ...classWhere,
            OR: [
              { batch: { academicYearId: academicYear.id } },
              { createdAt: { gte: academicYear.startDate, lte: academicYear.endDate } },
            ],
          };
        }

        const total = await prisma.payment.aggregate({
          where: classWhere,
          _sum: { amount: true },
        });

        return {
          className: cls.name,
          total: total._sum.amount || 0,
        };
      }),
    );

    // Student stats
    const studentStats = {
      lunas: await prisma.student.count({
        where: { status: "LUNAS" },
      }),
      menunggak: await prisma.student.count({
        where: { status: "MENUNGGAK" },
      }),
    };

    return NextResponse.json({
      monthlyRevenue,
      byClassData,
      studentStats,
    });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 },
    );
  }
}
