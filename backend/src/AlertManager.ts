import { SendMailClient } from "zeptomail";
import dotenv from "dotenv";

dotenv.config();

type AlertGroup = "Ben" | "Ben & Akiva" | "Ben & Akiva & Alex" | "Everyone";

export class AlertsNotConfiguredError extends Error {
  constructor() {
    super("Text alerts are not configured.");
    this.name = "AlertsNotConfiguredError";
  }
}

// Provider errors can echo addresses or message text; log only their kind.
function describeError(error: unknown): string {
  if (!error || typeof error !== "object") return "Unknown error";
  const details = error as { name?: unknown; code?: unknown; error?: { code?: unknown } };
  const code = details.code ?? details.error?.code;
  const name = typeof details.name === "string" ? details.name : "Error";
  return code === undefined ? name : `${name} (code ${String(code)})`;
}

export class AlertManager {
  private static client = new SendMailClient({
    url: "api.zeptomail.com/",
    token: process.env.ZEPTO_TOKEN || "",
  });

  private static carriers = {
    verizon: "vtext.com",
    att: "txt.att.net",
    tmobile: "tmomail.net",
    sprint: "messaging.sprintpcs.com",
  };

  static async sendText(
    to: AlertGroup,
    type: "New Message" | "Error",
    message: string
  ): Promise<void> {
    if (!process.env.ZEPTO_TOKEN) {
      console.error("Text alerts are disabled: ZEPTO_TOKEN is not set.");
      throw new AlertsNotConfiguredError();
    }
    const recipients = this.getRecipients(to);
    const RECIPIENT_CARRIER = "tmobile";

    const results = await Promise.allSettled(recipients.map((recipient) =>
      this.client.sendMail({
        from: {
          address: process.env.EMAIL_USER || "",
          name: "Everwood Alert",
        },
        to: [
          {
            email_address: {
              address: `${recipient}@${this.carriers[RECIPIENT_CARRIER]}`,
              name: recipient,
            },
          },
        ],
        subject: "⠀",
        textbody: message,
      })
    ));

    // One failed recipient must not stop the others; report counts, never numbers.
    const failures = results.flatMap((result) => result.status === "rejected" ? [describeError(result.reason)] : []);
    if (failures.length) {
      console.error(`Text alert failed for ${failures.length} of ${recipients.length} recipients: ${failures.join(", ")}`);
    }
    if (failures.length === recipients.length) throw new Error("Text alert could not be delivered.");
    console.log(`${type} text alert sent to ${recipients.length - failures.length} of ${recipients.length} recipients.`);
  }

  private static getRecipients(to: AlertGroup): string[] {
    const recipientMap = {
      Ben: ["9172005099"],
      "Ben & Akiva": ["9172005099", "9293277420"],
      "Ben & Akiva & Alex": ["9172005099", "9293277420", "7755137691"],
      Everyone: ["9172005099", "9293277420", "7755137691", "7023244384"],
    };

    return recipientMap[to] || [];
  }
}
