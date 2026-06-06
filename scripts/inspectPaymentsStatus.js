const { PrismaClient } = require("@prisma/client");
(async () => {
  const prisma = new PrismaClient();
  try {
    const student = await prisma.student.findFirst({
      where: { name: "testing" },
    });
    console.log(
      "student:",
      student ? student.id + " - " + student.name : "not found",
    );
    if (!student) return process.exit(0);
    const payments = await prisma.payment.findMany({
      where: { studentId: student.id },
      include: { batch: true },
      orderBy: { createdAt: "asc" },
    });
    console.log(`Found ${payments.length} payments for testing`);
    payments.forEach((p) => {
      console.log(
        p.id,
        p.status,
        p.amount,
        p.batch ? `${p.batch.month}/${p.batch.year}` : "no-batch",
        p.createdAt,
      );
    });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
