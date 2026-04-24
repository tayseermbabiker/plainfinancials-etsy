// Lemon Squeezy webhook handler
//
// Phase 1 (now): stub — responds 200, logs payload. Lets LS register the endpoint
// and deliver events without errors while we build signature verification.
//
// Phase 2 (next): verify HMAC signature with LEMONSQUEEZY_WEBHOOK_SECRET,
// then update Supabase profiles.etsy_plan based on subscription_created /
// subscription_updated / subscription_cancelled events.

const crypto = require("crypto");

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const rawBody = event.body || "";
  const signature = event.headers["x-signature"] || event.headers["X-Signature"];

  // Phase 2 hook: verify signature when secret is configured
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (secret && signature) {
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const valid = crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expected, "utf8")
    );
    if (!valid) {
      console.warn("[lemon-webhook] invalid signature");
      return { statusCode: 401, body: "Invalid signature" };
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.warn("[lemon-webhook] invalid JSON:", e.message);
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const eventName = payload?.meta?.event_name || "unknown";
  const customData = payload?.meta?.custom_data || {};
  const attrs = payload?.data?.attributes || {};

  console.log(`[lemon-webhook] ${eventName}`, {
    email: attrs.user_email,
    status: attrs.status,
    variant: attrs.variant_name,
    userId: customData.user_id,
  });

  // Phase 2: update Supabase profiles.etsy_plan based on eventName
  // subscription_created / subscription_updated / subscription_resumed → 'pro'
  // subscription_cancelled / subscription_expired → 'free'

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ received: true, event: eventName }),
  };
};
