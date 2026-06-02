import { cookies } from 'next/headers';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: 'BENDAHARA' | 'SISWA';
}

export async function createSession(payload: SessionPayload) {
  const cookieStore = await cookies();
  
  // Store session data as JSON in cookie
  cookieStore.set('session_data', JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return JSON.stringify(payload);
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionData = cookieStore.get('session_data')?.value;

    if (!sessionData) {
      return null;
    }

    const parsed = JSON.parse(sessionData) as SessionPayload;
    return parsed;
  } catch (err) {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session_data');
}
