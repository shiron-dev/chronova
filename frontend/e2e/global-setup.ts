import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

// backendサーバー起動前に使い捨てDBを削除し、毎回決定的なシード状態から始める。
export default function globalSetup() {
  const dbBase = resolve(here, '../../backend/e2e.db')
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(`${dbBase}${suffix}`, { force: true })
  }
}
