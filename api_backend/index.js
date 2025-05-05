require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// API key from environment variable
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

// Secure API key retrieval endpoint
app.get('/api/google-api-key', (req, res) => {
  const clientKey = req.headers['x-api-key']

  // Verify a secure backend secret key
  if (clientKey !== process.env.BACKEND_SECRET_KEY) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.json({ apiKey: GOOGLE_API_KEY })
})

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
