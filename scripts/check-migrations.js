import fs from 'node:fs'
import path from 'node:path'

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

const entries = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.sql'))
  .map(entry => entry.name)
  .sort()

if (entries.length === 0) {
  console.error('No migration files found in supabase/migrations.')
  process.exit(1)
}

const numbered = entries.map(name => {
  const match = name.match(/^(\d{3})_(.+)\.sql$/)
  if (!match) {
    console.error(`Invalid migration filename: ${name}. Expected NNN_description.sql`)
    process.exit(1)
  }
  return { name, number: Number(match[1]) }
})

const seen = new Set()
for (const migration of numbered) {
  if (seen.has(migration.number)) {
    console.error(`Duplicate migration number: ${migration.number} (${migration.name})`)
    process.exit(1)
  }
  seen.add(migration.number)
}

for (let i = 1; i < numbered.length; i += 1) {
  const previous = numbered[i - 1].number
  const current = numbered[i].number
  if (current !== previous + 1) {
    console.error(
      `Migration numbering gap detected between ${numbered[i - 1].name} and ${numbered[i].name}.`
    )
    process.exit(1)
  }
}

console.log(`Migration check passed (${entries.length} files). Latest: ${entries[entries.length - 1]}`)
