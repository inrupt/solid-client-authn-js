// import { login } from "solid-auth-fetcher";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";

const PORT = 3001;

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

app.set("view engine", "ejs");

app.get("/", (req: Request, res: Response) => {
  res.render("home");
});

app.post("/login", (req: Request, res: Response) => {
  const webId: string = req.body.webId;
  res.send();
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
