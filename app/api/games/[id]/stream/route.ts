import { requireUser } from '../../../../../server/auth';
import { readGame } from '../../../../../server/games';
import { failure } from '../../../../../server/http';
import { db } from '../../../../../server/db';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(),
      id = (await params).id;
    await readGame(id, user.id);
    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setTimeout> | undefined,
      closed = false,
      last = -1,
      presenceAt = 0;
    const stream = new ReadableStream({
      start(controller) {
        const close = () => {
          if (closed) return;
          closed = true;
          if (timer) clearTimeout(timer);
          try {
            controller.close();
          } catch {}
        };
        req.signal.addEventListener('abort', close, { once: true });
        const poll = async () => {
          if (closed) return;
          try {
            const refreshPresence = Date.now() - presenceAt > 30000;
            if (refreshPresence) {
              const current = await db.user.update({
                where: { id: user.id },
                data: { lastSeen: new Date() },
              });
              if (current.sessionVersion !== user.sessionVersion) {
                close();
                return;
              }
              presenceAt = Date.now();
            }
            const state = await readGame(id, user.id);
            if (closed) return;
            if (state.version !== last || refreshPresence) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`));
              last = state.version;
            } else controller.enqueue(encoder.encode(': heartbeat\n\n'));
            timer = setTimeout(poll, 1000);
          } catch {
            close();
          }
        };
        void poll();
      },
      cancel() {
        closed = true;
        if (timer) clearTimeout(timer);
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (e) {
    return failure(e);
  }
}
