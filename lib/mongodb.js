import { MongoClient, ObjectId } from "mongodb";
import crypto from "crypto";
import { subscriptionAccess } from "./billing";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "taxbuddy";
const sessionSecret = process.env.SESSION_SECRET || "taxbuddy-dev-session-secret";

let cachedClient = null;

export function assertMongoConfigured() {
  if (!uri) {
    throw new Error("MONGODB_URI belum diset. Tambahkan env MONGODB_URI untuk mengaktifkan auth MongoDB.");
  }
}

export async function getDb() {
  assertMongoConfigured();
  if (!cachedClient) {
    cachedClient = new MongoClient(uri);
    await cachedClient.connect();
  }
  return cachedClient.db(dbName);
}

export async function ensureIndexes(db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("subscriptions").createIndex({ userId: 1 }),
    db.collection("subscriptions").createIndex({ status: 1 }),
    db.collection("payments").createIndex({ orderId: 1 }, { unique: true }),
    db.collection("payments").createIndex({ userId: 1 }),
  ]);
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, originalHash] = String(stored || "").split(":");
  if (!salt || !originalHash) return false;
  const candidate = hashPassword(password, salt).split(":")[1];
  if (candidate.length !== originalHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(originalHash, "hex"));
}

export function signSession(userId) {
  const payload = Buffer.from(JSON.stringify({
    userId: String(userId),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
  })).toString("base64url");
  const sig = crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readSession(token) {
  if (!token || !String(token).includes(".")) return null;
  const [payload, sig] = String(token).split(".");
  const expected = crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!data.exp || data.exp < Date.now()) return null;
  return data;
}

export function toObjectId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    company: user.company,
    role: user.role || "owner",
  };
}

export function publicSubscription(subscription) {
  if (!subscription) return null;
  return {
    id: String(subscription._id),
    plan: subscription.plan,
    status: subscription.status,
    activatedAt: subscription.activatedAt || null,
    expiresAt: subscription.expiresAt || null,
    updatedAt: subscription.updatedAt || null,
    access: subscriptionAccess(subscription),
  };
}

export function signEntitlement(subscription) {
  const access = subscriptionAccess(subscription);
  const payload = Buffer.from(JSON.stringify({
    ...access,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  })).toString("base64url");
  const sig = crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function setAuthCookies(res, userId, subscription) {
  res.cookies.set("taxbuddy_session", signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  res.cookies.set("taxbuddy_entitlement", signEntitlement(subscription), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}
