import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    profilePhotoUrl: { type: String, trim: true, default: "" },
    profilePhotoPublicId: { type: String, trim: true, default: "" },
    professionalTitle: { type: String, required: true, trim: true },
    yearsOfExperience: { type: Number, min: 0, max: 60, default: 0 },
    primaryIndustry: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    currentRole: { type: String, trim: true, default: "" },
    currentCompany: { type: String, trim: true, default: "" },
    summary: { type: String, trim: true, default: "" },
    isListed: { type: Boolean, default: false },
    availability: {
      type: [[Number]],
      default: () => Array.from({ length: 9 }, () => Array.from({ length: 5 }, () => 0)),
      validate: {
        validator: (value: unknown) => {
          if (!Array.isArray(value) || value.length !== 9) return false;
          return value.every(
            (row) =>
              Array.isArray(row) &&
              row.length === 5 &&
              row.every(
                (cell) =>
                  typeof cell === "number" &&
                  Number.isFinite(cell) &&
                  cell >= 0 &&
                  cell <= 1
              )
          );
        },
        message: "availability must be a 9x5 matrix with values between 0 and 1",
      },
    },
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
