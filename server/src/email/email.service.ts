import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  // @Inject(ConfigService)
  // private configService: ConfigService;

  transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = createTransport({
      host: this.configService.get<string>('nodemailer_host'),
      port: this.configService.get<number>('nodemailer_port'),
      secure: false,
      auth: {
        user: this.configService.get<string>('nodemailer_auth_user'),
        pass: this.configService.get<string>('nodemailer_auth_pass'),
      },
    });
  }

  async sendMail({ to, subject, html }) {
    await this.transporter.sendMail({
      from: {
        name: '会议室预定系统',
        address: this.configService.get<string>('nodemailer_auth_user'),
      },
      to,
      subject,
      html,
    });
  }
}
