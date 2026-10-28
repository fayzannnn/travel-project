import { Router } from "express";
import mongoose from "mongoose";
import HomepageContent from "../models/HomepageContent.js";
import Inquiry from "../models/Inquiry.js";
import Package from "../models/Package.js";
import Review from "../models/Review.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();
router.use(requireAdmin);

router.get("/reviews", async (request, response, next) => {
  try {
    const query = {};
    if (["pending", "approved", "rejected"].includes(request.query.status)) {
      query.status = request.query.status;
    }
    const reviews = await Review.find(query)
      .populate("package", "title")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    response.json({ data: reviews });
  } catch (error) {
    next(error);
  }
});

router.patch("/reviews/:id", async (request, response, next) => {
  try {
    const { status } = request.body || {};
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: "Review ID is invalid." });
    }
    if (!["pending", "approved", "rejected"].includes(status)) {
      return response.status(400).json({ message: "Choose a valid review status." });
    }
    const review = await Review.findByIdAndUpdate(
      request.params.id,
      { status },
      { new: true, runValidators: true },
    ).lean();
    if (!review) return response.status(404).json({ message: "Review not found." });
    response.json({ data: review });
  } catch (error) {
    next(error);
  }
});

router.get("/inquiries", async (request, response, next) => {
  try {
    const query = {};
    if (["new", "contacted", "closed"].includes(request.query.status)) {
      query.status = request.query.status;
    }
    if (typeof request.query.q === "string" && request.query.q.trim()) {
      const escaped = request.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { phone: { $regex: escaped, $options: "i" } },
        { destination: { $regex: escaped, $options: "i" } },
      ];
    }
    const inquiries = await Inquiry.find(query)
      .populate("package", "title destination")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    response.json({ data: inquiries });
  } catch (error) {
    next(error);
  }
});

router.get("/inquiries/follow-ups", async (request, response, next) => {
  try {
    const { through } = request.query;
    if (typeof through !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(through)) {
      return response.status(400).json({ message: "Choose a valid date for follow-up reminders." });
    }
    const endOfDay = new Date(`${through}T00:00:00.000Z`);
    if (Number.isNaN(endOfDay.getTime()) || endOfDay.toISOString().slice(0, 10) !== through) {
      return response.status(400).json({ message: "Choose a valid date for follow-up reminders." });
    }
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    const inquiries = await Inquiry.find({
      followUpDate: { $lt: endOfDay },
      followUpCompleted: { $ne: true },
    })
      .populate("package", "title")
      .sort({ followUpDate: 1 })
      .limit(200)
      .lean();
    response.json({ data: inquiries });
  } catch (error) {
    next(error);
  }
});

router.patch("/inquiries/:id", async (request, response, next) => {
  try {
    const body = request.body || {};
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: "Inquiry ID is invalid." });
    }
    let update;
    if (Object.hasOwn(body, "status")) {
      if (!["new", "contacted", "closed"].includes(body.status)) {
        return response.status(400).json({ message: "Choose a valid inquiry status." });
      }
      update = { status: body.status };
    } else if (Object.hasOwn(body, "followUpDate")) {
      if (body.followUpDate === null || body.followUpDate === "") {
        update = { followUpDate: null, followUpCompleted: false };
      } else {
        if (typeof body.followUpDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.followUpDate)) {
          return response.status(400).json({ message: "Choose a valid follow-up date." });
        }
        const followUpDate = new Date(`${body.followUpDate}T00:00:00.000Z`);
        if (Number.isNaN(followUpDate.getTime()) || followUpDate.toISOString().slice(0, 10) !== body.followUpDate) {
          return response.status(400).json({ message: "Choose a valid follow-up date." });
        }
        update = { followUpDate, followUpCompleted: false };
      }
    } else if (Object.hasOwn(body, "followUpCompleted")) {
      if (typeof body.followUpCompleted !== "boolean") {
        return response.status(400).json({ message: "Follow-up completion must be true or false." });
      }
      if (body.followUpCompleted) {
        const existing = await Inquiry.findById(request.params.id).select("followUpDate").lean();
        if (!existing) return response.status(404).json({ message: "Inquiry not found." });
        if (!existing.followUpDate) {
          return response.status(400).json({ message: "Schedule a follow-up date before marking it complete." });
        }
      }
      update = { followUpCompleted: body.followUpCompleted };
    } else {
      return response.status(400).json({ message: "Choose an inquiry update to save." });
    }
    const inquiry = await Inquiry.findByIdAndUpdate(
      request.params.id,
      update,
      { new: true, runValidators: true },
    ).lean();
    if (!inquiry) return response.status(404).json({ message: "Inquiry not found." });
    response.json({ data: inquiry });
  } catch (error) {
    next(error);
  }
});

