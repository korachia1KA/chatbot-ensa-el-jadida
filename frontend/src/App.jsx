import { useEffect, useRef, useState } from 'react';
import { api } from './api';

const SUGGESTIONS = [
  'Quelles filières propose l’ENSAJ ?',
  'Quels clubs puis-je rejoindre ?',
  'Qui contacter pour l’administration ?',
  'Que dit le règlement sur les absences ?',
];

function Avatar({ variant, speaking, listening }) {
  const portrait = variant === 'portrait';
  return (
    <div className={`avatar ${variant} ${speaking ? 'is-speaking' : ''} ${listening ? 'is-listening' : ''}`}>
      <model-viewer
        src="/api/avatar"
        camera-controls=""
        shadow-intensity="1"
        interaction-prompt="none"
        field-of-view="30deg"
        camera-orbit={portrait ? '0deg 85deg 1.3m' : '0deg 90deg 2.5m'}
        camera-target={portrait ? '0m 1.6m 0m' : '0m 1m 0m'}
      />
    </div>
  );
}

const Icon = ({ d }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const ICONS = {
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z',
  video: 'M15 10l5-3v10l-5-3M4 7h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3',
  send: 'M4 12 20 4l-6 16-3-7-7-1Z',
  plus: 'M12 5v14M5 12h14',
  speaker: 'M4 10v4h4l5 4V6L8 10H4ZM17 9a4 4 0 0 1 0 6',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
};

export default function App() {
  const [engine, setEngine] = useState({ state: 'loading', error: '' });
  const [mode, setMode] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceReply, setVoiceReply] = useState(true);
  const recorder = useRef(null);
  const endRef = useRef(null);

  const startEngine = () => {
    setEngine({ state: 'loading', error: '' });
    api.init().then(() => setEngine({ state: 'ready', error: '' })).catch((e) => setEngine({ state: 'error', error: e.message }));
  };
  useEffect(() => {
    startEngine();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const speak = (text) => {
    if (!voiceReply || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.onstart = () => setSpeaking(true);
    u.onend = u.onerror = () => setSpeaking(false);
    speechSynthesis.speak(u);
  };

  const ask = async (raw) => {
    const q = raw.trim();
    if (!q || busy || engine.state !== 'ready') return;
    const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');
    setBusy(true);
    try {
      const r = await api.chat(q, history);
      setMessages((m) => [...m, { role: 'assistant', content: r.answer, sources: r.sources }]);
      speak(r.answer);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `La réponse a échoué : ${e.message}`, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = async () => {
    if (listening) return recorder.current?.stop();
    try {
      speechSynthesis.cancel();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setListening(false);
        setBusy(true);
        try {
          const { text } = await api.transcribe(new Blob(chunks, { type: 'audio/webm' }));
          setBusy(false);
          if (text) await ask(text);
        } catch (e) {
          setBusy(false);
          setMessages((m) => [...m, { role: 'assistant', content: `Transcription impossible : ${e.message}`, error: true }]);
        }
      };
      recorder.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Accès au micro refusé. Autorisez le micro dans le navigateur.', error: true }]);
    }
  };

  const lastSources = [...messages].reverse().find((m) => m.sources?.length)?.sources || [];
  const lastAnswer = [...messages].reverse().find((m) => m.role === 'assistant');
  const statusLabel = { loading: 'Démarrage du moteur…', ready: 'Moteur prêt', error: 'Moteur indisponible' }[engine.state];

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="crest" aria-hidden="true">E</div>
          <div>
            <strong>ENSA El Jadida</strong>
            <span>Assistant virtuel</span>
          </div>
        </div>

        <nav className="nav" aria-label="Mode">
          <button className={mode === 'chat' ? 'active' : ''} onClick={() => setMode('chat')}><Icon d={ICONS.chat} />Conversation</button>
          <button className={mode === 'visio' ? 'active' : ''} onClick={() => setMode('visio')}><Icon d={ICONS.video} />Appel vidéo</button>
        </nav>

        {mode === 'chat' && <Avatar variant="body" speaking={speaking} />}

        <div className="side-foot">
          <label className="switch">
            <input type="checkbox" checked={voiceReply} onChange={(e) => { setVoiceReply(e.target.checked); speechSynthesis.cancel(); }} />
            <span>Lire les réponses à voix haute</span>
          </label>
          <button className="ghost" onClick={() => { setMessages([]); speechSynthesis.cancel(); }}><Icon d={ICONS.plus} />Nouvelle conversation</button>
          <button className="ghost" onClick={() => api.reindex().then(() => alert('Documents réindexés.')).catch((e) => alert(e.message))}><Icon d={ICONS.refresh} />Réindexer les documents</button>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <h1>{mode === 'chat' ? 'Posez votre question' : 'Appel avec l’assistant'}</h1>
          <span className={`status ${engine.state}`}><i />{statusLabel}</span>
        </header>

        {engine.state === 'error' && (
          <div className="banner" role="alert">
            {engine.error}
            <button onClick={startEngine}>Réessayer</button>
          </div>
        )}

        {mode === 'chat' ? (
          <>
            <section className="thread" aria-live="polite">
              {messages.length === 0 && (
                <div className="empty">
                  <h2>Bienvenue à l’ENSAJ</h2>
                  <p>Filières, clubs, règlement, emplois du temps, contacts : je réponds à partir des documents officiels de l’école.</p>
                  <div className="chips">
                    {SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)}>{s}</button>)}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <article key={i} className={`msg ${m.role} ${m.error ? 'error' : ''}`}>
                  <div className="who">{m.role === 'user' ? 'Vous' : 'Assistant ENSAJ'}</div>
                  <div className="bubble">{m.content}</div>
                </article>
              ))}
              {busy && <div className="msg assistant"><div className="who">Assistant ENSAJ</div><div className="bubble typing"><i /><i /><i /></div></div>}
              <div ref={endRef} />
            </section>

            <form className="composer" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
              <button type="button" className={`icon ${listening ? 'rec' : ''}`} onClick={toggleMic} aria-label={listening ? 'Arrêter l’enregistrement' : 'Parler'}><Icon d={ICONS.mic} /></button>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={listening ? 'Je vous écoute…' : 'Votre question…'} aria-label="Votre question" />
              <button className="send" disabled={!input.trim() || busy || engine.state !== 'ready'}><Icon d={ICONS.send} />Envoyer</button>
            </form>
          </>
        ) : (
          <section className="call">
            <Avatar variant="portrait" speaking={speaking} listening={listening} />
            <p className="caption">
              {listening ? 'Je vous écoute. Appuyez à nouveau pour envoyer.' : busy ? 'Je réfléchis…' : lastAnswer?.content || 'Appuyez sur le micro et posez votre question.'}
            </p>
            <div className="call-actions">
              <button className={`mic-big ${listening ? 'rec' : ''}`} onClick={toggleMic} disabled={busy || engine.state !== 'ready'}>
                <Icon d={ICONS.mic} />{listening ? 'Envoyer ma question' : 'Parler'}
              </button>
              <button className="ghost" onClick={() => speechSynthesis.cancel()}><Icon d={ICONS.speaker} />Couper la voix</button>
            </div>
          </section>
        )}
      </main>

      {mode === 'chat' && (
        <aside className="sources">
          <h2>Sources de la réponse</h2>
          {lastSources.length === 0 ? (
            <p className="muted">Les extraits utilisés pour répondre apparaîtront ici.</p>
          ) : (
            lastSources.map((s, i) => (
              <div className="source" key={i}>
                <strong>{s.source}</strong>
                <p>{s.excerpt}…</p>
              </div>
            ))
          )}
        </aside>
      )}
    </div>
  );
}
