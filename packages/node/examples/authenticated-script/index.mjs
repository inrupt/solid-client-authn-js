import { Session } from "@inrupt/solid-client-authn-node";
import { config } from "dotenv";

config({ path: ".env.local" });

const session = new Session();
await session.login({
  oidcIssuer: process.env.OPENID_PROVIDER,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});

console.log(`You are now logged in as ${session.info.webId}`);

await session.logout();
