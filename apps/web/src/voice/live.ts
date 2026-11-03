import { FunctionResponseScheduling, GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai';
import { api } from '../lib/api';
import type { DocKind } from '../lib/types';
import { startMic, Speaker, type Mic } from './audio';
import { voiceInstruction, voiceTools } from './tools';

export type VoiceState = 'connecting' | 'listening' | 'speaking' | 'closed';

export interface VoiceHandlers {
  state(s: VoiceState): void;
  caption(who: 'you' | 'ai', text: string, final: boolean): void;
  /** Runs one tool; the returned object is sent back to the voice as the tool's result. */
  tool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>>;
  error(message: string): void;
}

export interface VoiceSession { stop(): void; level(): number; asyncTools: boolean }

/** Gemini 3.x Live models only take blocking tool calls; 2.5 native-audio can keep talking while a tool runs. */
const supportsAsyncTools = (model: string) => !/gemini-3/.test(model);

/** Opens a live voice session: mic to Gemini, Gemini's voice to the speakers, tool calls to `h.tool`. */
export async function startVoice(kind: DocKind, docName: string, h: VoiceHandlers): Promise<VoiceSession> {
  h.state('connecting');
  const { token, model, baseUrl } = await api.voiceSession();
  const asyncTools = supportsAsyncTools(model);
  const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha', ...(baseUrl ? { baseUrl } : {}) } });
  const speaker = new Speaker();
  let mic: Mic | null = null;
  let closed = false;
  const said = { you: '', ai: '' };

  const stop = () => {
    if (closed) return;
    closed = true;
    mic?.stop();
    speaker.close();
    try { session.close(); } catch { /* already closed */ }
    h.state('closed');
  };

  const runTool = async (id: string | undefined, name: string, args: Record<string, unknown>) => {
    let output: Record<string, unknown>;
    try { output = await h.tool(name, args); } catch (e) { output = { error: (e as Error).message }; }
    if (closed) return;
    session.sendToolResponse({
      functionResponses: [{ id, name, response: output, ...(asyncTools ? { scheduling: FunctionResponseScheduling.WHEN_IDLE } : {}) }],
    });
  };

  const onMessage = (m: LiveServerMessage) => {
    const sc = m.serverContent;
    if (sc?.interrupted) { speaker.flush(); h.state('listening'); }
    for (const part of sc?.modelTurn?.parts ?? []) {
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) { speaker.play(part.inlineData.data, part.inlineData.mimeType); h.state('speaking'); }
    }
    if (sc?.inputTranscription?.text) { said.you += sc.inputTranscription.text; h.caption('you', said.you, false); }
    if (sc?.outputTranscription?.text) {
      if (said.you) { h.caption('you', said.you, true); said.you = ''; }
      said.ai += sc.outputTranscription.text; h.caption('ai', said.ai, false);
    }
    if (sc?.turnComplete) {
      if (said.you) h.caption('you', said.you, true);
      if (said.ai) h.caption('ai', said.ai, true);
      said.you = ''; said.ai = '';
      setTimeout(() => { if (!closed && !speaker.speaking) h.state('listening'); }, 300);
    }
    for (const call of m.toolCall?.functionCalls ?? []) {
      if (said.you) { h.caption('you', said.you, true); said.you = ''; }
      void runTool(call.id, call.name ?? '', (call.args ?? {}) as Record<string, unknown>);
    }
    if (m.goAway) h.error('The voice session is ending soon (time limit). Press the mic again to continue.');
  };

  const session: Session = await ai.live.connect({
    model,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: voiceInstruction(kind, docName),
      tools: [{ functionDeclarations: voiceTools(asyncTools) }],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
    callbacks: {
      onmessage: onMessage,
      onerror: () => h.error('The voice connection failed.'),
      onclose: (e) => { if (!closed) { if (e?.reason) h.error(`Voice closed: ${e.reason}`); stop(); } },
    },
  });
  try {
    mic = await startMic((data) => { if (!closed) session.sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } }); });
  } catch {
    stop();
    throw new Error('Allow the microphone for Guro Buddy, then try again.');
  }
  h.state('listening');
  return { stop, level: () => mic?.level() ?? 0, asyncTools };
}
