import { NextResponse } from "next/server";
import { isSubscriptionActive } from "../../../../lib/billing";
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
    const requestedPlan = body.plan ? String(body.plan).toLowerCase() : "";

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
    let subscription = await db.collection("subscriptions").findOne(
      { userId: user._id },
      { sort: { updatedAt: -1 } },
    );

    if (requestedPlan && !isSubscriptionActive(subscription, now)) {
      await db.collection("subscriptions").updateOne(
        { userId: user._id, status: "pending_payment" },
        {
          $set: { plan: requestedPlan, status: "pending_payment", updatedAt: now },
          $setOnInsert: { userId: user._id, createdAt: now },
        },
        { upsert: true },
      );
      subscription = await db.collection("subscriptions").findOne(
        { userId: user._id },
        { sort: { updatedAt: -1 } },
      );
    }

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
