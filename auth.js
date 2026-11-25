const jwt = require("jsonwebtoken");
const secret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) throw new Error("JWT_SECRET ausente ou curta");
  return process.env.JWT_SECRET;
};
exports.sign = (payload, exp = "12h") => jwt.sign(payload, secret(), { expiresIn: exp });
exports.authenticate = (event, role) => {
  const h = event.headers.authorization || event.headers.Authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  try {
    const p = jwt.verify(h.slice(7), secret());
    return p.role === role ? p : null;
  } catch { return null; }
};
