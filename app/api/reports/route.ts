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

    // Filter payments by students whose class belongs to this academic year
    // (avoids relying on createdAt date range which breaks for newly entered data)
    const paymentWhere = {
      status: "BERHASIL",
      student: { class: { academicYearId: academicYear.id } },
    };

    // Get all matching payments for monthly breakdown
    const payments = await prisma.payment.findMany({
      where: paymentWhere,
      select: { amount: true, createdAt: true },
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
      const month = new Date(payment.createdAt).getMonth();
      monthlyData[month] += payment.amount;
    });

    const monthlyRevenue = months.map((month, index) => ({
      month,
      amount: monthlyData[index],
    }));

    // Get revenue by class
    const classes = await prisma.class.findMany({
      where: { academicYearId: academicYear.id },
    });

    const byClassData = await Promise.all(
      classes.map(async (cls) => {
        const total = await prisma.payment.aggregate({
          where: {
            status: "BERHASIL",
            student: { classId: cls.id },
          },
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
