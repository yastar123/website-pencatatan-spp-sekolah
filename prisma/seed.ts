import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log("Starting database seed...");

  // Clean up existing data
  try {
    await prisma.payment.deleteMany({});
    await prisma.batch.deleteMany({});
    await prisma.sPPRate.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.academicYear.deleteMany({});
    await prisma.user.deleteMany({});
    console.log("Database cleaned");
  } catch (e) {
    console.log("Error cleaning database (first run is OK):", e);
  }

  // Create Academic Year
  const academicYear = await prisma.academicYear.create({
    data: {
      year: "2023/2024",
      startDate: new Date("2023-07-01"),
      endDate: new Date("2024-06-30"),
    },
  });
  console.log("Created academic year:", academicYear.year);

  // Create Classes
  const classes = await Promise.all([
    prisma.class.create({
      data: {
        name: "8A",
        academicYearId: academicYear.id,
      },
    }),
    prisma.class.create({
      data: {
        name: "8B",
        academicYearId: academicYear.id,
      },
    }),
    prisma.class.create({
      data: {
        name: "9A",
        academicYearId: academicYear.id,
      },
    }),
  ]);
  console.log("Created classes:", classes.map((c) => c.name).join(", "));

  // Create SPP Rates
  const sppRate = await prisma.sPPRate.create({
    data: {
      classId: classes[0].id,
      academicYearId: academicYear.id,
      amount: 30000, // Rp 30.000
    },
  });
  console.log("Created SPP rate:", sppRate.amount);

  // Create Students
  const students = await Promise.all([
    prisma.student.create({
      data: {
        nis: "4236432",
        name: "Sarah Jones",
        classId: classes[0].id,
        address: "Kenkitan Santan",
        phoneOrangTua: "08112368303",
        status: "LUNAS",
      },
    }),
    prisma.student.create({
      data: {
        nis: "4236433",
        name: "John Doe",
        classId: classes[0].id,
        address: "Bakata Jamp 3",
        phoneOrangTua: "03112368300",
        status: "MENUNGGAK",
      },
    }),
    prisma.student.create({
      data: {
        nis: "4236434",
        name: "Jane Smith",
        classId: classes[1].id,
        address: "Manama Bankanu",
        phoneOrangTua: "03119368303",
        status: "LUNAS",
      },
    }),
  ]);
  console.log("Created students:", students.map((s) => s.name).join(", "));

  // Create Users
  const bendaharaPassword = await hashPassword("bendahara123");
  const siswaPassword = await hashPassword("siswa123");

  const bendahara = await prisma.user.create({
    data: {
      email: "bendahara@sekolah.com",
      password: bendaharaPassword,
      name: "Bendahara Admin",
      role: "BENDAHARA",
    },
  });
  console.log("Created bendahara user:", bendahara.email);

  const user1 = await prisma.user.create({
    data: {
      email: "sarah@sekolah.com",
      password: siswaPassword,
      name: "Sarah Jones",
      role: "SISWA",
      studentId: students[0].id,
    },
  });
  console.log("Created siswa user:", user1.email);

  // Create Batch for monthly tracking
  const batch = await prisma.batch.create({
    data: {
      month: 10,
      year: 2023,
      academicYearId: academicYear.id,
    },
  });
  console.log("Created batch:", `${batch.month}/${batch.year}`);

  // Create Sample Payments
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        studentId: students[0].id,
        paymentType: "SPP",
        amount: 30000,
        paymentMethod: "Transfer Bank",
        status: "BERHASIL",
        batchId: batch.id,
        notes: "Pembayaran SPP bulan Oktober",
      },
    }),
    prisma.payment.create({
      data: {
        studentId: students[1].id,
        paymentType: "SPP",
        amount: 30000,
        paymentMethod: "Tunai",
        status: "BERHASIL",
        batchId: batch.id,
        notes: "Pembayaran SPP bulan Oktober",
      },
    }),
  ]);
  console.log("Created payments:", payments.length);

  console.log("Database seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
