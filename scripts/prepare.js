import { execSync } from 'node:child_process'

const isCi = process.env.CI === 'true'
const isVercel = process.env.VERCEL === '1'

if (isCi || isVercel) {
  console.log('[prepare] Skipping husky install in CI/Vercel')
  process.exit(0)
}

try {
  execSync('husky', { stdio: 'inherit' })
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.warn('[prepare] Husky install skipped:', message)
}
