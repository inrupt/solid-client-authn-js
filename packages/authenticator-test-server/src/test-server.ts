import express, { response } from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import session from 'express-session'
import { JWT } from 'jose'
import keystore from './keystore'
import getOpenIdConfig from './opeidConfig'
import path from 'path'
import URL from 'url-parse'

const PORT: string = '9001'
const ISSUER: string = 'http://localhost:9001'
interface IUser {
  webID: string,
  username: string,
  password: string
}
const USERS: IUser[] = [
  {
    webID: `${ISSUER}/ids/jackson`,
    username: 'jackson',
    password: 'ItsCoolGuy&MrFunkWhyCoolGuyWhy'
  }
]

const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded())
app.use(session({
  secret: 'its_cool_guy'
}))
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '/views'))

app.get('/.well-known/openid-configuration', (req, res) => {
  res.send(getOpenIdConfig({ issuer: ISSUER }))
})

app.get('/jwks', (req, res) => {
  res.send(keystore)
})

app.get('/authorize', (req, res) => {
  req.session.authData = req.query

  res.redirect(`${ISSUER}/login`)
})

app.get('/login', (req, res) => {
  res.render('login', {
    location: `${ISSUER}/login`,
    username: USERS[0].username,
    password: USERS[0].password
  })
})

app.post('/login', (req, res) => {
  const user: IUser = USERS.find((user) => {
    return user.username === req.body.username && user.password === req.body.password
  })
  if (user) {
    const dpopToken = JWT.decode(req.session.authData.dpop, {
      complete: true
    })
    const jwk = (dpopToken.header as { [key: string]: any }).jwk

    const token: string = JWT.sign(
      {
        cnf: {
          jwk
        }
      },
      keystore.keys[0],
      {
        header: {
          typ: 'JWT'
        },
        algorithm: 'RS256',
        subject: user.webID,
        issuer: ISSUER,
        expiresIn: '1 hour'
      }
    )
    const redirectUrl = new URL(req.session.authData.redirect_url)
    redirectUrl.set('query', {
      access_token: token
    })

    res.redirect(redirectUrl.toString())
  } else {
    res.status(403)
    res.send('Wrong username or password')
  }
})

app.get('/storage', (req, res) => {
  // TODO: inspect token
  res.send('Success')
})

app.listen(PORT, () => console.log(`Test Server listening on port ${PORT}`))
