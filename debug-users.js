const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("Total users:", users.length);
  users.forEach((user) => {
    console.log(`- ${user.email}: ${user.role} (password hash: ${user.password.substring(0, 20)}...)`);
  });
  await prisma.$disconnect();
}

main().catch(console.error);
