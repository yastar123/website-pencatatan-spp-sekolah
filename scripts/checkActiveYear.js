const { PrismaClient } = require("@prisma/client");
(async () => {
  const prisma = new PrismaClient();
  try {
    const ay = await prisma.academicYear.findFirst({ where: { active: true } });
    console.log("activeYear:", ay);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
