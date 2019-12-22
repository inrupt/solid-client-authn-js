import express, { Request, Response } from 'express'
import path from 'path'

const app = express()

app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, './index.html'))
})

app.get('/solid-authenticator.bundle.js', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../browserDist/solid-authenticator.bundle.js'))
})

app.get('/solid-authenticator.bundle.js.map', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../browserDist/solid-authenticator.bundle.js.map'))
})

app.listen(3000, () => console.log('App listening'))
