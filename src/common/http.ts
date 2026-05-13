import { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, "Route not found"));
}

export function errorHandler(
  error: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode = error.statusCode ?? 500;
  res.status(statusCode).json({
    error: {
      message: error.message ?? "Internal server error",
      statusCode,
    },
  });
}
