import { prisma } from '../../config/database.config.js';
import { Profile } from '@prisma/client';
import { CreateProfileInput, UpdateProfileInput } from './profile.validators.js';
import { ProfileResponse, ProfileWithUser } from './profile.types.js';

/**
 * Repository responsável por todas as operações de banco de dados relacionadas a perfis.
 * 
 * Este repository encapsula toda a lógica de acesso a dados de perfis de usuário,
 * permitindo que o service trabalhe com objetos de domínio sem se preocupar com
 * detalhes de persistência.
 */
export class ProfileRepository {
    /**
     * Cria um novo perfil no banco de dados.
     */
    async create(data: CreateProfileInput, userId: string): Promise<ProfileResponse> {
        return prisma.profile.create({
            data: {
                fantasyName: data.fantasyName,
                cnpj: data.cnpj,
                zipCode: data.zipCode,
                address: data.address,
                city: data.city,
                state: data.state,
                phone: data.phone || null,
                userId,
            },
        });
    }

    /**
     * Busca um perfil por ID.
     */
    async findById(id: string): Promise<ProfileResponse | null> {
        return prisma.profile.findUnique({
            where: { id },
        });
    }

    /**
     * Busca um perfil por ID incluindo dados do usuário.
     */
    async findByIdWithUser(id: string): Promise<ProfileWithUser | null> {
        return prisma.profile.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                    },
                },
            },
        }) as Promise<ProfileWithUser | null>;
    }

    /**
     * Busca um perfil por userId.
     */
    async findByUserId(userId: string): Promise<ProfileResponse | null> {
        return prisma.profile.findUnique({
            where: { userId },
        });
    }

    /**
     * Busca um perfil por userId incluindo dados do usuário.
     */
    async findByUserIdWithUser(userId: string): Promise<ProfileWithUser | null> {
        return prisma.profile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                    },
                },
            },
        }) as Promise<ProfileWithUser | null>;
    }

    /**
     * Busca um perfil por CNPJ.
     */
    async findByCNPJ(cnpj: string): Promise<Profile | null> {
        return prisma.profile.findUnique({
            where: { cnpj },
        });
    }

    /**
     * Atualiza um perfil existente.
     */
    async update(id: string, data: UpdateProfileInput): Promise<ProfileResponse> {
        return prisma.profile.update({
            where: { id },
            data,
        });
    }

    /**
     * Deleta um perfil.
     */
    async delete(id: string): Promise<ProfileResponse> {
        return prisma.profile.delete({
            where: { id },
        });
    }

    /**
     * Verifica se um usuário já possui perfil.
     */
    async userHasProfile(userId: string): Promise<boolean> {
        const profile = await prisma.profile.findUnique({
            where: { userId },
        });
        return profile !== null;
    }
}

export const profileRepository = new ProfileRepository();