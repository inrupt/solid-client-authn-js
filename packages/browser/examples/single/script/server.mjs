import express from "express";
import path from "path";

const PORT = 3001;

const app = express();

app.get("/", (_, res) => {
  res.sendFile(path.join(import.meta.dirname, "./index.html"));
});

app.get("/solid-client-authn.bundle.js", (_, res) => {
  res.sendFile(
    path.join(import.meta.dirname, "../../../dist/solid-client-authn.bundle.js"),
  );
});

app.listen(PORT, () => console.log(`Listening on port [${PORT}]...`));
