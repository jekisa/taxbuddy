import { NextResponse } from "next/server";
import { ensureIndexes, getDb, hashPassword, normalizeEmail, setAuthCookies } from "../../../../lib/mongodb";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const company = String(body.company || "").trim();
    const phone = String(body.phone || "").trim();
    const plan = body.plan ? String(body.plan).toLowerCase() : "";

    if (!email || !password || !name || !company || !phone) {
      return NextResponse.json({ error: "Nama, perusahaan, no handphone, email, dan password wajib diisi." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
    }
    if (!/^[+\d][\d\s().-]{7,20}$/.test(phone)) {
      return NextResponse.json({ error: "Format no handphone tidak valid." }, { status: 400 });
    }

    const db = await getDb();
    await ensureIndexes(db);
    const now = new Date();
    const result = await db.collection("users").insertOne({
      email,
      passwordHash: hashPassword(password),
      name,
      company,
      phone,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });

    const subscriptionDoc = plan ? {
      userId: result.insertedId,
      plan,
      status: "pending_payment",
      createdAt: now,
      updatedAt: now,
    } : null;
    if (subscriptionDoc) await db.collection("subscriptions").insertOne(subscriptionDoc);

    const res = NextResponse.json({
      user: { id: String(result.insertedId), email, name, company, phone },
      subscription: subscriptionDoc ? { plan, status: "pending_payment" } : null,
    });
    setAuthCookies(res, result.insertedId, subscriptionDoc);
    return res;
  } catch (err) {
    if (err && err.code === 11000) {
      return NextResponse.json({ error: "Email sudah terdaftar. Silakan login." }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || "Register gagal." }, { status: 500 });
  }
}
