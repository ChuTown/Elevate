import express from "express";
import type { Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import { User } from "./models/User.js";
import cloudinary from "./config/cloudinary.js";
import { config } from "./config.js";
import { createAuthRouter } from "./routes/auth.js";
import { loadSession, requireAuth, type RequestWithSession } from "./middleware/session.js";

const { PORT, FRONTEND_ORIGIN } = config;
const app = express();
const DEFAULT_PROFILE_IMAGE_URL =
  process.env.DEFAULT_PROFILE_IMAGE_URL ||
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/1280px-User-avatar.svg.png";
const CLOUDINARY_CONFIGURED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.mimetype)) {
      cb(new Error("Only JPG, PNG, or WEBP images are allowed"));
      return;
    }
    cb(null, true);
  },
});

function normalizeAvailability(value: unknown) {
  const empty = Array.from({ length: 14 }, () => Array.from({ length: 7 }, () => 0));
  if (!Array.isArray(value)) {
    return empty;
  }

  return empty.map((row, rowIndex) => {
    const candidateRow = value[rowIndex];
    if (!Array.isArray(candidateRow)) {
      return row;
    }

    return row.map((_, colIndex) => {
      const candidate = candidateRow[colIndex];
      const normalized = typeof candidate === "number" ? candidate : 0;
      if (!Number.isFinite(normalized)) {
        return 0;
      }
      return normalized > 0 ? 1 : 0;
    });
  });
}

async function fetchFeaturedUsers() {
  return User.find({
    profile: { $exists: true, $ne: null },
    "profile.isListed": true,
  })
    .sort({ updatedAt: -1 })
    .limit(8)
    .select("name email profile")
    .lean();
}

