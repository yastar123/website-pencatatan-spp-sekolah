import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

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

    // Build where clause: include payments that either belong to the academic year's batches
    // OR have createdAt within the academic year range. This ensures payments that were
    // recorded later but attached to earlier batches (via FIFO) are still included.
    const baseWhere: any = { status: "BERHASIL" };
    if (classId) baseWhere.student = { classId };

    let where: any = {};
    if (batchId) {
      where = { ...baseWhere, batchId };
    } else if (monthParam && monthParam !== "all") {
      const monthInt = Number(monthParam);
      // determine calendar year for the selected month within the academic year
      const calendarYear = monthInt >= 7 ? new Date(academicYear.startDate).getFullYear() : new Date(academicYear.endDate).getFullYear();
      const monthStart = new Date(calendarYear, monthInt - 1, 1);
      const monthEnd = new Date(calendarYear, monthInt, 0, 23, 59, 59, 999);
      where = {
        ...baseWhere,
        OR: [
          { batch: { academicYearId: academicYear.id, month: monthInt } },
          { createdAt: { gte: monthStart, lte: monthEnd } },
        ],
      };
    } else {
      // default: include any payment attached to this academic year's batches,
      // or any payment created within the academic year range
      where = {
        ...baseWhere,
        OR: [
          { batch: { academicYearId: academicYear.id } },
          { createdAt: { gte: academicYear.startDate, lte: academicYear.endDate } },
        ],
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { student: { include: { class: true } }, batch: true },
      orderBy: { createdAt: "asc" },
    });

    // Build pivot by student and month within the academic year range.
    const studentWhere: any = {};
    if (classId) studentWhere.classId = classId;
    const students = await prisma.student.findMany({ where: studentWhere, include: { class: true }, orderBy: { name: "asc" } });

    const studentsMap = new Map<string, any>();
    students.forEach((st) => {
      studentsMap.set(st.id, { id: st.id, nis: st.nis, nisn: st.nisn ?? "", name: st.name, className: st.class?.name || "", months: {} });
    });

    // Prepare academic year months list (from startDate to endDate)
    const monthsList: { month: number; year: number; label: string }[] = [];
    let cur = new Date(academicYear.startDate);
    cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const end = new Date(academicYear.endDate);
    const monthLabelNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    while (cur <= end) {
      monthsList.push({ month: cur.getMonth() + 1, year: cur.getFullYear(), label: monthLabelNames[cur.getMonth()].toUpperCase() });
      cur.setMonth(cur.getMonth() + 1);
    }

    // Index payments into student.months keyed by 'YYYY-M'
    payments.forEach((p) => {
      const sid = p.student?.id || null;
      if (!sid) return;
      if (!studentsMap.has(sid)) {
        studentsMap.set(sid, {
          id: sid,
          nis: p.student?.nis || "",
          nisn: p.student?.nisn ?? "",
          name: p.student?.name || "",
          className: p.student?.class?.name || "",
          months: {},
        });
      }
      const s = studentsMap.get(sid);
      // Prefer batch.month only when the batch belongs to the selected academic year
      let pMonth: number;
      let pYear: number;
      if (p.batch && p.batch.academicYearId === academicYear.id && p.batch.month && p.batch.year) {
        pMonth = p.batch.month;
        pYear = p.batch.year;
      } else {
        const dt = new Date(p.createdAt);
        pMonth = dt.getMonth() + 1;
        pYear = dt.getFullYear();
      }
      const key = `${pYear}-${String(pMonth).padStart(2, "0")}`;
      if (!s.months[key]) {
        s.months[key] = { amount: p.amount, date: new Date(p.createdAt) };
      } else {
        s.months[key].amount += p.amount;
        if (new Date(p.createdAt) > s.months[key].date) s.months[key].date = new Date(p.createdAt);
      }
    });

    // Prepare worksheet data: header rows then student rows
    // Header: NO, NIS, NISN, NAMA SISWA, KELAS, then for each month two columns (amount, tanggal)
    const header: any[] = ["NO", "NIS", "NISN", "NAMA SISWA", "KELAS"];
    const subHeader: any[] = ["", "", "", "", ""];
    monthsList.forEach((m) => {
      header.push(m.label);
      header.push("");
      subHeader.push("Jumlah");
      subHeader.push("Tanggal");
    });
    header.push("Total (Rp)");
    subHeader.push("");

    const rows: any[] = [header, subHeader];
    let idx = 1;
    const studentList = Array.from(studentsMap.values());
    studentList.forEach((s) => {
      const row: any[] = [idx++, s.nis, s.nisn, s.name, s.className];
      let total = 0;
      monthsList.forEach((m) => {
        const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
        const data = s.months[key];
        if (data) {
          row.push(data.amount);
          row.push(formatDate(data.date));
          total += data.amount;
        } else {
          row.push("");
          row.push("");
        }
      });
      row.push(total);
      rows.push(row);
    });

    // Create workbook and sheet
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Optionally set column widths
    const colWidths = [{ wch: 4 }, { wch: 30 }];
    for (let i = 0; i < 24; i++) colWidths.push({ wch: 12 });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filenameParts = ["laporan", year.replace("/", "-"), classId || "all"];
    const filename = `${filenameParts.filter(Boolean).join("_")}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}

function formatDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
