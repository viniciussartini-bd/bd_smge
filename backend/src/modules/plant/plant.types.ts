export interface PlantResponse {
    id: string;
    name: string;
    cnpj: string;
    zipCode: string;
    address: string;
    city: string;
    state: string;
    totalArea: number;
    registeredAreasCount: number;
    totalConsumption: number;
    energyCompanyId: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PlantWithRelations extends PlantResponse {
    energyCompany?: {
        id: string;
        name: string;
        tariffKwh: number;
    } | null;
    createdBy: {
        id: string;
        name: string;
        email: string;
    };
}