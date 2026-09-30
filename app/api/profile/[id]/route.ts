import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { publicUser } from '../../../../server/auth';
import { failure, HttpError } from '../../../../server/http';
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await db.user.findUnique({
      where: { id: (await params).id },
      include: { achievements: true },
    });
    if (!user) throw new HttpError(404, 'Игрок не найден.');
    return NextResponse.json({
      user: publicUser(user),
      achievements: user.achievements.map((a) => ({ code: a.code })),
    });
  } catch (e) {
    return failure(e);
  }
}
