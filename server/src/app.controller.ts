import { Controller, Get, SetMetadata } from '@nestjs/common';
import { AppService } from './app.service';
import { UserInfo } from './decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('aaa')
  @SetMetadata('required-login', true)
  @SetMetadata('required-permission', ['ddd'])
  aaaa(@UserInfo('username') username: string, @UserInfo() userInfo) {
    console.log(username, userInfo);
    return 'aaa';
  }

  @Get('bbb')
  bbb() {
    return 'bbb';
  }
}
