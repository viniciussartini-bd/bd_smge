import { plantRepository } from './plant.repository.js';
import { CreatePlantInput, UpdatePlantInput } from './plant.validators.js';
import { PlantResponse, PlantWithRelations } from './plant.types.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-errors.js';

export class PlantService {
    async create(data: CreatePlantInput, createdById: string): Promise<PlantResponse> {
        const existingPlant = await plantRepository.findByCNPJ(data.cnpj);

        if (existingPlant) {
            throw new ConflictError('A plant with this CNPJ already exists');
        }

        return plantRepository.create(data, createdById);
    }

    async findById(id: string, includeRelations: boolean = false): Promise<PlantResponse | PlantWithRelations> {
        const plant = includeRelations
            ? await plantRepository.findByIdWithRelations(id)
            : await plantRepository.findById(id);

        if (!plant) {
            throw new NotFoundError('Plant not found');
        }

        return plant;
    }

    async findAll(page: number = 1, limit: number = 10, includeRelations: boolean = false): Promise<{
        plants: PlantResponse[] | PlantWithRelations[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const [plants, total] = await Promise.all([
            includeRelations
                ? plantRepository.findAllWithRelations(skip, limit)
                : plantRepository.findAll(skip, limit),
            plantRepository.count(),
        ]);

        return {
            plants,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async update(id: string, data: UpdatePlantInput): Promise<PlantResponse> {
        const plant = await plantRepository.findById(id);

        if (!plant) {
            throw new NotFoundError('Plant not found');
        }

        return plantRepository.update(id, data);
    }

    async delete(id: string): Promise<void> {
        const plant = await plantRepository.findById(id);
        
        if (!plant) {
            throw new NotFoundError('Plant not found');
        }

        if (plant.registeredAreasCount > 0) {
            throw new ConflictError('Cannot delete plant with registered areas. Please delete all areas first.');
        }

        await plantRepository.delete(id);
    }
}

export const plantService = new PlantService();