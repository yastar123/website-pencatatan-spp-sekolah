import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Ekstrak rentang tahun kalender dari nama tahun ajaran.
 * "2025/2026" → { startYear: 2025, endYear: 2026 }
 * "2023/2024" → { startYear: 2023, endYear: 2024 }
 */
function parseAcademicYearRange(yearName: string) {
  const m = yearName.match(/^(\d{4})\/(\d{4})$/);
  if (m) return { startYear: parseInt(m[1]), endYear: parseInt(m[2]) };
  // Fallback: coba parse 4 digit saja
  const n = yearName.match(/(\d{4})/);
  if (n) {
    const y = parseInt(n[1]);
    return { startYear: y, endYear: y };
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const calYear = sp.get("calYear") ? parseInt(sp.get("calYear")!) : null;
    const month = sp.get("month") ? parseInt(sp.get("month")!) : null;
    const academicYearId = sp.get("academicYearId") ?? null;
    const classId = sp.get("classId") ?? null;
    const studentId = sp.get("studentId") ?? null;

    // ── 1. Tentukan daftar siswa ───────────────────────────────────────
    let students: any[] = [];

    if (studentId) {
      const s = await prisma.student.findUnique({
        where: { id: studentId },
        include: { class: true },
      });
      if (s) students = [s];
    } else if (classId) {
      students = await prisma.student.findMany({
        where: { classId },
        include: { class: true },
        orderBy: { name: "asc" },
      });
    } else if (academicYearId) {
      students = await prisma.student.findMany({
        where: { class: { academicYearId } },
        include: { class: true },
        orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
      });
    } else {
      students = await prisma.student.findMany({
        include: { class: true },
        orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
      });
    }

    // ── 2. Tentukan filter batches / tanggal pembayaran ────────────────
    const dateFilter: any = {};
    let batchMonthFilter: number | null = null;
    let batchYearFilter: number | null = null;

    if (calYear && month) {
      // ── Perbulan: hanya bulan + tahun tertentu ─────────────────────
      batchYearFilter = calYear;
      batchMonthFilter = month;
      // Also set date filter as fallback for payments without batch
      dateFilter.gte = new Date(calYear, month - 1, 1);
      dateFilter.lt = new Date(calYear, month, 1);
    } else if (month && academicYearId) {
      // ── Perbulan dengan academic year context: ekstrak tahun kalender
      const ay = await prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { year: true },
      });
      if (ay) {
        const range = parseAcademicYearRange(ay.year);
        if (range) {
          // Academic year spans from Jul (startYear) to Jun (endYear+1)
          // If month is in Jul-Dec, use startYear
          // If month is in Jan-Jun, use endYear
          if (month >= 7) {
            batchYearFilter = range.startYear;
          } else {
            batchYearFilter = range.endYear;
          }
          batchMonthFilter = month;
          dateFilter.gte = new Date(batchYearFilter, month - 1, 1);
          dateFilter.lt = new Date(batchYearFilter, month, 1);
        }
      }
    } else if (academicYearId) {
      // ── Pertahun: cari nama tahun ajaran, ekstrak rentang kalender ──
      const ay = await prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { year: true },
      });
      if (ay) {
        const range = parseAcademicYearRange(ay.year);
        if (range) {
          // Academic year spans July(startYear) -> June(endYear)
          dateFilter.gte = new Date(range.startYear, 6, 1); // 1 Jul startYear
          dateFilter.lt = new Date(range.endYear, 6, 1); // 1 Jul (endYear)
        }
      }
    } else if (calYear && !month) {
      // ── Fallback: tahun kalender saja (tanpa academicYearId) ────────
      dateFilter.gte = new Date(calYear, 0, 1);
      dateFilter.lt = new Date(calYear + 1, 0, 1);
    }
    // Siswa-pendidikan: tidak ada filter tanggal (tampilkan semua)

    // ── 3. Ambil pembayaran ────────────────────────────────────────────
    const studentIds = students.map((s: any) => s.id);

    const paymentWhere: any = { studentId: { in: studentIds } };
    // If we have academicYear or explicit batch month/year, prefer matching by batch
    if (
      batchMonthFilter !== null &&
      batchYearFilter !== null &&
      academicYearId
    ) {
      paymentWhere.OR = [
        {
          batch: {
            month: batchMonthFilter,
            year: batchYearFilter,
            academicYearId,
          },
        },
        { createdAt: dateFilter },
      ];
    } else if (academicYearId) {
      paymentWhere.OR = [
        { batch: { academicYearId } },
        { createdAt: dateFilter },
      ];
    } else if (Object.keys(dateFilter).length > 0) {
      paymentWhere.createdAt = dateFilter;
    }

    let payments = await prisma.payment.findMany({
      where: paymentWhere,
      include: { batch: true },
      orderBy: { createdAt: "asc" },
    });

    // Filter by batch month/year if specified
    if (batchMonthFilter !== null && batchYearFilter !== null) {
      payments = payments.filter(
        (p: any) =>
          p.batch &&
          p.batch.month === batchMonthFilter &&
          p.batch.year === batchYearFilter,
      );
    } else if (batchMonthFilter !== null || batchYearFilter !== null) {
      // Filter by available batch fields
      payments = payments.filter((p: any) => {
        if (!p.batch) return false;
        if (batchMonthFilter !== null && p.batch.month !== batchMonthFilter)
          return false;
        if (batchYearFilter !== null && p.batch.year !== batchYearFilter)
          return false;
        return true;
      });
    }

    // ── 4. Map studentId → payments[] ─────────────────────────────────
    const paymentMap = new Map<string, any[]>();
    studentIds.forEach((id: string) => paymentMap.set(id, []));
    payments.forEach((p: any) => paymentMap.get(p.studentId)?.push(p));

    // ── 5. Susun rows ──────────────────────────────────────────────────
    // Compute expected SPP per student based on spp rate and selected months
    let academicYear: any = null;
    let monthsForCalculation: { month: number; year: number }[] = [];
    if (academicYearId) {
      academicYear = await prisma.academicYear.findUnique({
        where: { id: academicYearId },
      });
      if (academicYear) {
        if (batchMonthFilter === null) {
          // build full academic year months between startDate and endDate
          let cur = new Date(academicYear.startDate);
          cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
          const end = new Date(academicYear.endDate);
          while (cur <= end) {
            monthsForCalculation.push({
              month: cur.getMonth() + 1,
              year: cur.getFullYear(),
            });
            cur.setMonth(cur.getMonth() + 1);
          }
        } else {
          // single month selected within academic year
          monthsForCalculation.push({
            month: batchMonthFilter,
            year: batchYearFilter!,
          });
        }
      }
    }

    const rows = await Promise.all(
      students.map(async (s: any) => {
        const sp = paymentMap.get(s.id) ?? [];
        const berhasil = sp.filter((p: any) => p.status === "BERHASIL");
        const totalBayar = berhasil.reduce(
          (sum: number, p: any) => sum + p.amount,
          0,
        );

        let expectedTotal = 0;
        let monthsCount = monthsForCalculation.length;
        let rate: any = null;
        if (academicYear && monthsCount > 0) {
          rate = await prisma.sPPRate.findFirst({
            where: {
              classId: s.classId,
              academicYearId: academicYearId ?? undefined,
            },
          });
          if (!rate) {
            // fallback: use latest rate for the class if available
            rate = await prisma.sPPRate.findFirst({
              where: { classId: s.classId },
              orderBy: { createdAt: "desc" },
            });
          }
          const amountPerMonth = rate?.amount ?? 0;
          expectedTotal = amountPerMonth * monthsCount;
        }

        const outstanding = Math.max(0, expectedTotal - totalBayar);
        // compute remaining months based on outstanding and per-month amount
        const amountPerMonth = rate?.amount ?? 0;
        const remainingMonths =
          amountPerMonth > 0 ? Math.ceil(outstanding / amountPerMonth) : 0;
        let statusLabel = "-";
        if (expectedTotal === 0) {
          statusLabel = totalBayar > 0 ? "Lunas" : "-";
        } else {
          if (outstanding > 0) {
            statusLabel = `Nunggak· Rp ${outstanding.toLocaleString("id-ID")} (${remainingMonths} bulan)`;
          } else {
            statusLabel = "Lunas";
          }
        }

        return {
          studentId: s.id,
          nis: s.nis,
          nisn: s.nisn ?? "-",
          name: s.name,
          gender: s.gender ?? "-",
          className: s.class?.name ?? "-",
          payments: sp,
          totalBayar,
          expectedTotal,
          monthsCount,
          outstanding,
          statusLabel,
        };
      }),
    );

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("Detail report error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data laporan" },
      { status: 500 },
    );
  }
}
