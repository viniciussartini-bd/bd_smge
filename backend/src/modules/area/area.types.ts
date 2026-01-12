import { Area, Plant, Device } from '@prisma/client';

/**
 * Resposta padrão da API para operações com áreas.
 */
export interface AreaResponse {
    id: string;
    name: string;
    totalArea: number;
    registeredDevicesCount: number;
    totalConsumption: number;
    description: string | null;
    plantId: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Área com relacionamentos incluídos (planta e dispositivos).
 */
export interface AreaWithRelations extends Area {
    plant: Pick<Plant, 'id' | 'name' | 'cnpj'>;
    devices?: Pick<Device, 'id' | 'name' | 'power'>[];
}

/**
 * Resposta de listagem paginada de áreas.
 */
export interface ListAreasResponse {
    areas: AreaResponse[];
    total: number;
    page: number;
    totalPages: number;
}