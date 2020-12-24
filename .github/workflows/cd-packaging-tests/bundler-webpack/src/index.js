// Verify that imports from the main export work:
import { Session } from "@inrupt/solid-client-authn-browser";

const session = new Session();
console.log(session.info.sessionId);

session.fetch("https://example.com").then(async (response) => {
  const textContent = await response.text();
  console.log("Fetched example.com:", textContent);
});
