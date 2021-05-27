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
  // Ideally we'd find the button using the `.withText` Selector method,
  // to simulate how a regular user finds the relevant button,
  // but for some reason that doesn't work.
  const approveButton = Selector('button[form="approve"]');
  await t.click(approveButton);
}
