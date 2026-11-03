/**
 * A stand-in for Gemini Live, for testing the voice plumbing without a key (GEMINI_BASE_URL=http://127.0.0.1:8765).
 * It speaks the same WebSocket protocol: after it hears ~1 s of audio it "transcribes" MOCK_SAY, calls
 * edit_document with it, reports the result, then calls apply_changes. Every tool result is printed as JSON.
 * Usage: MOCK_SAY="Make the title bold" node scripts/mock-gemini-live.mjs [port]
 */
import { WebSocketServer } from 'ws';

const port = Number(process.argv[2] ?? 8765);
const say = process.env.MOCK_SAY ?? 'Make the title bold and centered.';
const silence = Buffer.alloc(4800).toString('base64'); // 100 ms of 24 kHz PCM16
const wss = new WebSocketServer({ port });
console.log(`mock gemini live on ${port}`);

wss.on('connection', (ws, req) => {
  console.log('CONNECT', req.url?.split('?')[0]);
  const send = (m) => ws.send(JSON.stringify(m));
  let chunks = 0;
  let step = 0;
  const speak = (text) => {
    send({ serverContent: { outputTranscription: { text }, modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: silence } }] } } });
    send({ serverContent: { turnComplete: true } });
  };
  ws.on('message', (raw) => {
    const m = JSON.parse(String(raw));
    if (m.setup) {
      console.log('SETUP', JSON.stringify({ model: m.setup.model, tools: m.setup.tools?.[0]?.functionDeclarations?.map((f) => `${f.name}${f.behavior ? `(${f.behavior})` : ''}`) }));
      send({ setupComplete: {} });
    } else if (m.realtimeInput?.audio && ++chunks === 10 && step === 0) {
      step = 1;
      send({ serverContent: { inputTranscription: { text: say } } });
      speak('Sige, I am asking the editor to do that now.');
      send({ toolCall: { functionCalls: [{ id: 'call-1', name: 'edit_document', args: { request: say } }] } });
    } else if (m.toolResponse) {
      const r = m.toolResponse.functionResponses[0];
      console.log('TOOL_RESULT', JSON.stringify(r));
      if (r.name === 'edit_document') {
        speak('Done. The change is waiting for your OK. Shall I apply it?');
        setTimeout(() => {
          send({ serverContent: { inputTranscription: { text: 'Yes, apply it.' } } });
          send({ toolCall: { functionCalls: [{ id: 'call-2', name: 'apply_changes', args: {} }] } });
        }, 800);
      } else if (r.name === 'apply_changes') {
        speak('Applied.');
        console.log('MOCK_DONE');
      }
    }
  });
  ws.on('close', () => console.log('CLOSE'));
});
