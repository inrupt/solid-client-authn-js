const express = require("express");

const port = 3000;

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", async (req, res) => {
  try {
    res.send("Success!").status(200);
  } catch (err) {
    res.send(err.message).status(500);
  }
});

app.post("/register_pod", async (req, res) => {
  try {
    res.send("Success!").status(201);
  } catch (err) {
    res.send(err.message).status(500);
  }
});

const server = app.listen(port, () =>
  console.log(`Listening on port: [${port}]...`)
);

process.on("SIGTERM", () => {
  console.info("SIGTERM signal received, closing HTTP server...");
  server.close(() => {
    console.log("...HTTP server closed.");
  });
});
