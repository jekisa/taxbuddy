import { NextResponse } from "next/server";
import { currentAccountAccess } from "../../../lib/auth-access";

export async function requireActiveSubscription() {
  const account = await currentAccountAccess();
  if (!account.userId) {
    return {
      ok: false,
      response: NextResponse.json({
        error: "Doc Lain Masukan hanya tersedia untuk package berbayar. Silakan login dan aktifkan package.",
        upgrade_required: true,
        feature_locked: true,
        pricing_url: "/auth?mode=login",
      }, { status: 402 }),
    };
  }

  if (!account.active) {
    return {
      ok: false,
      response: NextResponse.json({
        error: "Doc Lain Masukan terkunci. Aktifkan package berbayar untuk menggunakan fitur ini.",
        upgrade_required: true,
        feature_locked: true,
        pricing_url: "/#pricing",
      }, { status: 402 }),
    };
  }

  return {
    ok: true,
    userId: account.userId,
    cookieStore: account.cookieStore,
    subscriptionAccess: account.access,
  };
}
