import express from "express";
import type { Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import { User } from "./models/User.js";
import { Conversation } from "./models/Conversation.js";
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

const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = new Set(["application/pdf"]);
    if (!allowedTypes.has(file.mimetype)) {
      cb(new Error("Only PDF files are allowed for resume"));
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
  const users = await fetchProfessionalUsers({ listedOnly: true, limit: 8 });

  return users;
}

async function fetchProfessionalUsers({
  listedOnly = false,
  limit,
}: {
  listedOnly?: boolean;
  limit?: number;
}) {
  const query: Record<string, unknown> = {
    profile: { $exists: true, $ne: null },
  };
  if (listedOnly) {
    query["profile.isListed"] = true;
  }

  let mongoQuery = User.find(query).sort({ updatedAt: -1 }).select("name email profile reviews");
  if (typeof limit === "number") {
    mongoQuery = mongoQuery.limit(limit);
  }

  const users = await mongoQuery.lean();

  return users.map((user) => {
    const reviews = Array.isArray(user.reviews) ? user.reviews : [];
    const totalRatings = reviews.length;
    const averageRating =
      totalRatings > 0
        ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalRatings).toFixed(1))
        : 0;

    return { ...user, averageRating, totalRatings };
  });
}

function writeFeaturedEvent(res: Response, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\\n\\n`);
}

function normalizeGuestName(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || "Guest";
}

function normalizeMessageText(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, 2000);
}

function canAccessConversation(
  req: RequestWithSession,
  conversation: { professionalId: mongoose.Types.ObjectId | string; guestId: string }
) {
  if (req.user) {
    return String(conversation.professionalId) === String(req.user._id);
  }
  const guestId = typeof req.query.guestId === "string" ? req.query.guestId.trim() : "";
  return Boolean(guestId && guestId === conversation.guestId);
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

app.get("/api/users/professionals", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const users = await fetchProfessionalUsers({ listedOnly: false });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch professionals" });
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

app.get("/api/users/me/client-profile", requireAuth, async (req: RequestWithSession, res) => {
  try {
    const user = await User.findById(req.user!._id).select("clientProfile").lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ clientProfile: user.clientProfile ?? {} });
  } catch {
    res.status(500).json({ error: "Failed to fetch client profile" });
  }
});

app.put("/api/users/me/client-profile", requireAuth, async (req: RequestWithSession, res) => {
  try {
    const {
      firstName,
      lastName,
      description,
      profilePhotoUrl,
      profilePhotoPublicId,
      resumeUrl,
      resumePublicId,
    } = req.body;
    const user = await User.findById(req.user!._id).select("clientProfile");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.clientProfile) {
      user.clientProfile = {
        firstName: "",
        lastName: "",
        profilePhotoUrl: "",
        profilePhotoPublicId: "",
        resumeUrl: "",
        resumePublicId: "",
        description: "",
      };
    }
    if (typeof firstName === "string") {
      user.clientProfile.firstName = firstName.trim().slice(0, 80);
    }
    if (typeof lastName === "string") {
      user.clientProfile.lastName = lastName.trim().slice(0, 80);
    }
    if (typeof description === "string") {
      user.clientProfile.description = description.trim().slice(0, 2000);
    }
    if (typeof profilePhotoUrl === "string" && profilePhotoUrl.trim()) {
      user.clientProfile.profilePhotoUrl = profilePhotoUrl.trim();
    }
    if (typeof profilePhotoPublicId === "string") {
      user.clientProfile.profilePhotoPublicId = profilePhotoPublicId.trim();
    }
    if (typeof resumeUrl === "string" && resumeUrl.trim()) {
      user.clientProfile.resumeUrl = resumeUrl.trim();
    }
    if (typeof resumePublicId === "string") {
      user.clientProfile.resumePublicId = resumePublicId.trim();
    }
    await user.save();
    res.json({ clientProfile: user.clientProfile });
  } catch {
    res.status(500).json({ error: "Failed to update client profile" });
  }
});

app.post(
  "/api/users/me/client-profile/photo",
  requireAuth,
  upload.single("photo"),
  async (req: RequestWithSession, res) => {
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
              folder: "elevate/client-profile-pictures",
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
      const user = await User.findById(req.user!._id).select("clientProfile");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (!user.clientProfile) {
        user.clientProfile = {
          firstName: "",
          lastName: "",
          profilePhotoUrl: "",
          profilePhotoPublicId: "",
          resumeUrl: "",
          resumePublicId: "",
          description: "",
        };
      }
      if (user.clientProfile.profilePhotoPublicId) {
        try {
          await cloudinary.uploader.destroy(user.clientProfile.profilePhotoPublicId);
        } catch {
          // ignore destroy errors
        }
      }
      user.clientProfile.profilePhotoUrl = uploadResult.secure_url;
      user.clientProfile.profilePhotoPublicId = uploadResult.public_id;
      await user.save();
      res.status(201).json({
        profilePhotoUrl: uploadResult.secure_url,
        profilePhotoPublicId: uploadResult.public_id,
      });
    } catch (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Failed to upload client profile photo" });
    }
  }
);

app.post(
  "/api/users/me/client-profile/resume",
  requireAuth,
  uploadResume.single("resume"),
  async (req: RequestWithSession, res) => {
    try {
      if (!CLOUDINARY_CONFIGURED) {
        return res.status(500).json({ error: "Cloudinary is not configured on the server" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "Resume file is required (PDF)" });
      }
      const file = req.file;
      const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
        (resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "elevate/client-resumes",
              resource_type: "raw",
            },
            (error, result) => {
              if (error || !result) {
                reject(error || new Error("Failed to upload resume"));
                return;
              }
              resolve({ secure_url: result.secure_url, public_id: result.public_id });
            }
          );
          uploadStream.end(file.buffer);
        }
      );
      const user = await User.findById(req.user!._id).select("clientProfile");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (!user.clientProfile) {
        user.clientProfile = {
          firstName: "",
          lastName: "",
          profilePhotoUrl: "",
          profilePhotoPublicId: "",
          resumeUrl: "",
          resumePublicId: "",
          description: "",
        };
      }
      if (user.clientProfile.resumePublicId) {
        try {
          await cloudinary.uploader.destroy(user.clientProfile.resumePublicId, {
            resource_type: "raw",
          });
        } catch {
          // ignore
        }
      }
      user.clientProfile.resumeUrl = uploadResult.secure_url;
      user.clientProfile.resumePublicId = uploadResult.public_id;
      await user.save();
      res.status(201).json({
        resumeUrl: uploadResult.secure_url,
        resumePublicId: uploadResult.public_id,
      });
    } catch (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Failed to upload resume" });
    }
  }
);

app.post("/api/users/me/availability", requireAuth, async (req: RequestWithSession, res) => {
  try {
    const { availability } = req.body;
    const user = await User.findById(req.user!._id).select("profile");
    if (!user || !user.profile) {
      return res.status(400).json({ error: "Create your profile before setting availability" });
    }

    user.set("profile.availability", normalizeAvailability(availability));
    user.set("profile.isListed", true);
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

app.get("/api/users/me/schedule-requests", requireAuth, async (req: RequestWithSession, res) => {
  try {
    const user = await User.findById(req.user!._id)
      .select("scheduleRequests")
      .lean();
    if (!user || !user.scheduleRequests || user.scheduleRequests.length === 0) {
      return res.json({ scheduleRequests: [] });
    }
    const requesters = await User.find({
      _id: { $in: user.scheduleRequests.map((r) => r.requesterId) },
    })
      .select("name email clientProfile")
      .lean();
    const requesterMap = new Map(
      requesters.map((r) => [String(r._id), { _id: r._id, name: r.name, email: r.email, clientProfile: r.clientProfile ?? {} }])
    );
    const scheduleRequests = user.scheduleRequests.map((r) => ({
      _id: r._id,
      requesterId: r.requesterId,
      requesterEmail: r.requesterEmail,
      dayIndex: r.dayIndex,
      slotIndex: r.slotIndex,
      status: r.status,
      createdAt: r.createdAt,
      requester: requesterMap.get(String(r.requesterId)) ?? {
        _id: r.requesterId,
        name: "",
        email: r.requesterEmail,
        clientProfile: {},
      },
    }));
    res.json({ scheduleRequests });
  } catch {
    res.status(500).json({ error: "Failed to fetch schedule requests" });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name email profile reviews");
    if (!user || !user.profile) {
      return res.status(404).json({ error: "User profile not found" });
    }
    const reviews = Array.isArray(user.reviews) ? user.reviews : [];
    const totalRatings = reviews.length;
    const averageRating =
      totalRatings > 0
        ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalRatings).toFixed(1))
        : 0;

    res.json({ ...user.toObject(), averageRating, totalRatings });
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      return res.status(404).json({ error: "User profile not found" });
    }
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

app.post("/api/users/:id/reviews", requireAuth, async (req: RequestWithSession, res) => {
  try {
    const rating = Number(req.body?.rating);
    const comment = String(req.body?.comment || "").trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be an integer from 1 to 5" });
    }

    const targetUser = await User.findById(req.params.id).select("reviews");
    if (!targetUser) {
      return res.status(404).json({ error: "Professional not found" });
    }
    if (String(targetUser._id) === String(req.user!._id)) {
      return res.status(400).json({ error: "You cannot review yourself" });
    }

    const existingReview = targetUser.reviews.find(
      (review) => String(review.reviewerId) === String(req.user!._id)
    );

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.updatedAt = new Date();
    } else {
      targetUser.reviews.push({
        reviewerId: req.user!._id,
        reviewerName: String(req.user!.name || req.user!.email),
        reviewerEmail: String(req.user!.email),
        rating,
        comment,
        updatedAt: new Date(),
      });
    }

    await targetUser.save();

    const reviews = targetUser.reviews;
    const totalRatings = reviews.length;
    const averageRating =
      totalRatings > 0
        ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalRatings).toFixed(1))
        : 0;

    res.status(201).json({
      averageRating,
      totalRatings,
      reviews: targetUser.reviews
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    });
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) {
      return res.status(404).json({ error: "Professional not found" });
    }
    res.status(500).json({ error: "Failed to submit review" });
  }
});

app.post("/api/chat/conversations", async (req: RequestWithSession, res) => {
  try {
    const professionalIdRaw =
      typeof req.body?.professionalId === "string" ? req.body.professionalId.trim() : "";
    if (!mongoose.Types.ObjectId.isValid(professionalIdRaw)) {
      return res.status(400).json({ error: "Invalid professionalId" });
    }

    const professional = await User.findById(professionalIdRaw).select("name profile");
    if (!professional || !professional.profile) {
      return res.status(404).json({ error: "Professional not found" });
    }

    const guestId = typeof req.body?.guestId === "string" ? req.body.guestId.trim() : "";
    if (!guestId) {
      return res.status(400).json({ error: "guestId is required" });
    }
    const guestName = normalizeGuestName(req.body?.guestName);

    const conversation = await Conversation.findOneAndUpdate(
      { professionalId: professional._id, guestId },
      {
        $set: {
          professionalId: professional._id,
          guestId,
          guestName,
          lastMessageAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    res.status(201).json({
      conversation,
      professional: {
        _id: professional._id,
        name: professional.name,
        profile: professional.profile,
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

app.get(
  "/api/chat/professional/conversations",
  requireAuth,
  async (req: RequestWithSession, res) => {
    try {
      const conversations = await Conversation.find({ professionalId: req.user!._id })
        .sort({ lastMessageAt: -1 })
        .limit(100)
        .lean();

      const serialized = conversations.map((conversation) => {
        const lastMessage = conversation.messages[conversation.messages.length - 1] ?? null;
        return {
          _id: conversation._id,
          guestId: conversation.guestId,
          guestName: conversation.guestName,
          professionalId: conversation.professionalId,
          lastMessageAt: conversation.lastMessageAt,
          lastMessage,
          messagesCount: conversation.messages.length,
        };
      });

      res.json(serialized);
    } catch {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  }
);

app.get("/api/chat/conversations/:conversationId", async (req: RequestWithSession, res) => {
  try {
    const conversationParam = req.params.conversationId;
    const conversationId = typeof conversationParam === "string" ? conversationParam : "";
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (!canAccessConversation(req, conversation)) {
      return res.status(403).json({ error: "Not allowed to access this conversation" });
    }

    const professional = await User.findById(conversation.professionalId).select("name profile");
    res.json({
      ...conversation,
      professional: professional
        ? {
            _id: professional._id,
            name: professional.name,
            profile: professional.profile,
          }
        : null,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

app.post("/api/chat/conversations/:conversationId/messages", async (req: RequestWithSession, res) => {
  try {
    const conversationParam = req.params.conversationId;
    const conversationId = typeof conversationParam === "string" ? conversationParam : "";
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const text = normalizeMessageText(req.body?.text);
    if (!text) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    let senderRole: "professional" | "guest";
    let senderName: string;
    if (req.user) {
      if (String(conversation.professionalId) !== String(req.user._id)) {
        return res.status(403).json({ error: "Not allowed to send to this conversation" });
      }
      senderRole = "professional";
      const firstName = req.user.profile?.firstName ?? "";
      const lastName = req.user.profile?.lastName ?? "";
      senderName = `${firstName} ${lastName}`.trim() || req.user.name || "Professional";
    } else {
      const guestId = typeof req.body?.guestId === "string" ? req.body.guestId.trim() : "";
      if (!guestId || guestId !== conversation.guestId) {
        return res.status(403).json({ error: "Guest is not allowed to send to this conversation" });
      }
      senderRole = "guest";
      senderName = normalizeGuestName(req.body?.guestName || conversation.guestName);
      conversation.guestName = senderName;
    }

    const message = {
      senderRole,
      senderName,
      text,
      createdAt: new Date(),
    };

    conversation.messages.push(message);
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    res.status(201).json({ message, conversationId: conversation._id });
  } catch {
    res.status(500).json({ error: "Failed to send message" });
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

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
