import { Selector, t } from "testcafe";

export async function authorizeNss() {
  // Authorize our client application to access Pod resources. On NSS this will
  // only be required the first time this app is seen at the Pod. So we need a
  // conditional check here.
  const authorizeButtonExists = await Selector("[name=consent]").exists;
  if (authorizeButtonExists) {
    // Click here to grant Control access to our app. Only certain apps may need
    // that level of access, so don't provide by default.
    // await t.click("#control");

    await t.click("[name=consent]");
  }
}

export async function authorizeEss() {
  const approveButton = Selector("button").withText("Approve");
  await t.click(approveButton);

  // Previous ESS Broker IdP (based on MitreID Connect) used this selector:
  // await t.click("[name=authorize]");
}
