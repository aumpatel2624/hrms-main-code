import bcrypt from "bcrypt";

/**
 * Set an account's password — an admin's reset, "Forgot password?", or the
 * person's own Change password (ADR-067). Stamping `passwordChangedAt` ends
 * every session signed in before it (authMiddleware compares it with the
 * session's `signedInAt`), so a copied session cookie stops working the moment
 * the password changes. When the caller is changing their own password their
 * current session is restamped and stays signed in.
 *
 * updateOne, not save(): save() re-validates the whole document, so a record
 * missing a later-added required field could never have its password reset.
 * The password rule itself is checked by the route (strongPasswordFor).
 */
export const setPassword = async (account, plain, req = null) => {
  const changedAt = new Date();
  await account.updateOne({
    $set: { password: await bcrypt.hash(plain, 10), passwordChangedAt: changedAt },
  });
  const sessionUser = req?.session?.user;
  if (sessionUser && String(sessionUser.id) === String(account._id)) {
    sessionUser.signedInAt = changedAt.getTime();
  }
};
