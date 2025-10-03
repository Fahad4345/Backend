export const isAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, ACCESS_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Access denied, not admin" });
    }
    req.user = decoded;
    next();
  });
};
