declare module "zeptomail" {
  export interface EmailAddress {
    address: string;
    name?: string;
  }

  export interface Recipient {
    email_address: EmailAddress;
  }

  export interface MailOptions {
    from: EmailAddress;
    to: Recipient[];
    subject: string;
    textbody?: string;
    htmlbody?: string;
  }

  export interface ClientConfig {
    url: string;
    token: string;
  }

  export class SendMailClient {
    constructor(config: ClientConfig);
    sendMail(options: MailOptions): Promise<any>;
  }
}
