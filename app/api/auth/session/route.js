import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ensureIndexes,
  getDb,
  publicSubscription,
  publicUser,
  readSession,
  setAuthCookies,
  toObjectId,
} from "../../../../lib/mongodb";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = readSession(cookieStore.get("taxbuddy_session")?.value);
    const userId = toObjectId(session?.userId);

    if (!userId) {
      return NextResponse.json({ user: null, subscription: null }, { status: 401 });
    }

    const db = await getDb();
    await ensureIndexes(db);
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ user: null, subscription: null }, { status: 401 });
    }

    let subscription = await db.collection("subscriptions").findOne(
      { userId },
      { sort: { updatedAt: -1 } },
    );
    if (subscription?.status === "active" && subscription.expiresAt && new Date(subscription.expiresAt).getTime() <= Date.now()) {
      await db.collection("subscriptions").updateOne(
        { _id: subscription._id },
        { $set: { status: "expired", updatedAt: new Date() } },
      );
      subscription = await db.collection("subscriptions").findOne({ _id: subscription._id });
    }

    const res = NextResponse.json({
      user: publicUser(user),
      subscription: publicSubscription(subscription),
    });
    setAuthCookies(res, user._id, subscription);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Session tidak valid." }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("taxbuddy_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  res.cookies.set("taxbuddy_entitlement", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
