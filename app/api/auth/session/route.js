import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { effectiveSubscriptionExpiresAt } from "../../../../lib/billing";
import { isProduction } from "../../../../lib/env";
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
      return NextResponse.json({ user: null, subscription: null });
    }

    const db = await getDb();
    await ensureIndexes(db);
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) {
      const res = NextResponse.json({ user: null, subscription: null });
      res.cookies.set("taxbuddy_session", "", {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction(),
        path: "/",
        maxAge: 0,
      });
      res.cookies.set("taxbuddy_entitlement", "", {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction(),
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    let subscription = await db.collection("subscriptions").findOne(
      { userId },
      { sort: { updatedAt: -1 } },
    );
    const expiresAt = effectiveSubscriptionExpiresAt(subscription);
    if (subscription?.status === "active" && expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      await db.collection("subscriptions").updateOne(
        { _id: subscription._id },
        { $set: { status: "expired", expiresAt, updatedAt: new Date() } },
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
    secure: isProduction(),
    path: "/",
    maxAge: 0,
  });
  res.cookies.set("taxbuddy_entitlement", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 0,
  });
  return res;
}
