const { PrismaClient } = require("@prisma/client");
(async () => {
  const prisma = new PrismaClient();
  try {
    const payments = await prisma.payment.findMany({
      where: { paymentType: "SPP" },
      include: { batch: true, student: true },
      orderBy: { createdAt: "asc" },
    });
    console.log(`Found ${payments.length} SPP payments`);
    const map = new Map();
    for (const p of payments) {
      const key = `${p.batch ? p.batch.month : "null"}/${p.batch ? p.batch.year : "null"}`;
      if (!map.has(key)) map.set(key, []);
      map
        .get(key)
        .push({
          id: p.id,
          createdAt: p.createdAt,
          student: p.student?.name,
          amount: p.amount,
        });
    }
    for (const [k, arr] of map.entries()) {
      console.log(`Batch ${k}: ${arr.length} payments`);
      console.log(arr.slice(0, 10));
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
