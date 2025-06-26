import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { supabase } from './supabase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.post('/register', async (req, res) => {
  const { email, password } = req.body
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return res.status(400).json({ error: error.message })
  res.json({ data })
})

app.post('/login', async (req, res) => {
  const { email, password } = req.body
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return res.status(400).json({ error: error.message })
  res.json({ data })
})

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`Server running on http://localhost:${port}`))
