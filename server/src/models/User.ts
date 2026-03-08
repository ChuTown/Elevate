import mongoose from "mongoose";

const scheduleRequestSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requesterEmail: { type: String, required: true, trim: true },
    dayIndex: { type: Number, required: true, min: 0, max: 6 },
    slotIndex: { type: Number, required: true, min: 0, max: 13 },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const profileSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    profilePhotoUrl: { type: String, trim: true, default: "" },
    profilePhotoPublicId: { type: String, trim: true, default: "" },
    professionalTitle: { type: String, required: true, trim: true },
    hourlyRate: { type: Number, min: 0, default: 0 },
    yearsOfExperience: { type: Number, min: 0, max: 60, default: 0 },
    primaryIndustry: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    currentRole: { type: String, trim: true, default: "" },
    currentCompany: { type: String, trim: true, default: "" },
    summary: { type: String, trim: true, default: "" },
    isListed: { type: Boolean, default: false },
    availability: {
      type: [[Number]],
      default: () => Array.from({ length: 14 }, () => Array.from({ length: 7 }, () => 0)),
      validate: {
        validator: (value: unknown) => {
          if (!Array.isArray(value) || value.length !== 14) return false;
          return value.every(
            (row) =>
              Array.isArray(row) &&
              row.length === 7 &&
              row.every(
                (cell) =>
                  typeof cell === "number" &&
                  Number.isFinite(cell) &&
                  cell >= 0 &&
                  cell <= 1
              )
          );
        },
        message: "availability must be a 14x7 matrix with values between 0 and 1",
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
    scheduleRequests: { type: [scheduleRequestSchema], default: [] },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
