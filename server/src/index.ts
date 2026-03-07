import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { User } from "./models/User.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

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

app.post("/api/users/profile", async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
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

// Must match API_PORT in client/vite.config.ts proxy (avoid 5000 - macOS AirPlay uses it)
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
