import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { User } from "../models/User.js";

type PoolKey =
  | "first_name"
  | "last_name"
  | "industry"
  | "skill"
  | "role"
  | "company"
  | "location"
  | "summary_seed";

const POOL_KEYS: PoolKey[] = [
  "first_name",
  "last_name",
  "industry",
  "skill",
  "role",
  "company",
  "location",
  "summary_seed",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)] as T;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let count = 40;
  let resetSeeded = false;

  for (const arg of args) {
    if (arg.startsWith("--count=")) {
      const parsed = Number(arg.split("=")[1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        count = Math.floor(parsed);
      }
    } else if (arg === "--reset") {
      resetSeeded = true;
    } else {
      const parsed = Number(arg);
      if (Number.isFinite(parsed) && parsed > 0) {
        count = Math.floor(parsed);
      }
    }
  }

  return { count, resetSeeded };
}

function parsePools(csvPath: string): Record<PoolKey, string[]> {
  const pools = Object.fromEntries(POOL_KEYS.map((key) => [key, [] as string[]])) as Record<
    PoolKey,
    string[]
  >;
  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

  for (const line of lines.slice(1)) {
    const commaIndex = line.indexOf(",");
    if (commaIndex <= 0) continue;
    const type = line.slice(0, commaIndex).trim() as PoolKey;
    const value = line.slice(commaIndex + 1).trim();
    if (!POOL_KEYS.includes(type) || !value) continue;
    pools[type].push(value);
  }

  for (const key of POOL_KEYS) {
    if (pools[key].length === 0) {
      throw new Error(`Missing values for pool key: ${key}`);
    }
  }

  return pools;
}

function makeAvailability(): number[][] {
  const slots = Array.from({ length: 14 }, () => Array.from({ length: 7 }, () => 0));
  for (let day = 0; day < 7; day += 1) {
    const openStart = randomInt(1, 7);
    const openLength = randomInt(3, 7);
    const openEnd = Math.min(13, openStart + openLength);
    for (let slot = openStart; slot <= openEnd; slot += 1) {
      const row = slots[slot];
      if (row) {
        row[day] = Math.random() < 0.75 ? 1 : 0;
      }
    }
    if (Math.random() < 0.25) {
      const extraSlot = randomInt(0, 13);
      const row = slots[extraSlot];
      if (row) {
        row[day] = 1;
      }
    }
  }
  return slots;
}

function buildProfessional(index: number, pools: Record<PoolKey, string[]>) {
  const firstName = pick(pools.first_name);
  const lastName = pick(pools.last_name);
  const role = pick(pools.role);
  const industry = pick(pools.industry);
  const primarySkill = pick(pools.skill);
  const location = pick(pools.location);
  const currentCompany = pick(pools.company);
  const summarySeed = pick(pools.summary_seed);
  const email = `${firstName}.${lastName}.${index}.${randomInt(100, 999)}@seed.elevate.test`.toLowerCase();
  const years = randomInt(1, 18);
  const hourlyRate = randomInt(45, 260);

  return {
    name: `${firstName} ${lastName}`,
    email,
    profile: {
      firstName,
      lastName,
      profilePhotoUrl: "",
      profilePhotoPublicId: "",
      professionalTitle: `${role} (${primarySkill})`,
      hourlyRate,
      yearsOfExperience: years,
      primaryIndustry: industry,
      location,
      currentRole: role,
      currentCompany,
      summary: `${firstName} ${summarySeed} in ${industry}. Core skill: ${primarySkill}.`,
      isListed: true,
      availability: makeAvailability(),
    },
    scheduleRequests: [],
    reviews: [],
  };
}

async function run() {
  const { count, resetSeeded } = parseArgs();
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const csvPath = path.resolve(__dirname, "../data/professional-lists.csv");
  const pools = parsePools(csvPath);

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set");
  }

  await mongoose.connect(mongoUri);

  try {
    if (resetSeeded) {
      const resetResult = await User.deleteMany({ email: /@seed\.elevate\.test$/i });
      console.log(`Deleted ${resetResult.deletedCount} previously seeded users`);
    }

    const docs = Array.from({ length: count }, (_, i) => buildProfessional(i + 1, pools));
    const inserted = await User.insertMany(docs, { ordered: false });
    console.log(`Seeded ${inserted.length} professionals`);
    console.log("Tip: use --reset to clear previous seeded users before inserting");
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Failed to seed professionals:", error);
  process.exitCode = 1;
});
