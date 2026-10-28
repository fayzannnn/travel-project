import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package", default: null },
    tripName: { type: String, required: true, trim: true, maxlength: 120 },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    review: { type: String, required: true, trim: true, minlength: 20, maxlength: 1500 },
    memory: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
    consentToPublish: { type: Boolean, required: true, validate: (value) => value === true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true },
);

export default mongoose.model("Review", reviewSchema);