router.get("/packages", async (_request, response, next) => {
  try {
    const packages = await Package.find({ migratedTo: { $exists: false } })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    response.json({ data: packages });
  } catch (error) {
    next(error);
  }
});

function validatePackage(body) {
  const errors = [];
  const stringFields = {
    region: [2, 80],
    destination: [2, 120],
    description: [10, 1200],
    imageUrl: [10, 2048],
    imageAlt: [5, 240],
    imageCaption: [2, 120],
    imageCredit: [2, 120],
    imageSourceUrl: [10, 2048],
    imageLicense: [2, 80],
    imageLicenseUrl: [10, 2048],
  };
  for (const [field, [min, max]] of Object.entries(stringFields)) {
    if (typeof body[field] !== "string" || body[field].trim().length < min || body[field].trim().length > max) {
      errors.push(`${field} must be between ${min} and ${max} characters.`);
    }
  }
  for (const field of ["imageUrl", "imageSourceUrl", "imageLicenseUrl"]) {
    try {
      if (new URL(body[field]).protocol !== "https:") throw new Error("Invalid protocol");
    } catch {
      errors.push(`${field} must be a valid HTTPS URL.`);
    }
  }
  if (!Array.isArray(body.plans) || body.plans.length < 1 || body.plans.length > 3) {
    errors.push("Add between one and three plans to this package.");
  } else {
    const tiers = new Set();
    body.plans.forEach((plan, planIndex) => {
      if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
        errors.push(`Plan ${planIndex + 1} must be a valid plan object.`);
        return;
      }
      if (!["Standard", "Moderate", "Premium"].includes(plan.plan)) {
        errors.push(`Plan ${planIndex + 1} must be Standard, Moderate, or Premium.`);
      } else if (tiers.has(plan.plan)) {
        errors.push(`The ${plan.plan} plan is listed more than once.`);
      } else {
        tiers.add(plan.plan);
      }
      const fields = {
        title: [3, 160],
        description: [10, 1200],
        duration: [2, 80],
        stayType: [2, 100],
      };
      for (const [field, [min, max]] of Object.entries(fields)) {
        if (typeof plan[field] !== "string" || plan[field].trim().length < min || plan[field].trim().length > max) {
          errors.push(`Plan ${planIndex + 1} ${field} must be between ${min} and ${max} characters.`);
        }
      }
      if (!Array.isArray(plan.itinerary) || plan.itinerary.length < 1 || plan.itinerary.length > 14) {
        errors.push(`Add an itinerary with between 1 and 14 days to plan ${planIndex + 1}.`);
      } else {
        plan.itinerary.forEach((day, index) => {
          if (!Number.isInteger(Number(day.day)) || Number(day.day) !== index + 1) {
            errors.push(`Plan ${planIndex + 1} itinerary days must be numbered consecutively starting at day 1.`);
          }
          if (typeof day.title !== "string" || !day.title.trim() || day.title.trim().length > 120) {
            errors.push(`Plan ${planIndex + 1}, day ${index + 1} needs a title of 1 to 120 characters.`);
          }
          if (typeof day.description !== "string" || !day.description.trim() || day.description.trim().length > 1000) {
            errors.push(`Plan ${planIndex + 1}, day ${index + 1} needs details of 1 to 1000 characters.`);
          }
        });
      }
      const price = Number(plan.price);
      const maxGroupSize = Number(plan.maxGroupSize);
      if (!Number.isInteger(price) || price < 1 || price > 1000000) {
        errors.push(`Plan ${planIndex + 1} price must be a whole number between ₹1 and ₹10,00,000.`);
      }
      if (!Number.isInteger(maxGroupSize) || maxGroupSize < 1 || maxGroupSize > 12) {
        errors.push(`Plan ${planIndex + 1} maximum group size must be between 1 and 12.`);
      }
    });
  }
  if (body.sortOrder !== undefined &&
      (!Number.isInteger(Number(body.sortOrder)) || Number(body.sortOrder) < 0 || Number(body.sortOrder) > 10000)) {
    errors.push("Display order must be a whole number between 0 and 10000.");
  }
  if (body.active !== undefined && typeof body.active !== "boolean") {
    errors.push("Package visibility must be true or false.");
  }
  if (body.seasonalLabel !== undefined &&
      (typeof body.seasonalLabel !== "string" || body.seasonalLabel.trim().length > 32)) {
    errors.push("Seasonal photo label must be 32 characters or fewer.");
  }
  return errors;
}

