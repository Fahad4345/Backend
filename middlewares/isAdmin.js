import jwt from "jsonwebtoken";

export const isAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    console.log("Token", authHeader);
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header missing" });
    }
    console.log("Token", authHeader);
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Access denied, not admin" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
