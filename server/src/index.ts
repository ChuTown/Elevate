import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import { User } from "./models/User.js";
import cloudinary from "./config/cloudinary.js";
import { config } from "./config.js";
import { createAuthRouter } from "./routes/auth.js";
import { loadSession } from "./middleware/session.js";

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

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/users/featured", async (req, res) => {
  try {
    const featuredUsers = await User.find({
      profile: { $exists: true, $ne: null },
    })
      .sort({ updatedAt: -1 })
      .limit(8)
      .select("name email profile");

    res.json(featuredUsers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch featured users" });
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

app.post("/api/users", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }
    const user = await User.create({ name, email });
    res.status(201).json(user);
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      return res.status(409).json({ error: "Email already in use" });
    }
    res.status(500).json({ error: "Failed to create user" });
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

app.post("/api/users/profile", async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      profilePhotoUrl,
      profilePhotoPublicId,
      professionalTitle,
      yearsOfExperience,
      primaryIndustry,
      location,
      currentRole,
      currentCompany,
      summary,
    } = req.body;

    if (!email || !firstName || !lastName || !professionalTitle) {
      return res
        .status(400)
        .json({
          error: "email, firstName, lastName, and professionalTitle are required",
        });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedFirstName = String(firstName).trim();
    const normalizedLastName = String(lastName).trim();
    const normalizedName = `${normalizedFirstName} ${normalizedLastName}`.trim();

    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
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
          yearsOfExperience: Number.isFinite(Number(yearsOfExperience))
            ? Number(yearsOfExperience)
            : 0,
          primaryIndustry: String(primaryIndustry || "").trim(),
          location: String(location || "").trim(),
          currentRole: String(currentRole || "").trim(),
          currentCompany: String(currentCompany || "").trim(),
          summary: String(summary || "").trim(),
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
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

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
