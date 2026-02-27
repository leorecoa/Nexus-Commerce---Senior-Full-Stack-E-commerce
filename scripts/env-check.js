const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

const missing = requiredEnvVars.filter(key => !process.env[key])

if (missing.length > 0) {
  console.error('Missing required environment variables:', missing.join(', '))
  process.exit(1)
}

console.log('Environment check passed')
