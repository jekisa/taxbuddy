import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ensureIndexes,
  getDb,
  publicSubscription,
  readSession,
  setAuthCookies,
  toObjectId,
} from "../../../../lib/mongodb";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = readSession(cookieStore.get("taxbuddy_session")?.value);
    const userId = toObjectId(session?.userId);

    if (!userId) {
      return NextResponse.json({ error: "Silakan login untuk melanjutkan pembayaran." }, { status: 401 });
    }

    const body = await request.json();
    const plan = String(body.plan || "professional").toLowerCase();
    if (plan !== "enterprise") {
      return NextResponse.json({ error: "Package Starter dan Professional wajib dibayar melalui Midtrans." }, { status: 400 });
    }

    const db = await getDb();
    await ensureIndexes(db);
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: "Akun tidak ditemukan. Silakan login ulang." }, { status: 401 });
    }

    const now = new Date();
    const status = "sales_requested";
    await db.collection("subscriptions").updateOne(
      { userId },
      {
        $set: {
          plan,
          status,
          activatedAt: null,
          expiresAt: null,
          updatedAt: now,
        },
        $setOnInsert: { userId, createdAt: now },
      },
      { upsert: true },
    );

    const subscription = await db.collection("subscriptions").findOne(
      { userId },
      { sort: { updatedAt: -1 } },
    );

    const res = NextResponse.json({ subscription: publicSubscription(subscription) });
    setAuthCookies(res, userId, subscription);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Aktivasi subscription gagal." }, { status: 500 });
  }
}
