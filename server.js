import express from 'express'
import session from 'express-session'
import bcrypt from 'bcrypt'
import { supabase } from './supabase.js'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}))

// === ROUTES ===

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard')
  res.redirect('/login')
})

app.get('/register', (req, res) => res.render('register'))

app.post('/register', async (req, res) => {
  const { email, password } = req.body
  const hashed = await bcrypt.hash(password, 10)

  const { error } = await supabase
    .from('users')
    .insert([{ email, password: hashed, is_admin: false }])

  if (error) return res.send('Fout: ' + error.message)
  res.redirect('/login')
})

app.get('/login', (req, res) => res.render('login'))

app.post('/login', async (req, res) => {
  const { email, password } = req.body

  const { data, error } = await supabase
    .from('users')
    .select('id, email, password, is_admin')
    .eq('email', email)
    .single()

  if (error || !data) return res.send('Gebruiker niet gevonden')

  const valid = await bcrypt.compare(password, data.password)
  if (!valid) return res.send('Wachtwoord fout')

  req.session.user = {
    id: data.id,
    email: data.email,
    is_admin: data.is_admin
  }

  res.redirect('/dashboard')
})

app.get('/dashboard', async (req, res) => {
  if (!req.session.user) return res.redirect('/login')

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      user_id,
      users ( email ),
      comments (
        content,
        users ( email )
      )
    `)
    .order('created_at', { ascending: false })

  const formatted = posts.map(p => ({
    id: p.id,
    content: p.content,
    email: p.users?.email,
    comments: (p.comments || []).map(c => ({
      content: c.content,
      email: c.users?.email
    }))
  }))

  res.render('dashboard', { user: req.session.user, posts: formatted })
})

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'))
})

app.get("/admin", async (req, res) => {
  const user = req.session.user
  if (!user || !user.is_admin) return res.sendStatus(403)

  const { data: users } = await supabase
    .from("users")
    .select("id, email, is_admin")

  res.render("admin", { users })
})

app.post('/make-admin/:id', async (req, res) => {
  const currentUser = req.session.user
  const { id } = req.params

  if (!currentUser || !currentUser.is_admin) return res.status(403).send("Alleen admins mogen dit.")

  const { error } = await supabase
    .from("users")
    .update({ is_admin: true })
    .eq("id", id)

  if (error) return res.status(500).send("Fout bij admin maken.")
  res.redirect("/admin")
})

// === POSTS ===
app.post('/post', async (req, res) => {
  if (!req.session.user) return res.redirect('/login')
  const { content } = req.body

  await supabase.from('posts').insert([
    { content, user_id: req.session.user.id }
  ])

  res.redirect('/dashboard')
})

// === COMMENTS ===
app.post('/comment/:post_id', async (req, res) => {
  if (!req.session.user) return res.redirect('/login')
  const { content } = req.body
  const { post_id } = req.params

  await supabase.from('comments').insert([
    { content, post_id, user_id: req.session.user.id }
  ])

  res.redirect('/dashboard')
})

// === LIKES ===
app.post('/like/:post_id', async (req, res) => {
  if (!req.session.user) return res.redirect('/login')
  const { post_id } = req.params

  await supabase.from('likes').insert([
    { post_id, user_id: req.session.user.id }
  ])

  res.redirect('/dashboard')
})

// === VOLGEN ===
app.post('/follow/:user_id', async (req, res) => {
  if (!req.session.user) return res.redirect('/login')
  const { user_id } = req.params

  await supabase.from('follows').insert([
    { follower_id: req.session.user.id, following_id: user_id }
  ])

  res.redirect('/dashboard')
})

app.listen(8080, () => console.log('✅ Server gestart op http://localhost:8080'))
