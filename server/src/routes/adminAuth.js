import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import AdminUser from "../models/AdminUser.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Please try again later." },
});
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/admin",
  maxAge: 8 * 60 * 60 * 1000,
};

router.post("/login", loginLimiter, async (request, response, next) => {
  try {
    if (!process.env.JWT_SECRET || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      return response.status(503).json({
        message: "Admin sign-in is not configured. Set JWT_SECRET, ADMIN_EMAIL, and ADMIN_PASSWORD in server/.env, then restart the API.",
      });
    }
    const { email, password } = request.body || {};
    if (typeof email !== "string" || typeof password !== "string" || email.length > 254 || password.length > 200) {
      return response.status(400).json({ message: "Enter your admin email and password." });
    }
    const admin = await AdminUser.findOne({ email: email.trim().toLowerCase(), active: true }).select("+passwordHash");
    const validPassword =
      admin && (await bcrypt.compare(password, admin.passwordHash));
    if (!validPassword) {
      return response.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({}, process.env.JWT_SECRET, {
      subject: admin.id,
      expiresIn: "8h",
      issuer: "travel-khor",
      audience: "travel-khor-admin",
    });
    response.cookie("adminSession", token, cookieOptions);
    response.json({ data: { email: admin.email } });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAdmin, (request, response) => {
  response.json({ data: request.admin });
});

router.post("/logout", (_request, response) => {
  response.clearCookie("adminSession", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/admin",
  });
  response.json({ message: "Signed out." });
});

export default router;
