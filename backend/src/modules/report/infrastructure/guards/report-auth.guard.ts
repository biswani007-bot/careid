import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * ReportAuthGuard:
 * Allows standard JWT Bearer authentication across all report endpoints.
 * Additionally, permits verified token requests on dedicated download endpoints
 * (/reports/download/:id/file or /reports/:id/file with ?token=...) to reach the
 * controller's cryptographic verification pipeline even when called from external
 * browsers or webviews without standard Authorization headers.
 */
@Injectable()
export class ReportAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const path = req.path || req.url || '';
    const isDownloadPath = path.includes('/download/') || path.includes('/file');

    // If Bearer token is provided in headers, let Passport validate it and populate req.user
    if (req.headers?.authorization) {
      try {
        const canPass = await (super.canActivate(context) as Promise<boolean>);
        if (canPass) return true;
      } catch {
        // If Bearer token is invalid but a download token is provided on a download path, allow token validation
        if (isDownloadPath && req.query?.token) {
          return true;
        }
        throw new UnauthorizedException();
      }
    }

    // If no Bearer token but on a download path with a download token query parameter
    if (isDownloadPath && req.query?.token) {
      return true;
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
