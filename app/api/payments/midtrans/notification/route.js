import { NextResponse } from "next/server";
import { isPaidTransaction, isValidMidtransSignature } from "../../../../../lib/midtrans";
import { ensureIndexes, getDb } from "../../../../../lib/mongodb";

export async function POST(request) {
  try {
    const payload = await request.json();
    if (!isValidMidtransSignature(payload)) {
      return NextResponse.json({ error: "Signature Midtrans tidak valid." }, { status: 403 });
    }

    const db = await getDb();
    await ensureIndexes(db);
    const payment = await db.collection("payments").findOne({ orderId: payload.order_id });
    if (!payment) {
      return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
    }

    const now = new Date();
    const paid = isPaidTransaction(payload);
    await db.collection("payments").updateOne(
      { _id: payment._id },
      {
        $set: {
          status: payload.transaction_status || "unknown",
          fraudStatus: payload.fraud_status || null,
          paymentType: payload.payment_type || null,
          rawNotification: payload,
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Webhook Midtrans gagal." }, { status: 500 });
  }
}
