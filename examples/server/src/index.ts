import { uniqueLogin } from "solid-auth-fetcher";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

app.set("view engine", "ejs");

app.get("/", (req: Request, res: Response) => {
  res.render("home");
});

app.post("/login", async (req: Request, res: Response) => {
  const webId: string = req.body.webid;
  const redirect: string = await uniqueLogin({
    webId,
    redirect: `${BASE_URL}/redirect`
  });
});

app.get("/redirect", (req: Request, res: Response) => {});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
