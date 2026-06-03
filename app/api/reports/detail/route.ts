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

    // ── 2. Tentukan filter tanggal pembayaran ──────────────────────────
    const dateFilter: any = {};

    if (calYear && month) {
      // ── Perbulan: hanya bulan + tahun tertentu ─────────────────────
      dateFilter.gte = new Date(calYear, month - 1, 1);
      dateFilter.lt = new Date(calYear, month, 1);
    } else if (academicYearId) {
      // ── Pertahun: cari nama tahun ajaran, ekstrak rentang kalender ──
      const ay = await prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { year: true },
      });
      if (ay) {
        const range = parseAcademicYearRange(ay.year);
        if (range) {
          dateFilter.gte = new Date(range.startYear, 0, 1); // 1 Jan startYear
          dateFilter.lt = new Date(range.endYear + 1, 0, 1); // 1 Jan (endYear+1)
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
    if (Object.keys(dateFilter).length > 0) {
      paymentWhere.createdAt = dateFilter;
    }

    const payments = await prisma.payment.findMany({
      where: paymentWhere,
      orderBy: { createdAt: "asc" },
    });

    // ── 4. Map studentId → payments[] ─────────────────────────────────
    const paymentMap = new Map<string, any[]>();
    studentIds.forEach((id: string) => paymentMap.set(id, []));
    payments.forEach((p: any) => paymentMap.get(p.studentId)?.push(p));

    // ── 5. Susun rows ──────────────────────────────────────────────────
    const rows = students.map((s: any) => {
      const sp = paymentMap.get(s.id) ?? [];
      const berhasil = sp.filter((p: any) => p.status === "BERHASIL");
      const totalBayar = berhasil.reduce(
        (sum: number, p: any) => sum + p.amount,
        0,
      );
      const hasPaid = berhasil.length > 0;
      return {
        studentId: s.id,
        nis: s.nis,
        nisn: s.nisn ?? "-",
        name: s.name,
        gender: s.gender ?? "-",
        className: s.class?.name ?? "-",
        payments: sp,
        totalBayar,
        hasPaid,
        statusLabel: hasPaid ? "Lunas" : "Nunggak",
      };
    });

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("Detail report error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data laporan" },
      { status: 500 },
    );
  }
}
