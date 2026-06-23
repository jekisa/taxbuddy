import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addDays, getBillingPlan } from "../../../../../lib/billing";
import { clientKey, createSnapTransaction, snapScriptUrl } from "../../../../../lib/midtrans";
import {
  ensureIndexes,
  getDb,
  publicSubscription,
  publicUser,
  readSession,
  setAuthCookies,
  toObjectId,
} from "../../../../../lib/mongodb";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = readSession(cookieStore.get("taxbuddy_session")?.value);
    const userId = toObjectId(session?.userId);

    if (!userId) {
      return NextResponse.json({ error: "Silakan login untuk melanjutkan pembayaran." }, { status: 401 });
    }

    const body = await request.json();
    const planKey = String(body.plan || "professional").toLowerCase();
    const plan = getBillingPlan(planKey);
    if (!plan) {
      return NextResponse.json({ error: "Package tidak dikenal." }, { status: 400 });
    }

    const db = await getDb();
    await ensureIndexes(db);
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: "Akun tidak ditemukan. Silakan login ulang." }, { status: 401 });
    }

    const now = new Date();
    const orderId = `TB-${planKey.toUpperCase()}-${Date.now()}-${String(userId).slice(-6)}`;
    const expiresAt = addDays(now, plan.durationDays);
    await db.collection("payments").insertOne({
      userId,
      orderId,
      plan: planKey,
      amount: plan.amount,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      subscriptionExpiresAt: expiresAt,
    });
    await db.collection("subscriptions").updateOne(
      { userId },
      {
        $set: { plan: planKey, status: "pending_payment", updatedAt: now },
        $setOnInsert: { userId, createdAt: now },
      },
      { upsert: true },
    );

    const snap = await createSnapTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: plan.amount,
      },
      item_details: [
        {
          id: planKey,
          price: plan.amount,
          quantity: 1,
          name: `TaxBuddy ${plan.name} - 30 hari`,
        },
      ],
      customer_details: {
        first_name: user.name,
        email: user.email,
      },
      callbacks: {
        finish: `${request.nextUrl.origin}/checkout?plan=${encodeURIComponent(planKey)}&order_id=${encodeURIComponent(orderId)}`,
      },
    });

    const subscription = await db.collection("subscriptions").findOne({ userId }, { sort: { updatedAt: -1 } });
    const res = NextResponse.json({
      token: snap.token,
      redirect_url: snap.redirect_url,
      orderId,
      snapScript: snapScriptUrl(),
      clientKey: clientKey(),
      user: publicUser(user),
      subscription: publicSubscription(subscription),
    });
    setAuthCookies(res, userId, subscription);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal membuat pembayaran Midtrans." }, { status: 500 });
  }
}
