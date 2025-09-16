import jwt from "jsonwebtoken";

export const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ error: "Authorization header missing or invalid" });
      }

      const token = authHeader.split(" ")[1];
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          return res
            .status(401)
            .json({ error: "Token expired, please login again" });
        }
        return res.status(401).json({ error: "Invalid token" });
      }

      req.user = {
        role: decoded.role ?? null,
        adminId: decoded.adminId ?? null,
        managerId: decoded.managerId ?? null,
        staffId: decoded.staffId ?? null,
      };

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }

      next();
    } catch (err) {
      console.error("[AUTH MIDDLEWARE ERROR]", err);
      res.status(500).json({ error: "Authentication failed" });
    }
  };
};
