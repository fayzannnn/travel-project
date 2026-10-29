import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    destination: { type: String, required: true, trim: true, maxlength: 120 },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package", default: null },
    selectedPlan: { type: String, trim: true, maxlength: 20, default: "" },
    travelDate: { type: Date, required: true },
    groupSize: { type: Number, required: true, min: 1, max: 12 },
    budget: { type: Number, min: 1, default: null },
    additionalLocation: { type: String, trim: true, maxlength: 120, default: "" },
    message: { type: String, trim: true, maxlength: 1000, default: "" },
    isCustomApproach: { type: Boolean, default: false },
    followUpDate: { type: Date, default: null },
    followUpCompleted: { type: Boolean, default: false },
    status: { type: String, enum: ["new", "contacted", "closed"], default: "new" },
  },
  { timestamps: true },
);

export default mongoose.model("Inquiry", inquirySchema);
