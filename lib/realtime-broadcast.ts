/**
 * Server-to-client Realtime broadcast over HTTP.
 *
 * This is how the waiting room gets live joiners without `registrants` — which
 * holds emails and phone numbers — ever being exposed to Realtime. Postgres
 * changes on that table would hand every anonymous subscriber the whole row;
 * broadcasting instead lets the server choose exactly what leaves the building,
 * which here is a first name and a flag.
 *
 * HTTP rather than a websocket because this runs in a serverless request that
 * ends immediately afterwards.
 */
export async function broadcast(
  topic: string,
  event: string,
  payload: Record<string, unknown>
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ messages: [{ topic, event, payload }] }),
    });
  } catch {
    // Social proof is decoration — never fail a registration over it. The
    // waiting room's reconcile poll picks the joiner up either way.
  }
}

export const waitingRoomTopic = (webinarId: string) => `waiting-room:${webinarId}`;
