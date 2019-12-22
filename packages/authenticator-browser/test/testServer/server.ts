import express, { Request, Response } from 'express'

const app = express()

app.get('/', (req: Request, res: Response) => {
  res.send('Oooloo')
})

app.listen(3000, () => console.log('App listening'))
