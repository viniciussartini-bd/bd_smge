export interface DeviceResponse {
    id: string;
    name: string;
    model: string | null;
    brand: string | null;
    workingVoltage: number;
    power: number;
    usageTime: number;
    description: string | null;
    areaId: string;
    iotDeviceId: string | null;
    protocol: string | null;
    ipAddress: string | null;
    port: number | null;
    endpoint: string | null;
    isConnected: boolean;
    lastConnection: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface DeviceWithRelations extends DeviceResponse {
    area: {
        id: string;
        name: string;
        plantId: string;
        plant: {
            id: string;
            name: string;
        };
    };
}

export interface DeviceListResponse {
    devices: DeviceResponse[];
    total: number;
    page: number;
    totalPages: number;
}