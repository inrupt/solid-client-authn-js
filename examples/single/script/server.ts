import express from "express";
import path from "path";

const PORT = 3001;

const app = express();

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./index.html"));
});

app.get("/solid-client-authn.bundle.js", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../../../browserDist/solid-client-authn.bundle.js")
  );
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
