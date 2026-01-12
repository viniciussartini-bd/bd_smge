import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../errors/app-errors.js';
import { env } from '../../config/env.config.js';

interface ErrorResponse {
    success: false;
    message: string;
    statusCode: number;
    errors?: any[];
    stack?: string;
    type?: string;
}

export function errorHandler(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (res.headersSent) {
        return next(error);
    }

    console.error('Error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
    });

    if (error instanceof AppError) {
        const errorResponse: ErrorResponse = {
            success: false,
            message: error.message,
            statusCode: error.statusCode,
            type: error.constructor.name,
        };

        if (error instanceof ValidationError && error.errors) {
            errorResponse.errors = error.errors;
        }

        if (env.NODE_ENV === 'development') {
            errorResponse.stack = error.stack;
        }

        res.status(error.statusCode).json(errorResponse);
        return;
    }

    if (error instanceof ZodError) {
        const validationErrors = error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
        }));

        const errorResponse: ErrorResponse = {
            success: false,
            message: 'Validation failed',
            statusCode: 400,
            type: 'ValidationError',
            errors: validationErrors,
        };

        if (env.NODE_ENV === 'development') {
            errorResponse.stack = error.stack;
        }

        res.status(400).json(errorResponse);
        return;
    }

    const errorResponse: ErrorResponse = {
        success: false,
        message: env.NODE_ENV === 'development' 
            ? error.message 
            : 'An unexpected error occurred',
        statusCode: 500,
        type: 'InternalServerError',
    };

    if (env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
    }

    res.status(500).json(errorResponse);
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
    const error = new AppError(
        `Route ${req.method} ${req.path} not found`,
        404,
        true
    );
    next(error);
}