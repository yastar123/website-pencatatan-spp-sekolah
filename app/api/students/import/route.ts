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
        await (prisma.student.create as any)({
          data: {
            nis,
            nisn: row.nisn?.toString().trim() || null,
            name,
            gender: row.gender?.toString().trim().toUpperCase() || null,
            classId,
            status: "MENUNGGAK",
          },
        });
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
