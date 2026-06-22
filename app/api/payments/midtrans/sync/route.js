import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getTransactionStatus, isPaidTransaction } from "../../../../../lib/midtrans";
import {
  ensureIndexes,
  getDb,
  publicSubscription,
  readSession,
  setAuthCookies,
  toObjectId,
} from "../../../../../lib/mongodb";

async function updateFromMidtrans(db, payment, status) {
  const now = new Date();
  const paid = isPaidTransaction(status);
  await db.collection("payments").updateOne(
    { _id: payment._id },
    {
      $set: {
        status: status.transaction_status || "unknown",
        fraudStatus: status.fraud_status || null,
        paymentType: status.payment_type || null,
        rawStatus: status,
        paidAt: paid ? now : payment.paidAt || null,
        updatedAt: now,
      },
    },
  );

  if (paid) {
    await db.collection("subscriptions").updateOne(
      { userId: payment.userId },
      {
        $set: {
          plan: payment.plan,
          status: "active",
          activatedAt: now,
          expiresAt: payment.subscriptionExpiresAt,
          updatedAt: now,
        },
        $setOnInsert: { userId: payment.userId, createdAt: now },
      },
      { upsert: true },
    );
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = readSession(cookieStore.get("taxbuddy_session")?.value);
    const userId = toObjectId(session?.userId);
    if (!userId) {
      return NextResponse.json({ error: "Silakan login ulang." }, { status: 401 });
    }

    const body = await request.json();
    const orderId = String(body.orderId || "");
    if (!orderId) {
      return NextResponse.json({ error: "Order ID kosong." }, { status: 400 });
    }

    const db = await getDb();
    await ensureIndexes(db);
    const payment = await db.collection("payments").findOne({ orderId, userId });
    if (!payment) {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan." }, { status: 404 });
    }

    const status = await getTransactionStatus(orderId);
    await updateFromMidtrans(db, payment, status);
    const subscription = await db.collection("subscriptions").findOne({ userId }, { sort: { updatedAt: -1 } });

    const res = NextResponse.json({
      paid: isPaidTransaction(status),
      status,
      subscription: publicSubscription(subscription),
    });
    setAuthCookies(res, userId, subscription);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal sinkronisasi pembayaran." }, { status: 500 });
  }
}
