import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useVoice, type VoiceDoc } from './useVoice';

const LABEL = { connecting: 'Connecting…', listening: 'Listening — just talk', speaking: 'Speaking — talk to interrupt', closed: '' } as const;

/** Talk to Guro Buddy: a live conversation; edits run in the background and land as suggestions. */
export function VoiceBar(props: VoiceDoc) {
  const voice = useVoice(props);
  const [status, setStatus] = useState<{ available: boolean; worker: string; reason?: string } | null>(null);
  const meter = useRef<HTMLSpanElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const on = voice.state !== 'closed';

  useEffect(() => { api.voiceStatus().then(setStatus, () => setStatus(null)); }, []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [voice.captions]);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const tick = () => { if (meter.current) meter.current.style.transform = `scale(${1 + Math.min(1, voice.level() * 3) * 0.35})`; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, voice]);

  if (status && !status.available) {
    return <div className="voice off" title={status.reason}><button disabled>🎙 Talk</button><small>{status.reason}</small></div>;
  }
  return (
    <div className={`voice ${on ? 'on' : ''}`}>
      <div className="voice-row">
        <button className={`voice-btn ${voice.state}`} onClick={on ? voice.stop : voice.start} disabled={!props.handle}
          title={on ? 'End the conversation' : 'Talk to Guro Buddy'}>
          <span ref={meter} className="voice-dot" />{on ? 'End' : '🎙 Talk'}
        </button>
        <span className="voice-state">{voice.working ? `Working on: ${voice.working}` : LABEL[voice.state]}</span>
      </div>
      {voice.error && <p className="error">{voice.error}</p>}
      {(on || voice.captions.length > 0) && (
        <div className="voice-log" ref={log}>
          {voice.captions.map((c) => <p key={c.id} className={`cap ${c.who} ${c.final ? '' : 'live'}`}><b>{c.who === 'you' ? 'You' : 'Guro Buddy'}:</b> {c.text}</p>)}
          {voice.working && <p className="cap work">✎ Editing in the background ({status?.worker ?? 'claude'})…</p>}
        </div>
      )}
    </div>
  );
}
