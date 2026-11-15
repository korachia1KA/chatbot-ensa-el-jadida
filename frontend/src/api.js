const json = async (r) => {
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.detail || r.statusText);
  }
  return r.json();
};
const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }).then(json);

export const api = {
  init: () => post('/api/init'),
  chat: (question, history) => post('/api/chat', { question, history }),
  reindex: () => post('/api/reindex'),
  transcribe: (blob) => {
    const f = new FormData();
    f.append('audio', blob, 'voice.webm');
    return fetch('/api/transcribe', { method: 'POST', body: f }).then(json);
  },
};
