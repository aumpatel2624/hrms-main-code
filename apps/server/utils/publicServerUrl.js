/**
 * The server's own origin as the outside world reaches it, for links that
 * leave the app (an email-signature image). PUBLIC_SERVER_URL in production;
 * otherwise the request's own protocol and host. The signature link used to
 * read a frontend variable the server never has, and began "undefined/"
 * (29 Oct security test, low).
 */
export const publicServerUrl = (req) =>
  (process.env.PUBLIC_SERVER_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
