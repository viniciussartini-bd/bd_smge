export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, true);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized access') {
        super(message, 401, true);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Access forbidden') {
        super(message, 403, true);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

export class ValidationError extends AppError {
    public readonly errors?: any[];

    constructor(message: string = 'Validation failed', errors?: any[]) {
        super(message, 400, true);
        this.errors = errors;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, 409, true);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error', isOperational: boolean = false) {
        super(message, 500, isOperational);
        Object.setPrototypeOf(this, InternalServerError.prototype);
    }
}