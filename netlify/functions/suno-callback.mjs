// Suno API requires a callBackUrl on every task. The app polls for results instead,
// so this endpoint simply acknowledges the callback and discards the payload.
export default async () =>
  new Response(JSON.stringify({ code: 200, msg: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
