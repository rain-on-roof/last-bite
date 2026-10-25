// A challenge travels in the URL hash, so sharing needs no server.
const MAX_SCORE = 99999;

export function encodeChallenge(score) {
  return '#beat=' + Math.max(1, Math.min(MAX_SCORE, Math.floor(score)));
}

export function parseChallenge(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const raw = params.get('beat');
  if (!raw || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= MAX_SCORE ? n : null;
}

export function challengeUrl(score, location = globalThis.location) {
  return location.origin + location.pathname + encodeChallenge(score);
}

// Web Share where the platform has it (phones), clipboard otherwise.
export async function shareChallenge({ url, text, title }) {
  if (navigator.share) {
    try {
      await navigator.share({ url, text, title });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(text + ' ' + url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
