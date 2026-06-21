import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const LOG_DIR = path.join(__dirname, '../../..')
const MAX_LOG_SIZE = 5 * 1024 * 1024

export function createLogger(filename) {
  const logPath = path.join(LOG_DIR, filename)

  function rotate() {
    try {
      if (fs.existsSync(logPath) && fs.statSync(logPath).size > MAX_LOG_SIZE) {
        const rotated = `${logPath}.${Date.now()}`
        fs.renameSync(logPath, rotated)
        const backups = fs.readdirSync(LOG_DIR).filter(f => f.startsWith(filename) && f !== filename)
          .map(f => ({ name: f, time: fs.statSync(path.join(LOG_DIR, f)).mtimeMs }))
          .sort((a, b) => b.time - a.time)
        if (backups.length > 3) {
          for (const old of backups.slice(3)) {
            try { fs.unlinkSync(path.join(LOG_DIR, old.name)) } catch {}
          }
        }
      }
    } catch {}
  }

  function log(...args) {
    rotate()
    const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? (a.stack || a.message || JSON.stringify(a)) : a).join(' ')}\n`
    try { fs.appendFileSync(logPath, line) } catch {}
    console.error(...args)
  }

  return { log, logPath }
}
