import mongoose from "mongoose";

const homepageContentSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "main" },
    brandName: { type: String, required: true, trim: true, maxlength: 80 },
    heroEyebrow: { type: String, required: true, trim: true, maxlength: 120 },
    heroTitle: { type: String, required: true, trim: true, maxlength: 180 },
    heroDescription: { type: String, required: true, trim: true, maxlength: 1000 },
    heroStats: [{
      value: { type: String, required: true, trim: true, maxlength: 30 },
      label: { type: String, required: true, trim: true, maxlength: 80 },
    }],
    values: [{
      title: { type: String, required: true, trim: true, maxlength: 100 },
      copy: { type: String, required: true, trim: true, maxlength: 500 },
    }],
    packagesHeading: { type: String, required: true, trim: true, maxlength: 120 },
    packagesDescription: { type: String, required: true, trim: true, maxlength: 500 },
    whyHeading: { type: String, required: true, trim: true, maxlength: 180 },
    whyDescription: { type: String, required: true, trim: true, maxlength: 1000 },
    planningSteps: [{ type: String, required: true, trim: true, maxlength: 200 }],
    offerTitle: { type: String, required: true, trim: true, maxlength: 120 },
    offerPrice: { type: Number, required: true, min: 1, max: 1000000 },
    offerDescription: { type: String, required: true, trim: true, maxlength: 300 },
    testimonialsHeading: { type: String, required: true, trim: true, maxlength: 120 },
    testimonials: [{
      quote: { type: String, required: true, trim: true, maxlength: 1000 },
      name: { type: String, required: true, trim: true, maxlength: 80 },
      trip: { type: String, required: true, trim: true, maxlength: 120 },
    }],
    ctaHeading: { type: String, required: true, trim: true, maxlength: 180 },
    footerAbout: { type: String, required: true, trim: true, maxlength: 500 },
    footerTagline: { type: String, required: true, trim: true, maxlength: 160 },
    contactEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    contactPhone: { type: String, required: true, trim: true, maxlength: 30 },
    contactLocation: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { timestamps: true, strict: "throw" },
);

export default mongoose.model("HomepageContent", homepageContentSchema);
