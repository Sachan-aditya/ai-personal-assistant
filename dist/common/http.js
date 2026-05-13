"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.asyncHandler = asyncHandler;
exports.notFound = notFound;
exports.errorHandler = errorHandler;
class HttpError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.HttpError = HttpError;
function asyncHandler(handler) {
    return (req, res, next) => {
        handler(req, res, next).catch(next);
    };
}
function notFound(_req, _res, next) {
    next(new HttpError(404, "Route not found"));
}
function errorHandler(error, _req, res, _next) {
    const statusCode = error.statusCode ?? 500;
    res.status(statusCode).json({
        error: {
            message: error.message ?? "Internal server error",
            statusCode,
        },
    });
}
