import { SendMailClient } from "zeptomail";
import dotenv from "dotenv";

dotenv.config();

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
    to: "Ben" | "Ben & Akiva" | "Ben & Akiva & Alex" | "Everyone",
    type: "New Message" | "Error",
    message: string
  ): Promise<void> {
    const recipients = this.getRecipients(to);
    const RECIPIENT_CARRIER = "tmobile";

    console.log("Sending text to:", recipients);

    const sendPromises = recipients.map(async (recipient) => {
      const mailOptions = {
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
      };

      try {
        await this.client.sendMail(mailOptions);
        console.log(`Text message sent to ${recipient}: ${message}`);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(
            `Failed to send text to ${recipient}: ${error.message}`
          );
        } else {
          console.error(`Failed to send text to ${recipient}: Unknown error`);
        }
        throw error;
      }
    });

    await Promise.all(sendPromises);
  }

  private static getRecipients(
    to: "Ben" | "Ben & Akiva" | "Ben & Akiva & Alex" | "Everyone"
  ): string[] {
    const recipientMap = {
      Ben: ["9172005099"],
      "Ben & Akiva": ["9172005099", "9293277420"],
      "Ben & Akiva & Alex": ["9172005099", "9293277420", "7755137691"],
      Everyone: ["9172005099", "9293277420", "7755137691", "7023244384"],
    };

    return recipientMap[to] || [];
  }
}
