import { z } from 'zod';
const finite = z.number().finite();
export const viewportSchema = z
  .object({
    x: finite.min(0).max(32768),
    y: finite.min(0).max(32768),
    width: finite.min(0).max(32768),
    height: finite.min(0).max(32768),
    visible: z.boolean(),
  })
  .strict();
export const nativeCommandSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('play') }).strict(),
  z.object({ op: z.literal('pause') }).strict(),
  z.object({ op: z.literal('stop') }).strict(),
  z.object({ op: z.literal('close') }).strict(),
  z.object({ op: z.literal('seek'), value: finite.min(0).max(1e9) }).strict(),
  z.object({ op: z.literal('volume'), value: finite.min(0).max(1) }).strict(),
  z.object({ op: z.literal('mute'), value: z.boolean() }).strict(),
  z.object({ op: z.literal('rate'), value: finite.min(0.25).max(3) }).strict(),
  z.object({ op: z.literal('audio'), value: z.number().int().min(1).max(100000) }).strict(),
  z.object({ op: z.literal('subtitle'), value: z.number().int().min(0).max(100000) }).strict(),
  z.object({ op: z.literal('subtitleDelay'), value: finite.min(-60).max(60) }).strict(),
  z.object({ op: z.literal('audioDelay'), value: finite.min(-10).max(10) }).strict(),
  z.object({ op: z.literal('fit'), value: z.enum(['contain', 'cover', 'fill']) }).strict(),
  z.object({ op: z.literal('frameStep') }).strict(),
]);
export type NativeCommand = z.infer<typeof nativeCommandSchema>;
export type Viewport = z.infer<typeof viewportSchema>;
export const nativeOpenSchema = z.discriminatedUnion('kind', [
  z
    .object({ kind: z.literal('file'), token: z.string().uuid(), session: z.string().uuid() })
    .strict(),
  z
    .object({ kind: z.literal('url'), url: z.string().max(8192), session: z.string().uuid() })
    .strict(),
]);
export const trackSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(['audio', 'sub']),
  title: z.string().max(512),
  lang: z.string().max(64),
  codec: z.string().max(128),
  selected: z.boolean(),
});
export const nativeStateSchema = z.object({
  status: z.enum(['idle', 'loading', 'ready', 'playing', 'paused', 'buffering', 'ended', 'error']),
  position: finite.min(0),
  duration: finite.min(0),
  volume: finite.min(0).max(1),
  muted: z.boolean(),
  rate: finite.min(0.25).max(3),
  buffered: finite.min(0),
  error: z.string().nullable(),
  width: finite.min(0),
  height: finite.min(0),
  tracks: z.array(trackSchema).max(256),
  videoCodec: z.string().max(256),
  audioCodec: z.string().max(256),
  engineVersion: z.string().max(256),
  audioDelay: finite,
  subtitleDelay: finite,
});
export type NativeState = z.infer<typeof nativeStateSchema>;
export type NativeTrack = z.infer<typeof trackSchema>;
export type NativeRuntime = {
  platform: string;
  version: string;
  nativeAvailable: boolean;
  reason: string;
  engine: string;
};
export type FileGrant = { token: string; title: string };
export type NativeEvent =
  | { session: string; state: NativeState }
  | { session: string; shortcut: 'fullscreen' | 'toggle' | 'back' | 'forward' | 'mute' | 'escape' };
export interface DesktopBridge {
  runtime(): Promise<NativeRuntime>;
  pickFiles(): Promise<FileGrant[]>;
  releaseFile(token: string): Promise<void>;
  open(input: z.infer<typeof nativeOpenSchema>): Promise<void>;
  command(command: NativeCommand): Promise<void>;
  viewport(viewport: Viewport): Promise<void>;
  pickSubtitle(): Promise<boolean>;
  fullscreen(value: boolean): Promise<void>;
  onNativeEvent(listener: (event: NativeEvent) => void): () => void;
  onFullscreen(listener: (value: boolean) => void): () => void;
}
