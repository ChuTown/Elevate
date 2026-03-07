import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    professionalTitle: { type: String, required: true, trim: true },
    yearsOfExperience: { type: Number, min: 0, max: 60, default: 0 },
    primaryIndustry: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    currentRole: { type: String, trim: true, default: "" },
    currentCompany: { type: String, trim: true, default: "" },
    summary: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    profile: { type: profileSchema, required: false },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