function packageValues(body) {
  return {
    region: body.region.trim(),
    destination: body.destination.trim(),
    title: body.destination.trim(),
    description: body.description.trim(),
    imageUrl: body.imageUrl.trim(),
    imageAlt: body.imageAlt.trim(),
    imageCaption: body.imageCaption.trim(),
    imageCredit: body.imageCredit.trim(),
    imageSourceUrl: body.imageSourceUrl.trim(),
    imageLicense: body.imageLicense.trim(),
    imageLicenseUrl: body.imageLicenseUrl.trim(),
    plans: body.plans.map((plan) => ({
      plan: plan.plan,
      title: plan.title.trim(),
      description: plan.description.trim(),
      duration: plan.duration.trim(),
      stayType: plan.stayType.trim(),
      itinerary: plan.itinerary.map((day, index) => ({
        day: index + 1,
        title: day.title.trim(),
        description: day.description.trim(),
      })),
      price: Number(plan.price),
      maxGroupSize: Number(plan.maxGroupSize),
    })),
    seasonalLabel: typeof body.seasonalLabel === "string" ? body.seasonalLabel.trim() : "",
    active: body.active !== false,
    sortOrder: Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
  };
}

function makeSlug(title) {
  return title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

router.post("/packages", async (request, response, next) => {
  try {
    const errors = validatePackage(request.body || {});
    if (errors.length) return response.status(400).json({ message: errors.join(" ") });
    const values = packageValues(request.body);
    const slug = makeSlug(values.destination);
    if (!slug) return response.status(400).json({ message: "Destination must include letters or numbers." });
    if (await Package.exists({ slug })) {
      return response.status(409).json({ message: "A package with this title already exists." });
    }
    const created = await Package.create({ ...values, slug });
    response.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
});

router.put("/packages/:id", async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: "Package ID is invalid." });
    }
    const errors = validatePackage(request.body || {});
    if (errors.length) return response.status(400).json({ message: errors.join(" ") });
    const existing = await Package.findById(request.params.id);
    if (!existing) return response.status(404).json({ message: "Package not found." });
    const values = packageValues(request.body);
    const slug = makeSlug(values.destination);
    if (!slug) return response.status(400).json({ message: "Destination must include letters or numbers." });
    if (await Package.exists({ slug, _id: { $ne: existing._id } })) {
      return response.status(409).json({ message: "A package with this title already exists." });
    }
    Object.assign(existing, values, { slug });
    await existing.save();
    response.json({ data: existing });
  } catch (error) {
    next(error);
  }
});

router.delete("/packages/:id", async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: "Package ID is invalid." });
    }
    const packageItem = await Package.findByIdAndUpdate(
      request.params.id,
      { active: false },
      { new: true, runValidators: true },
    ).lean();
    if (!packageItem) return response.status(404).json({ message: "Package not found." });
    response.json({ message: "Package unpublished.", data: packageItem });
  } catch (error) {
    next(error);
  }
});

router.get("/homepage", async (_request, response, next) => {
  try {
    const content = await HomepageContent.findOne({ key: "main" }).lean();
    response.json({ data: content });
  } catch (error) {
    next(error);
  }
});

router.put("/homepage", async (request, response, next) => {
  try {
    const content = { ...request.body, key: "main" };
    if (!Array.isArray(content.heroStats) || content.heroStats.length > 5 ||
        !Array.isArray(content.values) || content.values.length > 8 ||
        !Array.isArray(content.planningSteps) || content.planningSteps.length > 5 ||
        !Array.isArray(content.testimonials) || content.testimonials.length > 12) {
      return response.status(400).json({ message: "Homepage lists have exceeded their allowed item limits." });
    }
    const saved = await HomepageContent.findOneAndUpdate(
      { key: "main" },
      { $set: content },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();
    response.json({ data: saved });
  } catch (error) {
    next(error);
  }
});

export default router;
