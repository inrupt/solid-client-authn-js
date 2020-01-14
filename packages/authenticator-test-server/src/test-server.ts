import express, { response } from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { JWT } from 'jose'
import keystore from './keystore'

const PORT = '9001'
const ISSUER = 'http://localhost:9001'

const app = express()

app.use(cors())
app.use(bodyParser.json())

app.get('/.well-known/openid-configuration', (req, res) => {
  res.send({
    jwks_uri: `${ISSUER}/jwks`
  })
})

app.get('/jwks', (req, res) => {
  res.send()
})

app.post('/token', (req, res) => {
  const cnf = req.body.cnf
  const webId = req.body.webId
  console.log('cnf', cnf)
  const accessToken = JWT.sign(
    {
      sub: webId,
      cnf: cnf
    },
    // @ts-ignore
    keystore.keys[0],
    {
      algorithm: 'RS256',
      audience: 'client',
      expiresIn: '1 hour',
      header: {
        typ: 'JWT'
      },
      issuer: ISSUER
    }
  )

  res.send(accessToken)
})

app.listen(PORT, () => console.log(`Test Server listening on port ${PORT}`))
