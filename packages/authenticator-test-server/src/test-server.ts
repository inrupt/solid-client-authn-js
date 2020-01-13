import express, { response } from 'express'
import cors from 'cors'

const PORT = '9001'
const ISSUER = 'http://localhost:9001'

const app = express()

app.use(cors())

app.get('/.well-known/openid-configuration', (req, res) => {
  res.send({
    jwks_uri: `${ISSUER}/jwks`
  })
})

app.get('/jwks', (req, res) => {
  res.send()
})

app.get('/token', (req, res) => {
  res.send('Oh this is a cool token')
})

app.listen(PORT, () => console.log(`Test Server listening on port ${PORT}`))
