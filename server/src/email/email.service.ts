import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  transporter: Transporter;

  constructor() {
    this.transporter = createTransport({
      host: 'smtp-mail.outlook.com',
      port: '587',
      secure: false,
      auth: {
        user: 'xxx',
        pass: 'xxx',
      },
    });
  }

  async sendMail({ to, subject, html }) {
    await this.transporter.sendMail({
      from: {
        name: '会议室预定系统',
        address: 'xxx',
      },
      to,
      subject,
      html,
    });
  }
}
