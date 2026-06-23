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
  enterprise: {
    name: "Enterprise",
    amount: 2999000,
    durationDays: 30,
    limit: 20000,
  },
};

export function getBillingPlan(plan) {
  const key = String(plan || "").toLowerCase();
  return BILLING_PLANS[key] || (key === "business" ? BILLING_PLANS.enterprise : null);
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

export function effectiveSubscriptionExpiresAt(subscription) {
  if (!subscription || subscription.status !== "active") return subscription?.expiresAt || null;
  if (subscription.expiresAt) return subscription.expiresAt;

  const plan = getBillingPlan(subscription.plan);
  if (!plan?.durationDays) return null;

  const baseDate = subscription.activatedAt || subscription.updatedAt || subscription.createdAt;
  if (!baseDate) return null;

  const parsed = new Date(baseDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return addDays(parsed, plan.durationDays);
}

export function isSubscriptionActive(subscription, now = new Date()) {
  if (!subscription || subscription.status !== "active") return false;
  const expiresAt = effectiveSubscriptionExpiresAt(subscription);
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > now.getTime();
}

export function subscriptionAccess(subscription, now = new Date()) {
  if (isSubscriptionActive(subscription, now)) {
    const plan = getBillingPlan(subscription.plan);
    const expiresAt = effectiveSubscriptionExpiresAt(subscription);
    return {
      status: "active",
      plan: subscription.plan,
      limit: plan ? plan.limit : null,
      locked_features: [],
      expiresAt: expiresAt || null,
      pricing_url: "/#pricing",
    };
  }

  if (subscription && subscription.status === "expired") {
    return {
      status: "expired",
      plan: subscription.plan || "Expired",
      limit: 0,
      locked_features: ["dashboard", "pajak_keluaran", "doc_lain_masukan", "spt_dokumen_lain", "database", "archive"],
      expiresAt: subscription.expiresAt || null,
      pricing_url: "/#pricing",
    };
  }

  return {
    status: "trial",
    plan: "Trial",
    limit: 10,
    locked_features: ["doc_lain_masukan", "spt_dokumen_lain", "archive"],
    expiresAt: null,
    pricing_url: "/#pricing",
  };
}
