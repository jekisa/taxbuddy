import { NextResponse } from "next/server";
import {
  ensureIndexes,
  getDb,
  normalizeEmail,
  publicSubscription,
  publicUser,
  setAuthCookies,
  verifyPassword,
} from "../../../../lib/mongodb";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    const plan = String(body.plan || "starter").toLowerCase();

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
    }

    const db = await getDb();
    await ensureIndexes(db);
    const user = await db.collection("users").findOne({ email });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Email atau password tidak sesuai." }, { status: 401 });
    }

    const now = new Date();
    await db.collection("subscriptions").updateOne(
      { userId: user._id, status: { $in: ["pending_payment", "sales_requested"] } },
      {
        $set: { plan, status: "pending_payment", updatedAt: now },
        $setOnInsert: { userId: user._id, createdAt: now },
      },
      { upsert: true },
    );

    const subscription = await db.collection("subscriptions").findOne(
      { userId: user._id },
      { sort: { updatedAt: -1 } },
    );

    const res = NextResponse.json({
      user: publicUser(user),
      subscription: publicSubscription(subscription),
    });
    setAuthCookies(res, user._id, subscription);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Login gagal." }, { status: 500 });
  }
}
