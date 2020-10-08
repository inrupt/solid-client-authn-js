import { Selector } from "testcafe";

console.log('Running tests against:', process.env.DEMO_URL);

fixture("Example fixture 1").page(process.env.DEMO_URL!);

test("Example test 1", async (t) => {
  await t.expect(Selector("h1").textContent).eql("S-C-A-B Demo Client App - Login");
});
