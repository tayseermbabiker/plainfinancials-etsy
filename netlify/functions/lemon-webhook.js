// Lemon Squeezy webhook handler
//
// Verifies HMAC signature, then updates Supabase profiles.etsy_plan based on
// subscription lifecycle events.
//
// Required env vars:
//   LEMONSQUEEZY_WEBHOOK_SECRET  — the signing secret set in LS webhook config
//   SUPABASE_URL                  — e.g. https://xxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY     — service_role (bypasses RLS, SERVER-ONLY)

const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const rawBody = event.body || "";
  const signature = event.headers["x-signature"] || event.headers["X-Signature"];

  // Verify signature
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[lemon-webhook] LEMONSQUEEZY_WEBHOOK_SECRET not set — rejecting");
    return { statusCode: 500, body: "Webhook secret not configured" };
  }
  if (!signature) {
    return { statusCode: 401, body: "Missing signature" };
  }
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"));
  if (!valid) {
    console.warn("[lemon-webhook] invalid signature");
    return { statusCode: 401, body: "Invalid signature" };
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const eventName = payload?.meta?.event_name || "";
  const customData = payload?.meta?.custom_data || {};
  const attrs = payload?.data?.attributes || {};
  const userId = customData.user_id || null;
  const email = attrs.user_email || null;
  const renewsAt = attrs.renews_at || null;
  const endsAt = attrs.ends_at || null;

  console.log(`[lemon-webhook] ${eventName}`, { userId, email, status: attrs.status });

  // Decide new plan + expiry based on event
  let newPlan = null;
  let newExpiry = null;
  switch (eventName) {
    case "subscription_created":
    case "subscription_updated":
    case "subscription_resumed":
    case "subscription_payment_success":
      if (attrs.status === "active" || attrs.status === "on_trial" || attrs.status === "past_due") {
        newPlan = "pro";
        newExpiry = renewsAt;
      }
      break;
    case "subscription_cancelled":
      // Cancelled but keep access until period end
      newPlan = "pro";
      newExpiry = endsAt || renewsAt;
      break;
    case "subscription_expired":
      newPlan = "free";
      newExpiry = null;
      break;
    default:
      // Ignore other events for now
      return { statusCode: 200, body: JSON.stringify({ received: true, ignored: eventName }) };
  }

  if (!newPlan) {
    return { statusCode: 200, body: JSON.stringify({ received: true, noUpdate: true }) };
  }

  // Update Supabase profile
  try {
    await updateProfile({ userId, email, etsy_plan: newPlan, etsy_expires_at: newExpiry });
  } catch (e) {
    console.error("[lemon-webhook] Supabase update failed:", e.message);
    return { statusCode: 500, body: "Supabase update failed" };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ received: true, event: eventName, plan: newPlan }),
  };
};

async function updateProfile({ userId, email, etsy_plan, etsy_expires_at }) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase env vars not set");
  }

  // Prefer user_id (from checkout custom_data); fall back to email match
  let filter;
  if (userId) {
    filter = `id=eq.${encodeURIComponent(userId)}`;
  } else if (email) {
    filter = `email=eq.${encodeURIComponent(email)}`;
  } else {
    throw new Error("No user_id or email to match");
  }

  const url = `${SUPABASE_URL}/rest/v1/profiles?${filter}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ etsy_plan, etsy_expires_at }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
}
