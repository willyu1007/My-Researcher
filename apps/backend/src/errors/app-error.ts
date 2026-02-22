import type { ErrorCode } from '@paper-engineering-assistant/shared';

export type AppErrorCode = ErrorCode | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: AppErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
