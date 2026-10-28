import { Router } from "express";
import mongoose from "mongoose";
import { rateLimit } from "express-rate-limit";
import Inquiry from "../models/Inquiry.js";
import Package from "../models/Package.js";

const router = Router();
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many inquiries from this connection. Please try again later." },
});

router.post("/", inquiryLimiter, async (request, response, next) => {
  try {
    const {
      name,
      email,
      phone,
      destination,
      travelDate,
      groupSize,
      budget,
      additionalLocation,
      message,
      selectedPlan,
      package: packageId,
    } =
      request.body;
    const errors = [];

    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
      errors.push("Name must be between 2 and 80 characters.");
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      errors.push("Enter a valid email address.");
    }
    if (typeof phone !== "string" || !/^[+()\d\s-]{7,20}$/.test(phone)) {
      errors.push("Enter a valid phone number.");
    }
    if (typeof destination !== "string" || destination.trim().length < 2 || destination.trim().length > 120) {
      errors.push("Destination must be between 2 and 120 characters.");
    }
    const date = new Date(travelDate);
    if (!travelDate || Number.isNaN(date.getTime()) || date < new Date(new Date().setHours(0, 0, 0, 0))) {
      errors.push("Choose a valid travel date that is not in the past.");
    }
    const travellers = Number(groupSize);
    if (!Number.isInteger(travellers) || travellers < 1 || travellers > 12) {
      errors.push("Group size must be between 1 and 12 travellers.");
    }
    const parsedBudget = budget === "" || budget === undefined || budget === null ? null : Number(budget);
    if (parsedBudget !== null && (!Number.isFinite(parsedBudget) || parsedBudget < 1 || parsedBudget > 1000000)) {
      errors.push("Budget must be between ₹1 and ₹10,00,000.");
    }
    if (message !== undefined && (typeof message !== "string" || message.length > 1000)) {
      errors.push("Message must be 1000 characters or fewer.");
    }
    if (
      additionalLocation !== undefined &&
      (typeof additionalLocation !== "string" || additionalLocation.length > 120)
    ) {
      errors.push("Additional location must be 120 characters or fewer.");
    }
    if (packageId && !mongoose.isValidObjectId(packageId)) {
      errors.push("The selected travel package is invalid.");
    }
    if (selectedPlan !== undefined && !["", "Standard", "Moderate", "Premium"].includes(selectedPlan)) {
      errors.push("Choose a valid package plan.");
    }
    if (errors.length) {
      return response.status(400).json({ message: errors.join(" ") });
    }

    if (packageId) {
      const packageItem = await Package.findOne({ _id: packageId, active: true }).select("plans").lean();
      if (!packageItem) {
        return response.status(400).json({ message: "That package is no longer available. Please choose another." });
      }
      if (selectedPlan && !packageItem.plans.some((plan) => plan.plan === selectedPlan)) {
        return response.status(400).json({ message: "That plan is no longer available. Please choose another." });
      }
    }

    const inquiry = await Inquiry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      destination: destination.trim(),
      package: packageId || null,
      selectedPlan: selectedPlan || "",
      travelDate: date,
      groupSize: travellers,
      budget: parsedBudget,
      additionalLocation: additionalLocation?.trim() || "",
      message: message?.trim() || "",
    });
    response.status(201).json({
      message: "Your trip inquiry has been saved. Our team will be in touch soon.",
      data: { id: inquiry.id },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
