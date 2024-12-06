import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export class AlertManager {
  private static transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
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

    console.log("Sending error text to:", recipients);

    const sendPromises = recipients.map(async (recipient) => {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: `${recipient}@${this.carriers[RECIPIENT_CARRIER]}`,
        subject: "Everwood Backend Server " + type,
        text: message,
      };

      try {
        await this.transporter.sendMail(mailOptions);
        console.log(`Text message sent to ${recipient}: ${message}`);
      } catch (error) {
        console.error(`Failed to send text to ${recipient}: ${error.message}`);
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
