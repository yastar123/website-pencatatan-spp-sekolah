const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log('Scanning payments with paymentType === "PMS"...');
  const rows = await prisma.payment.findMany({
    where: { paymentType: "PMS" },
    select: {
      id: true,
      studentId: true,
      amount: true,
      status: true,
      createdAt: true,
      batch: { select: { month: true, year: true } },
    },
  });
  if (rows.length === 0) {
    console.log("No PMS payments found. Nothing to migrate.");
    return;
  }
  console.log(`Found ${rows.length} payments:`);
  rows.forEach((r) => {
    const m = r.batch ? `${r.batch.month}/${r.batch.year}` : "n/a";
    console.log(
      `${r.id} ${r.status} ${r.amount} ${m} ${r.createdAt.toISOString()}`,
    );
  });

  const confirm = true; // automatic migration
  if (!confirm) {
    console.log("Migration aborted by user.");
    return;
  }

  const res = await prisma.payment.updateMany({
    where: { paymentType: "PMS" },
    data: { paymentType: "SPP" },
  });
  console.log(`Updated ${res.count} rows to paymentType 'SPP'.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
