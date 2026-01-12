import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.config.js';
import { generateToken } from '../shared/utils/jwt.utils.js';

export interface TestUser {
    id: string;
    email: string;
    password: string;
    name: string;
    role: string;
}

export async function createTestUser(data: Partial<TestUser> = {}): Promise<TestUser> {
    const defaultData = {
        email: `test-${Date.now()}@example.com`,
        password: 'Test@123456',
        name: 'Test User',
        role: 'USER',
    };

    const userData = { ...defaultData, ...data };
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await prisma.user.create({
        data: {
            email: userData.email,
            password: hashedPassword,
            name: userData.name,
            role: userData.role as any,
        },
    });

    return {
        id: user.id,
        email: user.email,
        password: userData.password,
        name: user.name,
        role: user.role,
    };
}

export async function createTestAdmin(data: Partial<TestUser> = {}): Promise<TestUser> {
    return createTestUser({
        ...data,
        role: 'ADMIN',
        email: data.email || `admin-${Date.now()}@example.com`,
        name: data.name || 'Test Admin',
    });
}

export function generateTestToken(user: TestUser, isMobile: boolean = false): string {
    return generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        isMobile,
    });
}

export function createAuthHeader(token: string): string {
    return `Bearer ${token}`;
}