import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const patterns = [
  /AKIA[0-9A-Z]{16}/,
  /sk_live_[0-9a-zA-Z]{24}/,
  /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/,
]

const scanDir = (dir, exclude = ['node_modules', 'dist', '.git']) => {
  const files = readdirSync(dir)
  files.forEach(file => {
    const path = join(dir, file)
    if (exclude.includes(file)) return
    if (statSync(path).isDirectory()) {
      scanDir(path, exclude)
    } else {
      const content = readFileSync(path, 'utf-8')
      patterns.forEach(pattern => {
        if (pattern.test(content)) {
          console.error(`Potential secret found in ${path}`)
          process.exit(1)
        }
      })
    }
  })
}

scanDir('.')
console.log('Secrets scan passed')
