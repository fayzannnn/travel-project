import { Router } from "express";
import HomepageContent from "../models/HomepageContent.js";
import Package from "../models/Package.js";
import { defaultHomepage } from "../../../shared/homepage.js";

const router = Router();

router.get("/", async (_request, response, next) => {
  try {
    const packages = await Package.find({ active: true })
      .select("region destination title description plans imageUrl imageAlt imageCaption imageCredit imageLicense seasonalLabel")
      .sort({ sortOrder: 1, _id: 1 })
      .lean();
    const planPackages = packages.flatMap((packageItem) =>
      packageItem.plans.map((plan) => ({
        ...packageItem,
        ...plan,
        packageId: packageItem._id,
        planId: String(plan._id || plan.plan),
        _id: `${packageItem._id}-${plan._id || plan.plan}`,
      })),
    );
    response.json({ data: planPackages });
  } catch (error) {
    next(error);
  }
});

router.get("/homepage", async (_request, response, next) => {
  try {
    const content = await HomepageContent.findOne({ key: "main" }).lean();
    response.json({ data: content || defaultHomepage });
  } catch (error) {
    next(error);
  }
});

export default router;
