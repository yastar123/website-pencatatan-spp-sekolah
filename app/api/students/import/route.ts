import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ImportRow {
  nis: string;
  nisn?: string;
  name: string;
  gender?: string;
  className: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== "BENDAHARA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { students }: { students: ImportRow[] } = await request.json();

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: "Data siswa tidak boleh kosong" },
        { status: 400 },
      );
    }

    // Ambil tahun ajaran aktif (fallback ke yang pertama)
    const activeYear =
      (await prisma.academicYear.findFirst({ where: { active: true } })) ??
      (await prisma.academicYear.findFirst({ orderBy: { createdAt: "desc" } }));

    if (!activeYear) {
      return NextResponse.json(
        {
          error:
            "Tidak ada tahun ajaran. Buat tahun ajaran terlebih dahulu di Pengaturan.",
        },
        { status: 400 },
      );
    }

    // Buat map nama kelas (lowercase) → id dari DB
    const allClasses = await prisma.class.findMany({
      select: { id: true, name: true },
    });
    // Map menyimpan nama asli juga agar bisa dipakai saat create
    const classMap = new Map<string, string>(); // lowercase → id
    allClasses.forEach((c) => classMap.set(c.name.toLowerCase().trim(), c.id));

    let successCount = 0;
    const errors: { row: number; nis: string; reason: string }[] = [];

    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      const rowNum = i + 1;

      // Validasi NIS
      if (!row.nis || !row.nis.toString().trim()) {
        errors.push({ row: rowNum, nis: "-", reason: "NIS kosong" });
        continue;
      }

      const nis = row.nis.toString().trim();
      const name = row.name?.toString().trim();

      if (!name) {
        errors.push({ row: rowNum, nis, reason: "Nama kosong" });
        continue;
      }

      // Cari atau buat kelas
      const classNameRaw = row.className?.toString().trim() || "";
      const classKey = classNameRaw.toLowerCase();
      let classId = classKey ? classMap.get(classKey) : undefined;

      if (!classId && classNameRaw) {
        // Kelas belum ada → buat otomatis dengan tahun ajaran aktif
        try {
          const newClass = await prisma.class.create({
            data: {
              name: classNameRaw,
              academicYearId: activeYear.id,
            },
          });
          classId = newClass.id;
          classMap.set(classKey, classId); // simpan ke map agar baris berikutnya bisa pakai
        } catch {
          // Mungkin race condition / duplikat — coba cari lagi
          const existing = await prisma.class.findFirst({
            where: { name: classNameRaw },
          });
          if (existing) {
            classId = existing.id;
            classMap.set(classKey, classId);
          }
        }
      }

      if (!classId) {
        errors.push({
          row: rowNum,
          nis,
          reason: "Nama kelas kosong",
        });
        continue;
      }

      try {
        const created = await (prisma.student.create as any)({
          data: {
            nis,
            nisn: row.nisn?.toString().trim() || null,
            name,
            gender: row.gender?.toString().trim().toUpperCase() || null,
            classId,
            status: "MENUNGGAK",
          },
        });

        // create initial monthly tunggakan for this student using PMS/SPP rate
        try {
          const cls = await prisma.class.findUnique({ where: { id: classId } });
          const ayId = cls?.academicYearId || activeYear.id;
          const academicYear = await prisma.academicYear.findUnique({
            where: { id: ayId },
          });
          if (academicYear) {
            const rate = await prisma.sPPRate.findFirst({
              where: { classId, academicYearId: academicYear.id },
              orderBy: { createdAt: "desc" },
            });
            if (rate) {
              let cur = new Date(academicYear.startDate);
              const end = new Date(academicYear.endDate);
              const ops: Promise<any>[] = [];
              while (cur <= end) {
                const monthName = cur.toLocaleString("id-ID", {
                  month: "long",
                });
                const yearNum = cur.getFullYear();
                ops.push(
                  prisma.payment.create({
                    data: {
                      studentId: created.id,
                      paymentType: "PMS",
                      amount: rate.amount,
                      paymentMethod: "-",
                      status: "MENUNGGAK",
                      notes: `Tunggakan PMS bulan ${monthName} ${yearNum}`,
                      createdBy: session.userId,
                    },
                  }),
                );
                cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
              }
              await Promise.all(ops);
            } else {
              // No rate for this class in the academic year. Try fallback:
              // 1) find any rate in the same academic year (most recent)
              // 2) if found, create an sPPRate for this class with that amount
              // 3) then create monthly tunggakan as usual so import behaves like manual flow
              const fallback = await prisma.sPPRate.findFirst({
                where: { academicYearId: academicYear.id },
                orderBy: { createdAt: "desc" },
              });
              if (fallback) {
                const newRate = await prisma.sPPRate.create({
                  data: {
                    classId,
                    academicYearId: academicYear.id,
                    amount: fallback.amount,
                  },
                });
                try {
                  let cur = new Date(academicYear.startDate);
                  const end = new Date(academicYear.endDate);
                  const ops: Promise<any>[] = [];
                  while (cur <= end) {
                    const monthName = cur.toLocaleString("id-ID", { month: "long" });
                    const yearNum = cur.getFullYear();
                    ops.push(
                      prisma.payment.create({
                        data: {
                          studentId: created.id,
                          paymentType: "PMS",
                          amount: newRate.amount,
                          paymentMethod: "-",
                          status: "MENUNGGAK",
                          notes: `Tunggakan PMS bulan ${monthName} ${yearNum}`,
                          createdBy: session.userId,
                        },
                      }),
                    );
                    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
                  }
                  await Promise.all(ops);
                } catch (e) {
                  console.error("Failed to create debts with fallback rate:", e);
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to create debts for imported student:", e);
        }

        successCount++;
      } catch (err: any) {
        const isDuplicate =
          err?.code === "P2002" || err?.message?.includes("Unique constraint");
        errors.push({
          row: rowNum,
          nis,
          reason: isDuplicate
            ? "NIS atau NISN sudah terdaftar"
            : "Gagal menyimpan",
        });
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Import students error:", error);
    return NextResponse.json(
      { error: "Gagal mengimpor data siswa" },
      { status: 500 },
    );
  }
}
