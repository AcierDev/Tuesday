require("dotenv").config();
const EasyPost = require("@easypost/api");

const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY;
if (!EASYPOST_API_KEY) {
  console.log(EASYPOST_API_KEY);
  throw new Error("EASYPOST_API_KEY environment variable is not set");
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error("NEXT_PUBLIC_APP_URL environment variable is not set");
}

if (!process.env.EASYPOST_WEBHOOK_SECRET) {
  throw new Error("EASYPOST_WEBHOOK_SECRET environment variable is not set");
}

const client = new EasyPost(EASYPOST_API_KEY);

async function registerWebhook() {
  try {
    const webhook = await client.Webhook.create({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/easypost`,
      webhook_secret: process.env.EASYPOST_WEBHOOK_SECRET,
    });

    console.log("Webhook registered successfully:", {
      id: webhook.id,
      url: webhook.url,
      mode: webhook.mode,
      disabled: webhook.disabled_at ? true : false,
    });
  } catch (error) {
    console.error("Failed to register webhook:", error);
    process.exit(1);
  }
}

registerWebhook().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
