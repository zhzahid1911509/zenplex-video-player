import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { realpath, stat } from 'node:fs/promises';
const mediaExtensions = new Set([
  '.mp4',
  '.mkv',
  '.webm',
  '.mov',
  '.avi',
  '.wmv',
  '.flv',
  '.mpeg',
  '.mpg',
  '.ts',
  '.m2ts',
  '.3gp',
  '.ogv',
  '.vob',
  '.m4v',
  '.mp3',
  '.wav',
  '.ogg',
  '.flac',
  '.aac',
  '.m4a',
  '.opus',
]);
export class FileGrants {
  private entries = new Map<string, string>();
  async grant(selectedPath: string) {
    if (this.entries.size >= 200) throw new Error('The native file queue is full.');
    const resolved = await realpath(selectedPath);
    if (
      resolved.startsWith('\\\\') ||
      !mediaExtensions.has(path.extname(resolved).toLowerCase()) ||
      !(await stat(resolved)).isFile()
    )
      throw new Error('Choose a supported local media file.');
    const token = randomUUID();
    this.entries.set(token, resolved);
    return { token, title: path.basename(resolved) };
  }
  resolve(token: string) {
    const file = this.entries.get(token);
    if (!file) throw new Error('File permission expired. Open the file again.');
    return file;
  }
  release(token: string) {
    this.entries.delete(token);
  }
  clear() {
    this.entries.clear();
  }
}
export async function validateSubtitle(file: string) {
  const resolved = await realpath(file),
    info = await stat(resolved);
  if (
    resolved.startsWith('\\\\') ||
    !['.srt', '.vtt', '.ass', '.ssa'].includes(path.extname(resolved).toLowerCase()) ||
    !info.isFile() ||
    info.size > 20 * 1024 * 1024
  )
    throw new Error('Choose an SRT, VTT, ASS or SSA subtitle under 20 MiB.');
  return resolved;
}
