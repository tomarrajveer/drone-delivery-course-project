import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Admin credentials are not configured on the server.' },
        { status: 500 }
      );
    }

    const inputEmail = (email ?? '').trim().toLowerCase();
    const inputPassword = (password ?? '').trim();

    if (inputEmail !== adminEmail || inputPassword !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid admin email or password.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      admin: {
        email: adminEmail,
        name: 'Admin',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
