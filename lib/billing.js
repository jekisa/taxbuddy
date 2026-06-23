export const BILLING_PLANS = {
  starter: {
    name: "Starter",
    amount: 799000,
    durationDays: 30,
    limit: 1000,
  },
  professional: {
    name: "Professional",
    amount: 1499000,
    durationDays: 30,
    limit: 5000,
  },
  business: {
    name: "Business",
    amount: 2999000,
    durationDays: 30,
    limit: 20000,
  },
};

export function getBillingPlan(plan) {
  return BILLING_PLANS[String(plan || "").toLowerCase()] || null;
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

export function isSubscriptionActive(subscription, now = new Date()) {
  if (!subscription || subscription.status !== "active") return false;
  if (!subscription.expiresAt) return true;
  return new Date(subscription.expiresAt).getTime() > now.getTime();
}

export function subscriptionAccess(subscription, now = new Date()) {
  if (isSubscriptionActive(subscription, now)) {
    const plan = getBillingPlan(subscription.plan);
    return {
      status: "active",
      plan: subscription.plan,
      limit: plan ? plan.limit : null,
      locked_features: [],
      expiresAt: subscription.expiresAt || null,
      pricing_url: "/#pricing",
    };
  }

  if (subscription && subscription.status === "expired") {
    return {
      status: "expired",
      plan: subscription.plan || "Expired",
      limit: 0,
      locked_features: ["dashboard", "pajak_keluaran", "doc_lain_masukan", "spt_dokumen_lain", "database"],
      expiresAt: subscription.expiresAt || null,
      pricing_url: "/#pricing",
    };
  }

  return {
    status: "trial",
    plan: "Trial",
    limit: 10,
    locked_features: ["doc_lain_masukan", "spt_dokumen_lain"],
    expiresAt: null,
    pricing_url: "/#pricing",
  };
}
