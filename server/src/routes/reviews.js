import { Router } from "express";
import mongoose from "mongoose";
import { rateLimit } from "express-rate-limit";
import Package from "../models/Package.js";
import Review from "../models/Review.js";

const router = Router();
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many review submissions. Please try again later." },
});

router.get("/", async (_request, response, next) => {
  try {
    const reviews = await Review.find({ status: "approved" })
      .select("displayName tripName rating review memory createdAt")
      .sort({ createdAt: -1 })
      .limit(24)
      .lean();
    response.json({ data: reviews });
  } catch (error) {
    next(error);
  }
});

router.post("/", reviewLimiter, async (request, response, next) => {
  try {
    const {
      displayName,
      packageId,
      tripName,
      rating,
      review,
      memory,
      consentToPublish,
      website,
    } = request.body || {};

    if (typeof website === "string" && website.trim()) {
      return response.status(400).json({ message: "The review could not be submitted." });
    }

    const errors = [];
    if (typeof displayName !== "string" || displayName.trim().length < 2 || displayName.trim().length > 80) {
      errors.push("Name must be between 2 and 80 characters.");
    }
    const stars = Number(rating);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      errors.push("Choose a rating from 1 to 5 stars.");
    }
    if (typeof review !== "string" || review.trim().length < 20 || review.trim().length > 1500) {
      errors.push("Review must be between 20 and 1500 characters.");
    }
    if (typeof memory !== "string" || memory.trim().length < 20 || memory.trim().length > 2000) {
      errors.push("Trip memory must be between 20 and 2000 characters.");
    }
    if (consentToPublish !== true) {
      errors.push("Please agree to let us publish your review if it is approved.");
    }
    if (packageId && !mongoose.isValidObjectId(packageId)) {
      errors.push("Choose a valid trip.");
    }

    let selectedPackage = null;
    if (packageId && mongoose.isValidObjectId(packageId)) {
      selectedPackage = await Package.findOne({ _id: packageId, active: true }).select("title destination").lean();
      if (!selectedPackage) errors.push("That trip is no longer available. Please choose another.");
    }

    let resolvedTripName = "";
    if (packageId) {
      resolvedTripName = selectedPackage?.destination || selectedPackage?.title || "";
    } else if (typeof tripName === "string" && tripName.trim().length >= 2 && tripName.trim().length <= 120) {
      resolvedTripName = tripName.trim();
    } else {
      errors.push("Enter the name of the trip you took.");
    }

    if (errors.length) return response.status(400).json({ message: errors.join(" ") });

    const created = await Review.create({
      displayName: displayName.trim(),
      package: selectedPackage?._id || null,
      tripName: resolvedTripName,
      rating: stars,
      review: review.trim(),
      memory: memory.trim(),
      consentToPublish: true,
    });
    response.status(201).json({
      message: "Thank you for sharing your experience. Your review is saved for admin review before publication.",
      data: { id: created.id, status: created.status },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
