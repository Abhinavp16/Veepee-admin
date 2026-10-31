// Copies the ffmpeg engine (used to compress banner videos in the browser)
// into public/ffmpeg, so the admin site serves it itself rather than
// fetching it from a CDN. Runs as part of `npm run dev` and `npm run build`;
// the copy isn't committed.
import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const to = join(root, "public", "ffmpeg")
// The engine, and the library's worker, which must be served as it is: when
// bundled, its dynamic import of the engine breaks.
const files = [
  ["@ffmpeg/core/dist/esm", ["ffmpeg-core.js", "ffmpeg-core.wasm"]],
  ["@ffmpeg/ffmpeg/dist/esm", ["worker.js", "const.js", "errors.js"]],
]

for (const [dir] of files) {
  if (!existsSync(join(root, "node_modules", dir))) {
    console.warn(`[ffmpeg] ${dir} is missing; banner video compression won't work`)
    process.exit(0)
  }
}
mkdirSync(to, { recursive: true })
for (const [dir, names] of files) {
  for (const name of names) copyFileSync(join(root, "node_modules", dir, name), join(to, name))
}
console.log("[ffmpeg] engine copied to public/ffmpeg")
