import jwt from "jsonwebtoken";
import AdminUser from "../models/AdminUser.js";

export async function requireAdmin(request, response, next) {
  const token = request.cookies?.adminSession;
  if (!token) {
    return response.status(401).json({ message: "Sign in to access the admin dashboard." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "travel-khor",
      audience: "travel-khor-admin",
    });
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      return response.status(401).json({ message: "Your admin session is invalid. Please sign in again." });
    }
    const admin = await AdminUser.findOne({ _id: payload.sub, active: true }).select("email").lean();
    if (!admin) {
      return response.status(401).json({ message: "Your admin account is unavailable. Please sign in again." });
    }
    request.admin = { id: admin._id.toString(), email: admin.email };
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return response.status(401).json({ message: "Your admin session has expired. Please sign in again." });
    }
    return next(error);
  }
}
