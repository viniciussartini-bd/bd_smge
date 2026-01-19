import { profileRepository } from './profile.repository.js';
import { CreateProfileInput, UpdateProfileInput } from './profile.validators.js';
import { ProfileResponse, ProfileWithUser } from './profile.types.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../shared/errors/app-errors.js';

/**
 * Service responsável pela lógica de negócio de perfis de usuário.
 * 
 * Este service coordena operações complexas de gerenciamento de perfis,
 * incluindo validações de unicidade de CNPJ, permissões de acesso e
 * regras de negócio específicas do domínio.
 */
export class ProfileService {
    /**
     * Cria um novo perfil para um usuário.
     * 
     * Validações:
     * - O usuário ainda não deve ter um perfil (1:1 relationship)
     * - O CNPJ deve ser único no sistema
     */
    async create(data: CreateProfileInput, userId: string): Promise<ProfileResponse> {
        // Verificar se o usuário já possui perfil
        const hasProfile = await profileRepository.userHasProfile(userId);
        if (hasProfile) {
            throw new ConflictError('User already has a profile');
        }

        // Verificar se o CNPJ já está em uso
        const existingProfile = await profileRepository.findByCNPJ(data.cnpj);
        if (existingProfile) {
            throw new ConflictError('A profile with this CNPJ already exists');
        }

        return profileRepository.create(data, userId);
    }

    /**
     * Busca um perfil por ID.
     * 
     * Validação de permissão: apenas o dono do perfil ou admin pode visualizar.
     */
    async findById(
        id: string,
        userId: string,
        userRole: string,
        includeUser: boolean = false
    ): Promise<ProfileResponse | ProfileWithUser> {
        const profile = includeUser
            ? await profileRepository.findByIdWithUser(id)
            : await profileRepository.findById(id);

        if (!profile) {
            throw new NotFoundError('Profile not found');
        }

        // Verificar permissão: apenas o dono do perfil ou admin pode visualizar
        if (profile.userId !== userId && userRole !== 'ADMIN') {
            throw new ForbiddenError('You do not have permission to view this profile');
        }

        return profile;
    }

    /**
     * Busca o perfil do usuário autenticado.
     */
    async getMyProfile(
        userId: string,
        includeUser: boolean = false
    ): Promise<ProfileResponse | ProfileWithUser> {
        const profile = includeUser
            ? await profileRepository.findByUserIdWithUser(userId)
            : await profileRepository.findByUserId(userId);

        if (!profile) {
            throw new NotFoundError('Profile not found');
        }

        return profile;
    }

    /**
     * Atualiza um perfil existente.
     * 
     * Validação de permissão: apenas o dono do perfil ou admin pode atualizar.
     */
    async update(
        id: string,
        data: UpdateProfileInput,
        userId: string,
        userRole: string
    ): Promise<ProfileResponse> {
        const profile = await profileRepository.findById(id);

        if (!profile) {
            throw new NotFoundError('Profile not found');
        }

        // Verificar permissão
        if (profile.userId !== userId && userRole !== 'ADMIN') {
            throw new ForbiddenError('You do not have permission to update this profile');
        }

        return profileRepository.update(id, data);
    }

    /**
     * Atualiza o perfil do usuário autenticado.
     */
    async updateMyProfile(
        userId: string,
        data: UpdateProfileInput
    ): Promise<ProfileResponse> {
        const profile = await profileRepository.findByUserId(userId);

        if (!profile) {
            throw new NotFoundError('Profile not found');
        }

        return profileRepository.update(profile.id, data);
    }

    /**
     * Deleta um perfil.
     * 
     * Validação de permissão: apenas o dono do perfil ou admin pode deletar.
     */
    async delete(id: string, userId: string, userRole: string): Promise<void> {
        const profile = await profileRepository.findById(id);

        if (!profile) {
            throw new NotFoundError('Profile not found');
        }

        // Verificar permissão
        if (profile.userId !== userId && userRole !== 'ADMIN') {
            throw new ForbiddenError('You do not have permission to delete this profile');
        }

        await profileRepository.delete(id);
    }

    /**
     * Deleta o perfil do usuário autenticado.
     */
    async deleteMyProfile(userId: string): Promise<void> {
        const profile = await profileRepository.findByUserId(userId);

        if (!profile) {
            throw new NotFoundError('Profile not found');
        }

        await profileRepository.delete(profile.id);
    }
}

export const profileService = new ProfileService();