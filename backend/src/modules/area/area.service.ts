import { areaRepository } from './area.repository.js';
import { plantRepository } from '../plant/plant.repository.js';
import type { CreateAreaInput, UpdateAreaInput } from './area.validators.js';
import type { AreaResponse, ListAreasResponse } from './area.types.js';
import { NotFoundError, ConflictError } from '../../shared/errors/app-errors.js';

export class AreaService {
    async create(data: CreateAreaInput): Promise<AreaResponse> {
        const plant = await plantRepository.findById(data.plantId);

        if (!plant) {
            throw new NotFoundError('Plant not found');
        }

        const area = await areaRepository.create(data);
        await plantRepository.incrementAreasCount(data.plantId);

        return area;
    }

    async findById(id: string): Promise<AreaResponse> {
        const area = await areaRepository.findById(id);

        if (!area) {
            throw new NotFoundError('Area not found');
        }

        return area;
    }

    async findMany(page: number, limit: number, plantId?: string): Promise<ListAreasResponse> {
        const { areas, total } = await areaRepository.findMany(page, limit, plantId);
        return {
            areas,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async update(id: string, data: UpdateAreaInput): Promise<AreaResponse> {
        const area = await areaRepository.findById(id);

        if (!area) {
            throw new NotFoundError('Area not found');
        }

        const updated = await areaRepository.update(id, data);
        return updated;
    }

    async delete(id: string): Promise<void> {
        const area = await areaRepository.findById(id);
        
        if (!area) {
            throw new NotFoundError('Area not found');
        }

        if (area.registeredDevicesCount > 0) {
            throw new ConflictError('Cannot delete area with registered devices. Please delete all devices first.');
        }

        await areaRepository.delete(id);
        await plantRepository.decrementAreasCount(area.plantId);
    }
}

export const areaService = new AreaService();