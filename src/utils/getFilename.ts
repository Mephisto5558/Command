import { basename, extname } from 'node:path';

export default function getFilename(path: string): string {
  return basename(path, extname(path));
}