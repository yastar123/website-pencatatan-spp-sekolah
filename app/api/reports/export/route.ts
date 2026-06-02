import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function csvEscape(value: any) {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year") || "2023/2024";
    const monthParam = searchParams.get("month"); // optional, 1-12 or 'all'
    const classId = searchParams.get("classId");

    const academicYear = await prisma.academicYear.findFirst({
      where: { year },
    });
    if (!academicYear)
      return NextResponse.json(
        { error: "Academic year not found" },
        { status: 404 },
      );

    // If month provided, try to find a Batch for that month within the academic year
    let batchId: string | undefined;
    if (monthParam && monthParam !== "all") {
      const monthNum = Number(monthParam);
      const batch = await prisma.batch.findFirst({
        where: { month: monthNum, academicYearId: academicYear.id },
      });
      if (batch) batchId = batch.id;
    }

    // Build where clause
    const where: any = {
      status: "BERHASIL",
      createdAt: {
        gte: academicYear.startDate,
        lte: academicYear.endDate,
      },
    };

    if (classId) {
      where.student = { classId };
    }

    if (batchId) {
      where.batchId = batchId;
    } else if (monthParam && monthParam !== "all") {
      // fallback: filter by createdAt month within academicYear range
      const monthNum = Number(monthParam) - 1; // JS Date month index
      // find the first date in the academic year with that month
      const start = new Date(academicYear.startDate);
      let monthStart = new Date(start.getFullYear(), monthNum, 1);
      if (monthStart < academicYear.startDate) {
        monthStart = new Date(start.getFullYear() + 1, monthNum, 1);
      }
      const monthEnd = new Date(
        monthStart.getFullYear(),
        monthNum + 1,
        0,
        23,
        59,
        59,
        999,
      );
      // clamp to academic year
      const gte =
        monthStart < academicYear.startDate
          ? academicYear.startDate
          : monthStart;
      const lte =
        monthEnd > academicYear.endDate ? academicYear.endDate : monthEnd;
      where.createdAt = { gte, lte };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { student: { include: { class: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Build CSV
    const headers = [
      "Transaction No",
      "Date",
      "NIS",
      "Student Name",
      "Class",
      "Payment Type",
      "Amount",
      "Payment Method",
      "Status",
      "Notes",
    ];

    const rows = payments.map((p) => [
      p.transactionNo,
      new Date(p.createdAt).toISOString(),
      p.student?.nis || "",
      p.student?.name || "",
      p.student?.class?.name || "",
      p.paymentType,
      p.amount,
      p.paymentMethod,
      p.status,
      p.notes || "",
    ]);

    const csv = [headers.map(csvEscape).join(",")]
      .concat(rows.map((r) => r.map(csvEscape).join(",")))
      .join("\n");

    const filenameParts = [
      "laporan",
      year.replace("/", "-"),
      monthParam || "all",
      classId || "all",
    ];
    const filename = `${filenameParts.filter(Boolean).join("_")}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
