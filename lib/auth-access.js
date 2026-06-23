import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSubscriptionActive, subscriptionAccess } from "./billing";
import { ensureIndexes, getDb, readSession, toObjectId } from "./mongodb";

export async function currentAccountAccess(cookieStore = null) {
  const store = cookieStore || await cookies();
  const session = readSession(store.get("taxbuddy_session")?.value);
  const userId = toObjectId(session?.userId);
  if (!userId) return { cookieStore: store, userId: null, subscription: null, active: false, access: null };

  const db = await getDb();
  await ensureIndexes(db);
  const subscription = await db.collection("subscriptions").findOne(
    { userId },
    { sort: { updatedAt: -1 } },
  );
  const active = isSubscriptionActive(subscription);
  return {
    cookieStore: store,
    userId,
    subscription,
    active,
    access: subscriptionAccess(subscription),
  };
}

export async function requireActiveAccount(message = "Fitur ini hanya tersedia untuk akun berlangganan aktif.") {
  const account = await currentAccountAccess();
  if (!account.userId || !account.active) {
    return {
      ok: false,
      response: NextResponse.json({
        error: message,
        upgrade_required: true,
        feature_locked: true,
        pricing_url: account.userId ? "/#pricing" : "/auth?mode=login",
      }, { status: 402 }),
    };
  }
  return { ok: true, ...account };
}
