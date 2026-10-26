// Emails Bret when Riley (Retell) finishes analyzing an inbound call.
// Retell posts call_started / call_ended / call_analyzed; only call_analyzed is used.
// No secrets here: requests are accepted only from Retell's published webhook IP.

const RETELL_IPS = ['100.20.5.228'];
const FORMSPREE_URL = 'https://formspree.io/f/mnjrlnyq';
const ROBOCALL = /automated message|listing verification|google voice search|press (one|1) to/i;

function fmtPhone(n) {
  const d = String(n || '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (n || 'unknown');
}

function fmtTime(ms) {
  if (!ms) return 'unknown time';
  return new Date(ms).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' });
}

export default async (req, context) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!RETELL_IPS.includes(context.ip)) return new Response('Forbidden', { status: 403 });

  let payload;
  try { payload = await req.json(); } catch { return new Response(null, { status: 400 }); }

  const call = payload.call || {};
  if (payload.event !== 'call_analyzed' || call.direction !== 'inbound') return new Response(null, { status: 204 });

  const analysis = call.call_analysis || {};
  const summary = analysis.call_summary || '(no summary)';
  const transcript = (call.transcript || '').trim();
  if (ROBOCALL.test(summary) || ROBOCALL.test(transcript)) return new Response(null, { status: 204 });

  const seconds = call.end_timestamp && call.start_timestamp ? Math.round((call.end_timestamp - call.start_timestamp) / 1000) : null;
  const caller = fmtPhone(call.from_number);
  const hungUp = !transcript.includes('User:');

  const body = {
    _subject: `Riley call from ${caller}${hungUp ? ' (hung up)' : ''}`,
    request_type: 'Riley phone call',
    caller_phone: caller,
    call_time: fmtTime(call.start_timestamp),
    duration_seconds: seconds,
    summary,
    call_successful: analysis.call_successful,
    ended_because: call.disconnection_reason || '',
    transcript: transcript.slice(0, 4000),
    retell_call_id: call.call_id || '',
  };

  try {
    await fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Referer: 'https://nwpa-roofing-quotes.net/' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('Formspree send failed', err);
  }
  return new Response(null, { status: 204 });
};

export const config = { path: '/api/retell-call-alert' };
