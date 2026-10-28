import mongoose from "mongoose";

const itineraryDaySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 1, max: 14 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

const planSchema = new mongoose.Schema({
  plan: { type: String, enum: ["Standard", "Moderate", "Premium"], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 1200 },
  duration: { type: String, required: true, trim: true, maxlength: 80 },
  stayType: { type: String, required: true, trim: true, maxlength: 100 },
  itinerary: { type: [itineraryDaySchema], required: true },
  price: { type: Number, required: true, min: 1, max: 1000000 },
  maxGroupSize: { type: Number, required: true, min: 1, max: 12 },
});

const packageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    region: { type: String, required: true, trim: true, maxlength: 80 },
    destination: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 1200 },
    imageUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    imageAlt: { type: String, required: true, trim: true, maxlength: 240 },
    imageCaption: { type: String, required: true, trim: true, maxlength: 120 },
    imageCredit: { type: String, required: true, trim: true, maxlength: 120 },
    imageSourceUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    imageLicense: { type: String, required: true, trim: true, maxlength: 80 },
    imageLicenseUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    plans: {
      type: [planSchema],
      required: true,
      validate: {
        validator: (plans) => plans.length >= 1 && plans.length <= 3,
        message: "A package must have between one and three plans.",
      },
    },
    seasonalLabel: { type: String, trim: true, maxlength: 32, default: "" },
    sortOrder: { type: Number, required: true, default: 0 },
    active: { type: Boolean, default: true },
    migratedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Package", default: undefined },
  },
  { timestamps: true },
);

export default mongoose.model("Package", packageSchema);
