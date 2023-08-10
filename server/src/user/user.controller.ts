import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  Query,
  UnauthorizedException,
  DefaultValuePipe,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RequiredLogin, UserInfo } from 'src/decorator';
import { UserDetailVo } from './vo/user-detail.vo';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailService } from 'src/email/email.service';
import { RedisService } from 'src/redis/redis.service';
import { generateParseIntPipe } from 'src/utils';
import {
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LoginUserVo } from './vo/login-user.vo';
import { RefreshTokenVo } from './vo/refresh-token.vo';
import { UserListVo } from './vo/user-list.vo';

@ApiTags('User Module')
@Controller('user')
export class UserController {
  @Inject(JwtService)
  private jwtService: JwtService;

  @Inject(ConfigService)
  private configService: ConfigService;

  @Inject(RedisService)
  private redisService: RedisService;

  @Inject(EmailService)
  private emailService: EmailService;

  constructor(private readonly userService: UserService) {}

  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Verify code invalid/incorrect or user exists',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Register successfully or failure',
  })
  @Post('register')
  async register(@Body() registerUser: RegisterUserDto) {
    return await this.userService.register(registerUser);
  }

  @ApiQuery({
    name: 'address',
    type: String,
    description: 'email address',
    required: true,
    example: 'xxx@xx.com',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'send successfully',
    type: String,
  })
  @Get('register-captcha')
  async captcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);
    await this.redisService.set(`captcha_${address}`, code, 5 * 60);
    await this.emailService.sendMail({
      to: address,
      subject: 'Register Code',
      html: '<p>Your Register Code is %{}</p>',
    });
    return 'Send Successfully';
  }

  @ApiBody({
    type: LoginUserDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User doesnt exist or wrong password',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User info with token',
    type: LoginUserVo,
  })
  @Post('login')
  async userLogin(@Body() loginUser: LoginUserDto) {
    const vo = await this.userService.login(loginUser, false);
    const { access_token, refresh_token } =
      this.userService.getAccessAndRefresh(vo.userInfo);
    return {
      ...vo,
      access_token,
      refresh_token,
    };
  }

  @ApiBody({
    type: LoginUserDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User doesnt exist or wrong password',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User info with token',
    type: LoginUserVo,
  })
  @Post('admin/login')
  async adminLogin(@Body() loginUser: LoginUserDto) {
    const vo = await this.userService.login(loginUser, true);
    const { access_token, refresh_token } =
      this.userService.getAccessAndRefresh(vo.userInfo);
    return {
      ...vo,
      access_token,
      refresh_token,
    };
  }

  @ApiQuery({
    name: 'refreshToken',
    type: String,
    description: 'Refresh token',
    required: true,
    example: 'dfsweregfgfdgdgdf',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token is invalid, login instead',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refresh successfully',
    type: RefreshTokenVo,
  })
  @Get('refresh')
  async refresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);
      const user = await this.userService.findUserById(data.userId, false);
      return this.userService.getAccessAndRefresh(user);
    } catch (e) {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }

  @ApiQuery({
    name: 'refreshToken',
    type: String,
    description: 'Refresh token',
    required: true,
    example: 'dfsweregfgfdgdgdf',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token is invalid, login instead',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refresh token',
    type: RefreshTokenVo,
  })
  @Get('admin/refresh')
  async adminRefresh(@Query('refreshToken') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);
      const user = await this.userService.findUserById(data.userId, true);
      return this.userService.getAccessAndRefresh(user);
    } catch (e) {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }

  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'success',
    type: UserDetailVo,
  })
  @Get('info')
  @RequiredLogin()
  async info(@UserInfo('userId') userId: number) {
    const user = await this.userService.findUserDetailsById(userId);
    const vo = new UserDetailVo();
    Object.assign(vo, user);
    return vo;
  }

  @ApiBearerAuth()
  @ApiBody({
    type: UpdateUserPasswordDto,
  })
  @ApiResponse({
    type: String,
    description: 'Verify code invalid/incorrect',
  })
  @Post(['update_password', 'admin/update_password'])
  @RequiredLogin()
  async udpatePassword(
    @UserInfo('userId') userId: number,
    @Body() passwordDto: UpdateUserPasswordDto,
  ) {
    return await this.userService.updatePassword(userId, passwordDto);
  }

  @ApiBearerAuth()
  @ApiQuery({
    name: 'address',
    description: 'Email address',
    type: String,
  })
  @ApiResponse({
    type: String,
    description: 'Send successfully',
  })
  @Get('update_password/captcha')
  @RequiredLogin()
  async updatePasswordCaptcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);

    await this.redisService.set(
      `update_password_captcha_${address}`,
      code,
      10 * 60,
    );

    await this.emailService.sendMail({
      to: address,
      subject: '更改密码验证码',
      html: `<p>你的更改密码验证码是 ${code}</p>`,
    });
    return '发送成功';
  }

  @ApiBearerAuth()
  @ApiBody({
    type: UpdateUserDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Verify code invalid/incorrect',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Update successfully',
    type: String,
  })
  @Post(['update', 'admin/update'])
  @RequiredLogin()
  async update(
    @UserInfo('userId') userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.userService.update(userId, updateUserDto);
  }

  @ApiBearerAuth()
  @ApiQuery({
    name: 'address',
    description: 'Email address',
    type: String,
  })
  @ApiResponse({
    type: String,
    description: 'Send successfully',
  })
  @RequiredLogin()
  @Get('update/captcha')
  async updateCaptcha(@Query('address') address: string) {
    const code = Math.random().toString().slice(2, 8);
    await this.redisService.set(
      `update_user_captcha_${address}`,
      code,
      10 * 60,
    );
    await this.emailService.sendMail({
      to: address,
      subject: '更改用户信息验证码',
      html: `<p>你的验证码是 ${code}</p>`,
    });
    return '发送成功';
  }

  @ApiBearerAuth()
  @ApiQuery({
    name: 'id',
    description: 'userId',
    type: Number,
  })
  @ApiResponse({
    type: String,
    description: 'success',
  })
  @Get('freeze')
  async freeze(@Query('id') userId: number) {
    await this.userService.freezeUserById(userId);
    return 'success';
  }

  @ApiBearerAuth()
  @ApiQuery({
    name: 'pageNo',
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    type: Number,
  })
  @ApiQuery({
    name: 'username',
    type: Number,
  })
  @ApiQuery({
    name: 'nickname',
    type: Number,
  })
  @ApiQuery({
    name: 'email',
    type: Number,
  })
  @ApiResponse({
    type: UserListVo,
    description: '用户列表',
  })
  @Get('list')
  async list(
    @Query('pageNo', new DefaultValuePipe(1), generateParseIntPipe('pageNo'))
    pageNo: number,
    @Query(
      'pageSize',
      new DefaultValuePipe(3),
      generateParseIntPipe('pageSize'),
    )
    pageSize: number,
    @Query('username') username: string,
    @Query('nickName') nickname: string,
    @Query('email') email: string,
  ) {
    return await this.userService.findUsersByPage(
      username,
      nickname,
      email,
      pageNo,
      pageSize,
    );
  }

  @Get('init-data')
  async initData() {
    await this.userService.initData();
    return 'done';
  }
}
