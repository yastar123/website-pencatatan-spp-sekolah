const { PrismaClient } = require("@prisma/client");
(async () => {
  const prisma = new PrismaClient();
  try {
    const ay = await prisma.academicYear.findFirst();
    console.log("Using academicYear:", ay?.year, ay?.id);
    if (!ay) return;
    // build months between startDate and endDate
    const months = [];
    let cur = new Date(ay.startDate);
    cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const end = new Date(ay.endDate);
    while (cur <= end) {
      months.push({ month: cur.getMonth() + 1, year: cur.getFullYear() });
      cur.setMonth(cur.getMonth() + 1);
    }
    console.log("Months count:", months.length);

    const students = await prisma.student.findMany({
      include: { class: true },
    });
    for (const s of students) {
      const rate =
        (await prisma.sPPRate.findFirst({
          where: { classId: s.classId, academicYearId: ay.id },
        })) ||
        (await prisma.sPPRate.findFirst({
          where: { classId: s.classId },
          orderBy: { createdAt: "desc" },
        }));
      const amountPerMonth = rate?.amount ?? 0;
      const expectedTotal = amountPerMonth * months.length;
      const payments = await prisma.payment.findMany({
        where: {
          studentId: s.id,
          paymentType: "SPP",
          batch: { academicYearId: ay.id },
        },
        include: { batch: true },
      });
      const paid = payments
        .filter((p) => p.status === "BERHASIL")
        .reduce((a, b) => a + b.amount, 0);
      const outstanding = Math.max(0, expectedTotal - paid);
      console.log(
        s.name,
        "class",
        s.class?.name,
        "rate",
        amountPerMonth,
        "expected",
        expectedTotal,
        "paid",
        paid,
        "outstanding",
        outstanding,
      );
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
