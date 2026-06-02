import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export async function GET() {
  try {
    const session = await getSession();
    if (session?.role !== 'BENDAHARA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Read the database file
    const dbPath = resolve(process.cwd(), 'prisma/dev.db');
    const dbBuffer = readFileSync(dbPath);

    return new NextResponse(dbBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="backup-${new Date().toISOString().split('T')[0]}.db"`,
      },
    });
  } catch (error) {
    console.error('Backup export error:', error);
    return NextResponse.json({ error: 'Failed to export database' }, { status: 500 });
  }
}
