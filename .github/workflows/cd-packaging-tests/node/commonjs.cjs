const { Session } = require("@inrupt/solid-client-authn-node");

const session = new Session();
console.log(session.info.sessionId);

session.fetch("https://example.com").then(async (response) => {
  const textContent = await response.text();
  console.log("Fetched example.com:", textContent);
});
