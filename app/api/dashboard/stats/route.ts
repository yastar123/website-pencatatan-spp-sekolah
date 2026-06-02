import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total balance from all successful payments
    const totalBalance = await prisma.payment.aggregate({
      where: { status: 'BERHASIL' },
      _sum: { amount: true },
    });

    // Count students by payment status
    const studentsLunas = await prisma.student.count({
      where: { status: 'LUNAS' },
    });

    const studentsMenunggak = await prisma.student.count({
      where: { status: 'MENUNGGAK' },
    });

    // Get monthly revenue data for chart
    const monthlyData = await prisma.payment.groupBy({
      by: ['createdAt'],
      where: { status: 'BERHASIL' },
      _sum: { amount: true },
    });

    // Process monthly data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenue = Array(12).fill(0);
    
    monthlyData.forEach((item) => {
      const month = new Date(item.createdAt).getMonth();
      monthlyRevenue[month] += item._sum.amount || 0;
    });

    const chartData = months.map((month, index) => ({
      month,
      revenue: monthlyRevenue[index],
    }));

    // Get recent transactions
    const recentTransactions = await prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { name: true, nis: true } } },
    });

    return NextResponse.json({
      totalBalance: totalBalance._sum.amount || 0,
      studentsLunas,
      studentsMenunggak,
      chartData,
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        studentName: t.student.name,
        studentNis: t.student.nis,
        amount: t.amount,
        status: t.status,
        date: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
