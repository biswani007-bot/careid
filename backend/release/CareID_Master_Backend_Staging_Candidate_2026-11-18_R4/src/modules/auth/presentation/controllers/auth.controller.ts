import { Controller, Post, Get, Put, Patch, Delete, Body, Param, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../../application/use-cases/auth.service';
import { RequestOtpDto, RequestOtpResponseDto } from '../dto/request-otp.dto';
import { VerifyOtpDto, VerifyOtpResponseDto } from '../dto/verify-otp.dto';
import { ResendOtpDto, ResendOtpResponseDto } from '../dto/resend-otp.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from '../dto/refresh-token.dto';
import { LogoutDto, LogoutResponseDto } from '../dto/logout.dto';
import { LogoutAllDto, LogoutAllResponseDto } from '../dto/logout-all.dto';
import { SessionResponseDto } from '../dto/session-response.dto';
import { UserMeResponseDto } from '../dto/user-me-response.dto';
import { AdminLoginDto, AdminLoginResponseDto } from '../dto/admin-login.dto';
import { PasswordLoginDto, PasswordLoginResponseEnvelopeDto } from '../dto/password-login.dto';
import { UpdateMeDto } from '../dto/update-me.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

@ApiTags('Authentication & Identity')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('password/login')
  @ApiOperation({ summary: 'CareID Admin/Super Admin Password Login' })
  @SwaggerResponse({ status: 200, description: 'Admin authenticated successfully, genuine tokens returned', type: PasswordLoginResponseEnvelopeDto })
  @SwaggerResponse({ status: 400, description: 'Validation error: Identifier and password required' })
  @SwaggerResponse({ status: 401, description: 'Authentication failed: Invalid credentials or inactive account' })
  @SwaggerResponse({ status: 403, description: 'Authorization failed: Insufficient administrator privileges' })
  async passwordLogin(@Req() req: any, @Body() dto: PasswordLoginDto): Promise<PasswordLoginResponseEnvelopeDto> {
    const ipAddress = req.ip || '';
    const userAgent = req.headers ? req.headers['user-agent'] || '' : '';
    return this.authService.passwordLogin(dto, String(ipAddress), String(userAgent));
  }

  @HttpCode(HttpStatus.OK)
  @Post('admin/login')
  @ApiOperation({ summary: 'Admin Email/Password Login (Legacy Alias)' })
  @SwaggerResponse({ status: 200, description: 'Admin authenticated successfully, JWT pair issued', type: PasswordLoginResponseEnvelopeDto })
  @SwaggerResponse({ status: 400, description: 'Validation failed for identifier or password' })
  @SwaggerResponse({ status: 401, description: 'Invalid credentials or inactive account' })
  @SwaggerResponse({ status: 403, description: 'Access denied - Administrator privileges required' })
  async adminLogin(@Req() req: any, @Body() dto: PasswordLoginDto): Promise<PasswordLoginResponseEnvelopeDto> {
    const ipAddress = req.ip || '';
    const userAgent = req.headers ? req.headers['user-agent'] || '' : '';
    return this.authService.passwordLogin(dto, String(ipAddress), String(userAgent));
  }

  @HttpCode(HttpStatus.OK)
  @Post('otp/request')
  @ApiOperation({ summary: 'Request Phone OTP' })
  @SwaggerResponse({ status: 200, description: 'OTP challenge generated', type: RequestOtpResponseDto })
  async requestOtp(@Req() req: any, @Body() dto: RequestOtpDto): Promise<RequestOtpResponseDto> {
    const ipAddress = req.ip || '';
    return this.authService.requestOtp(dto, String(ipAddress));
  }

  @HttpCode(HttpStatus.OK)
  @Post('otp/verify')
  @ApiOperation({ summary: 'Verify Phone OTP & Login' })
  @SwaggerResponse({ status: 200, description: 'OTP verified, JWT pair issued', type: VerifyOtpResponseDto })
  async verifyOtp(@Req() req: any, @Body() dto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    const ipAddress = req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.verifyOtp(dto, String(ipAddress), String(userAgent));
  }

  @HttpCode(HttpStatus.OK)
  @Post('otp/resend')
  @ApiOperation({ summary: 'Resend OTP to registered phone number' })
  @SwaggerResponse({ status: 200, description: 'OTP challenge updated and resent', type: ResendOtpResponseDto })
  async resendOtp(@Req() req: any, @Body() dto: ResendOtpDto): Promise<ResendOtpResponseDto> {
    const ipAddress = req.ip || '';
    return this.authService.resendOtp(dto, String(ipAddress));
  }

  @HttpCode(HttpStatus.OK)
  @Post(['token/refresh', 'refresh'])
  @ApiOperation({ summary: 'Refresh JWT Access Token' })
  @SwaggerResponse({ status: 200, description: 'Token rotated successfully', type: RefreshTokenResponseDto })
  async refreshToken(@Req() req: any, @Body() dto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    const ipAddress = req.ip || '';
    return this.authService.refreshToken(dto, String(ipAddress));
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'User Session Logout' })
  @SwaggerResponse({ status: 200, description: 'Session terminated', type: LogoutResponseDto })
  async logout(@Req() req: any, @Body() dto: LogoutDto): Promise<LogoutResponseDto> {
    const ipAddress = req.ip || '';
    return this.authService.logout(dto, String(ipAddress));
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  @ApiOperation({ summary: 'Logout all devices and revoke all tokens' })
  @SwaggerResponse({ status: 200, description: 'All active sessions and tokens terminated', type: LogoutAllResponseDto })
  async logoutAll(@Req() req: any, @Body() dto: LogoutAllDto): Promise<LogoutAllResponseDto> {
    const ipAddress = req.ip || '';
    return this.authService.logoutAll(dto, String(ipAddress));
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-Auth')
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and claims' })
  @SwaggerResponse({ status: 200, description: 'Active profile details returned', type: UserMeResponseDto })
  async getMe(@Req() req: any): Promise<UserMeResponseDto> {
    const ipAddress = req.ip || '';
    return this.authService.getMe(req.user.userId, String(ipAddress));
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-Auth')
  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @SwaggerResponse({ status: 200, description: 'Updated profile returned', type: UserMeResponseDto })
  async updateMePut(@Req() req: any, @Body() dto: UpdateMeDto): Promise<UserMeResponseDto> {
    const ipAddress = req.ip || '';
    return this.authService.updateMe(req.user.userId, dto, String(ipAddress));
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-Auth')
  @Patch('me')
  @ApiOperation({ summary: 'Partially update current user profile' })
  @SwaggerResponse({ status: 200, description: 'Updated profile returned', type: UserMeResponseDto })
  async updateMePatch(@Req() req: any, @Body() dto: UpdateMeDto): Promise<UserMeResponseDto> {
    const ipAddress = req.ip || '';
    return this.authService.updateMe(req.user.userId, dto, String(ipAddress));
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-Auth')
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change authenticated user password' })
  @SwaggerResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto): Promise<{ message: string }> {
    const ipAddress = req.ip || '';
    const currentSessionId = req.user?.sessionId;
    return this.authService.changePassword(req.user.userId, dto, currentSessionId, String(ipAddress));
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-Auth')
  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions for authenticated user' })
  @SwaggerResponse({ status: 200, description: 'List of active sessions', type: [SessionResponseDto] })
  async getSessions(@Req() req: any): Promise<SessionResponseDto[]> {
    const ipAddress = req.ip || '';
    return this.authService.getActiveSessions(req.user.userId, String(ipAddress));
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Terminate a specific active session' })
  @SwaggerResponse({ status: 204, description: 'Session terminated' })
  async revokeSession(@Req() req: any, @Param('sessionId') sessionId: string): Promise<void> {
    const ipAddress = req.ip || '';
    const userId = req.user?.id || req.user?.userId;
    await this.authService.revokeSession(sessionId, userId, String(ipAddress));
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('sessions')
  @ApiOperation({ summary: 'Terminate all other active sessions' })
  @SwaggerResponse({ status: 204, description: 'Other sessions terminated' })
  async revokeOtherSessions(@Req() req: any): Promise<void> {
    const ipAddress = req.ip || '';
    await this.authService.revokeOtherSessions(req.user.userId, req.user.sessionId, String(ipAddress));
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-Auth')
  @Get('roles')
  @ApiOperation({ summary: 'Get current user assigned roles' })
  @SwaggerResponse({ status: 200, description: 'User roles list' })
  async getRoles(@Req() req: any): Promise<{ roles: string[] }> {
    return { roles: req.user.roles || [] };
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-Auth')
  @Get('permissions')
  @ApiOperation({ summary: 'Get current user assigned permissions' })
  @SwaggerResponse({ status: 200, description: 'User permissions list' })
  async getPermissions(@Req() req: any): Promise<{ permissions: string[] }> {
    return { permissions: req.user.permissions || [] };
  }
}