function writeFeaturedEvent(res: Response, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\\n\\n`);
}

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(loadSession);
app.use("/api/auth", createAuthRouter());

app.get("/", (req, res) => {
  res.send("API running");
});

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello, World!" });
});

app.get("/api/users/featured", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const featuredUsers = await fetchFeaturedUsers();
    res.json(featuredUsers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch featured users" });
  }
});

app.get("/api/users/featured/stream", async (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let previousPayload = "";

  const sendSnapshot = async () => {
    try {
      const featuredUsers = await fetchFeaturedUsers();
      const nextPayload = JSON.stringify(featuredUsers);
      if (nextPayload !== previousPayload) {
        previousPayload = nextPayload;
        writeFeaturedEvent(res, featuredUsers);
      }
    } catch {
      writeFeaturedEvent(res, { error: "Failed to fetch featured users" });
    }
  };

  await sendSnapshot();

  const pollInterval = setInterval(sendSnapshot, 5000);
  const keepAliveInterval = setInterval(() => {
    res.write(": keepalive\\n\\n");
  }, 25000);

  res.on("close", () => {
    clearInterval(pollInterval);
    clearInterval(keepAliveInterval);
  });
});

app.get("/api/users/me/profile", requireAuth, async (req: RequestWithSession, res) => {
  try {
    const user = await User.findById(req.user!._id).select("name email profile");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to fetch your profile" });
  }
});

app.post("/api/users/me/availability", requireAuth, async (req: RequestWithSession, res) => {
  try {
    const { availability, isListed } = req.body;
    const user = await User.findById(req.user!._id).select("profile");
    if (!user || !user.profile) {
      return res.status(400).json({ error: "Create your profile before setting availability" });
    }

    user.set("profile.availability", normalizeAvailability(availability));
    user.set("profile.isListed", Boolean(isListed));
    await user.save();

    res.status(200).json({
      availability: user.profile.availability,
      isListed: user.profile.isListed,
    });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to save availability" });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name email profile");
    if (!user || !user.profile) {
      return res.status(404).json({ error: "User profile not found" });
    }
    res.json(user);
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      return res.status(404).json({ error: "User profile not found" });
    }
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

app.post("/api/users", requireAuth, async (req: RequestWithSession, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const normalizedName = String(name).trim();
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { name: normalizedName },
      { new: true, runValidators: true }
    );
    res.status(200).json(user);
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.post("/api/users/profile/photo", upload.single("photo"), async (req, res) => {
  try {
    if (!CLOUDINARY_CONFIGURED) {
      return res.status(500).json({ error: "Cloudinary is not configured on the server" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Profile photo is required" });
    }
    const file = req.file;

    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "elevate/profile-pictures",
            resource_type: "image",
            transformation: [{ width: 300, height: 300, crop: "fill", gravity: "face" }],
          },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error("Failed to upload image"));
              return;
            }
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
          }
        );

        uploadStream.end(file.buffer);
      }
    );

    res.status(201).json({
      profilePhotoUrl: uploadResult.secure_url,
      profilePhotoPublicId: uploadResult.public_id,
    });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to upload profile photo" });
  }
});

app.post("/api/users/profile", requireAuth, async (req: RequestWithSession, res) => {
  try {
    const {
      firstName,
      lastName,
      profilePhotoUrl,
      profilePhotoPublicId,
      professionalTitle,
      hourlyRate,
      yearsOfExperience,
      primaryIndustry,
      location,
      currentRole,
      currentCompany,
      summary,
    } = req.body;

    if (!firstName || !lastName || !professionalTitle) {
      return res.status(400).json({
        error: "firstName, lastName, and professionalTitle are required",
      });
    }

    const normalizedEmail = String(req.user!.email).trim().toLowerCase();
    const normalizedFirstName = String(firstName).trim();
    const normalizedLastName = String(lastName).trim();
    const normalizedName = `${normalizedFirstName} ${normalizedLastName}`.trim();
    const existingUser = await User.findById(req.user!._id).select(
      "profile.isListed profile.availability"
    );

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      {
        name: normalizedName,
        email: normalizedEmail,
        profile: {
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          profilePhotoUrl:
            typeof profilePhotoUrl === "string" && profilePhotoUrl.trim()
              ? profilePhotoUrl.trim()
              : DEFAULT_PROFILE_IMAGE_URL,
          profilePhotoPublicId:
            typeof profilePhotoPublicId === "string" ? profilePhotoPublicId.trim() : "",
          professionalTitle: String(professionalTitle).trim(),
          hourlyRate: Number.isFinite(Number(hourlyRate))
            ? Math.max(0, Number(hourlyRate))
            : 0,
          yearsOfExperience: Number.isFinite(Number(yearsOfExperience))
            ? Number(yearsOfExperience)
            : 0,
          primaryIndustry: String(primaryIndustry || "").trim(),
          location: String(location || "").trim(),
          currentRole: String(currentRole || "").trim(),
          currentCompany: String(currentCompany || "").trim(),
          summary: String(summary || "").trim(),
          availability: existingUser?.profile?.availability ?? normalizeAvailability([]),
          isListed: existingUser?.profile?.isListed ?? false,
        },
      },
      { new: true, runValidators: true }
    );

    res.status(201).json(user);
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      return res.status(409).json({ error: "Email already in use" });
    }
    res.status(500).json({ error: "Failed to create profile" });
  }
});

app.post("/api/users/:id/schedule-request", requireAuth, async (req: RequestWithSession, res) => {
  try {
    const { dayIndex, slotIndex } = req.body;
    const normalizedDayIndex = Number(dayIndex);
    const normalizedSlotIndex = Number(slotIndex);

    if (
      !Number.isInteger(normalizedDayIndex) ||
      normalizedDayIndex < 0 ||
      normalizedDayIndex > 6 ||
      !Number.isInteger(normalizedSlotIndex) ||
      normalizedSlotIndex < 0 ||
      normalizedSlotIndex > 13
    ) {
      return res.status(400).json({ error: "Invalid day or time slot index" });
    }

    const targetUser = await User.findById(req.params.id).select("profile scheduleRequests");
    if (!targetUser || !targetUser.profile) {
      return res.status(404).json({ error: "Professional profile not found" });
    }

    const availability = normalizeAvailability(targetUser.profile.availability);
    const isAvailable = availability[normalizedSlotIndex]?.[normalizedDayIndex] === 1;
    if (!isAvailable) {
      return res.status(400).json({ error: "That time slot is not available" });
    }

    const hasDuplicatePending = targetUser.scheduleRequests.some(
      (request) =>
        String(request.requesterId) === String(req.user!._id) &&
        request.dayIndex === normalizedDayIndex &&
        request.slotIndex === normalizedSlotIndex &&
        request.status === "pending"
    );
    if (hasDuplicatePending) {
      return res.status(409).json({ error: "You already requested this time slot" });
    }

    targetUser.scheduleRequests.push({
      requesterId: req.user!._id,
      requesterEmail: String(req.user!.email),
      dayIndex: normalizedDayIndex,
      slotIndex: normalizedSlotIndex,
      status: "pending",
    });

    await targetUser.save();
    res.status(201).json({ message: "Schedule request submitted" });
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      return res.status(404).json({ error: "Professional profile not found" });
    }
    res.status(500).json({ error: "Failed to submit schedule request" });
  }
});

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
