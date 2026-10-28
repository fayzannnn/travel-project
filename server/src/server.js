import "dotenv/config";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { seedPackages } from "./data/packages.js";
import AdminUser from "./models/AdminUser.js";
import HomepageContent from "./models/HomepageContent.js";
import Inquiry from "./models/Inquiry.js";
import Package from "./models/Package.js";
import Review from "./models/Review.js";
import adminAuthRoutes from "./routes/adminAuth.js";
import adminRoutes from "./routes/admin.js";
import inquiryRoutes from "./routes/inquiries.js";
import packageRoutes from "./routes/packages.js";
import reviewRoutes from "./routes/reviews.js";
import { defaultHomepage } from "../../shared/homepage.js";

const app = express();
const port = Number(process.env.PORT) || 5000;
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

function nestSeedPackages(seedPlans) {
  const grouped = new Map();
  for (const seedPlan of seedPlans) {
    const destination = seedPlan.destination || seedPlan.title;
    const key = `${seedPlan.region}:${destination}`;
    const plans = grouped.get(key) || [];
    plans.push(seedPlan);
    grouped.set(key, plans);
  }

  return [...grouped.values()].map((plans) => {
    const first = plans[0];
    const destination = first.destination || first.title;
    return {
      slug: first.slug,
      region: first.region,
      destination,
      title: destination,
      description: first.description,
      imageUrl: first.imageUrl,
      imageAlt: first.imageAlt,
      imageCaption: first.imageCaption,
      imageCredit: first.imageCredit,
      imageSourceUrl: first.imageSourceUrl,
      imageLicense: first.imageLicense,
      imageLicenseUrl: first.imageLicenseUrl,
      plans: plans.map(({ plan, title, description, duration, stayType, itinerary, price, maxGroupSize }) => ({
        plan: plan || "Standard",
        title,
        description,
        duration,
        stayType,
        itinerary,
        price,
        maxGroupSize,
      })),
      sortOrder: Math.min(...plans.map((item) => item.sortOrder || 0)),
      active: plans.some((item) => item.active !== false),
    };
  });
}

function legacyPlanValues(item) {
  return {
    plan: ["Standard", "Moderate", "Premium"].includes(item.plan) ? item.plan : "Standard",
    title: item.title,
    description: item.description,
    duration: item.duration,
    stayType: item.stayType,
    itinerary: item.itinerary || [],
    price: item.price,
    maxGroupSize: item.maxGroupSize,
  };
}

async function migrateFlatPackages() {
  const legacyPackages = await Package.collection
    .find({ plans: { $exists: false }, migratedTo: { $exists: false } })
    .sort({ sortOrder: 1, createdAt: 1 })
    .toArray();
  const groups = new Map();
  for (const item of legacyPackages) {
    const destination = item.destination || item.title;
    const key = `${item.region}:${destination}`;
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    const first = group[0];
    const destination = first.destination || first.title;
    const existingParent = await Package.collection.findOne({
      region: first.region,
      destination,
      plans: { $exists: true },
      migratedTo: { $exists: false },
    });
    const legacyPlans = group.map((item) => legacyPlanValues(item));
    const tiers = [...(existingParent?.plans || []), ...legacyPlans];
    if (new Set(tiers.map((plan) => plan.plan)).size !== tiers.length) {
      throw new Error(`Cannot migrate "${destination}": duplicate plan tiers need manual resolution.`);
    }
    const parentId = existingParent?._id || first._id;

    await Package.collection.updateOne(
      { _id: parentId },
      {
        $set: {
          destination,
          title: existingParent?.title || destination,
          description: existingParent?.description || first.description,
          plans: tiers,
          sortOrder: existingParent?.sortOrder ?? first.sortOrder ?? 0,
          active: existingParent ? existingParent.active !== false : group.some((item) => item.active !== false),
          updatedAt: new Date(),
        },
        ...(existingParent ? {} : {
          $unset: {
            plan: "",
            duration: "",
            stayType: "",
            itinerary: "",
            price: "",
            maxGroupSize: "",
          },
        }),
      },
    );

    for (const item of group) {
      if (item._id === parentId) continue;
      await Package.collection.updateOne(
        { _id: item._id },
        { $set: { migratedTo: parentId, active: false, updatedAt: new Date() } },
      );
    }
  }

  const migratedPackages = await Package.collection.find({ migratedTo: { $exists: true } }).toArray();
  for (const item of migratedPackages) {
    await Inquiry.updateMany(
      { package: item._id },
      { $set: { package: item.migratedTo, selectedPlan: legacyPlanValues(item).plan } },
    );
    await Review.updateMany({ package: item._id }, { $set: { package: item.migratedTo } });
  }
}

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

app.use("/api/admin", (request, response, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
      request.headers.origin && !allowedOrigins.includes(request.headers.origin)) {
    return response.status(403).json({ message: "This request origin is not allowed." });
  }
  next();
});

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});
app.use("/api/packages", packageRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin", adminRoutes);

app.use((_request, response) => {
  response.status(404).json({ message: "Route not found." });
});
app.use((error, _request, response, _next) => {
  console.error(error);
  if (error.type === "entity.parse.failed") {
    return response.status(400).json({ message: "Request body must contain valid JSON." });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return response.status(400).json({ message: "The submitted data is invalid." });
  }
  if (error.code === 11000) {
    return response.status(409).json({ message: "A record with those details already exists." });
  }
  response.status(500).json({ message: "An unexpected server error occurred." });
});

async function startServer() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required. Copy server/.env.example to server/.env and configure MongoDB.");
  }
  await mongoose.connect(mongoUri);

  if ((await Package.estimatedDocumentCount()) === 0) {
    await Package.insertMany(nestSeedPackages(seedPackages));
    console.info("Inserted the initial Travel Khor package catalog.");
  }
  await migrateFlatPackages();
  if (!(await HomepageContent.exists({ key: "main" }))) {
    await HomepageContent.create({ key: "main", ...defaultHomepage });
    console.info("Inserted the initial homepage content.");
  }

  const { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } = process.env;
  if (ADMIN_EMAIL || ADMIN_PASSWORD || JWT_SECRET) {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET) {
      throw new Error("Set ADMIN_EMAIL, ADMIN_PASSWORD, and JWT_SECRET together to enable admin sign-in.");
    }
    if (ADMIN_PASSWORD.length < 12) {
      throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
    }
    if (JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters.");
    }
    const email = ADMIN_EMAIL.trim().toLowerCase();
    const existingAdmin = await AdminUser.exists({ email });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await AdminUser.create({ email, passwordHash });
      console.info(`Created the initial admin account for ${email}.`);
    }
  } else {
    console.warn("Admin sign-in is disabled. Set ADMIN_EMAIL, ADMIN_PASSWORD, and JWT_SECRET in server/.env.");
  }

  app.listen(port, () => {
    console.info(`Travel Khor API listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Could not start the Travel Khor API:", error);
  process.exitCode = 1;
});

process.on("SIGINT", async () => {
  await mongoose.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await mongoose.disconnect();
  process.exit(0);
});
