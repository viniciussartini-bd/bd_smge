import { deviceRepository } from './device.repository.js';
import { areaRepository } from '../area/area.repository.js';
import { CreateDeviceInput, UpdateDeviceInput } from './device.validators.js';
import { DeviceResponse, DeviceWithRelations, DeviceListResponse } from './device.types.js';
import { NotFoundError, ConflictError } from '../../shared/errors/app-errors.js';

/**
 * Service responsável pela lógica de negócio de dispositivos.
 * 
 * Este service coordena as operações entre o repository e o controller,
 * aplicando regras de negócio e validações específicas do domínio.
 */
export class DeviceService {
    /**
     * Cria um novo dispositivo em uma área específica.
     * 
     * Validações:
     * - A área deve existir
     * - Se iotDeviceId for fornecido, deve ser único no sistema
     */
    async create(data: CreateDeviceInput): Promise<DeviceResponse> {
        // Verificar se a área existe
        const area = await areaRepository.findById(data.areaId);
        if (!area) {
            throw new NotFoundError('Area not found');
        }

        // Se iotDeviceId foi fornecido, verificar se já existe
        if (data.iotDeviceId) {
            const existingDevice = await deviceRepository.findByIotDeviceId(data.iotDeviceId);
            if (existingDevice) {
                throw new ConflictError('A device with this IoT Device ID already exists');
            }
        }

        // Criar o dispositivo
        const device = await deviceRepository.create(data);

        // Incrementar contador de dispositivos na área
        await deviceRepository.incrementAreaDevicesCount(data.areaId);

        return device;
    }

    /**
     * Busca um dispositivo por ID.
     * 
     * @param id - ID do dispositivo
     * @param includeRelations - Se deve incluir relacionamentos (área e planta)
     */
    async findById(
        id: string,
        includeRelations: boolean = false
    ): Promise<DeviceResponse | DeviceWithRelations> {
        const device = includeRelations
            ? await deviceRepository.findByIdWithRelations(id)
            : await deviceRepository.findById(id);

        if (!device) {
            throw new NotFoundError('Device not found');
        }

        return device;
    }

    /**
     * Lista dispositivos com suporte a paginação e filtros.
     * 
     * @param page - Número da página (começa em 1)
     * @param limit - Quantidade de itens por página
     * @param areaId - Filtrar por área específica
     * @param plantId - Filtrar por planta específica
     * @param includeRelations - Se deve incluir relacionamentos
     */
    async findAll(
        page: number = 1,
        limit: number = 10,
        areaId?: string,
        plantId?: string,
        includeRelations: boolean = false
    ): Promise<DeviceListResponse> {
        const skip = (page - 1) * limit;

        const [devices, total] = await Promise.all([
            includeRelations
                ? deviceRepository.findAllWithRelations(skip, limit, areaId, plantId)
                : deviceRepository.findAll(skip, limit, areaId, plantId),
            deviceRepository.count(areaId, plantId),
        ]);

        return {
            devices,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Atualiza um dispositivo existente.
     * 
     * Validações:
     * - O dispositivo deve existir
     * - Se iotDeviceId for alterado, o novo valor deve ser único
     */
    async update(id: string, data: UpdateDeviceInput): Promise<DeviceResponse> {
        // Verificar se o dispositivo existe
        const device = await deviceRepository.findById(id);
        if (!device) {
            throw new NotFoundError('Device not found');
        }

        // Se iotDeviceId está sendo alterado, verificar se o novo valor é único
        if (data.iotDeviceId && data.iotDeviceId !== device.iotDeviceId) {
            const existingDevice = await deviceRepository.findByIotDeviceId(data.iotDeviceId);
            if (existingDevice) {
                throw new ConflictError('A device with this IoT Device ID already exists');
            }
        }

        return deviceRepository.update(id, data);
    }

    /**
     * Deleta um dispositivo.
     * 
     * Nota: Se houver logs de consumo associados, o Prisma impedirá a deleção
     * devido à constraint de foreign key (cascade configurado no schema).
     */
    async delete(id: string): Promise<void> {
        // Verificar se o dispositivo existe
        const device = await deviceRepository.findById(id);
        if (!device) {
            throw new NotFoundError('Device not found');
        }

        // Deletar o dispositivo (o Prisma cuidará do cascade)
        await deviceRepository.delete(id);

        // Decrementar contador de dispositivos na área
        await deviceRepository.decrementAreaDevicesCount(device.areaId);
    }

    /**
     * Atualiza o status de conexão de um dispositivo IoT.
     * Útil para webhooks ou polling de status de dispositivos.
     */
    async updateConnectionStatus(
        id: string,
        isConnected: boolean
    ): Promise<DeviceResponse> {
        const device = await deviceRepository.findById(id);
        if (!device) {
            throw new NotFoundError('Device not found');
        }

        return deviceRepository.updateConnectionStatus(id, isConnected, new Date());
    }

    /**
     * Calcula o consumo estimado de um dispositivo.
     * 
     * Fórmula: Consumo (kWh) = Potência (W) × Tempo de Uso (h) / 1000
     * 
     * @param deviceId - ID do dispositivo
     * @returns Objeto com consumos estimados (diário, mensal, anual)
     */
    async calculateEstimatedConsumption(deviceId: string): Promise<{
        daily: number;
        monthly: number;
        annual: number;
    }> {
        const device = await deviceRepository.findById(deviceId);
        if (!device) {
            throw new NotFoundError('Device not found');
        }

        // Consumo diário em kWh = (Potência em Watts × Horas de uso) / 1000
        const dailyConsumption = (device.power * device.usageTime) / 1000;

        return {
            daily: dailyConsumption,
            monthly: dailyConsumption * 30,
            annual: dailyConsumption * 365,
        };
    }
}

export const deviceService = new DeviceService();