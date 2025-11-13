/**
 * Define todas as ações possíveis no sistema.
 * Cada ação representa uma operação específica que pode ser controlada por permissões.
 */
export enum Permission {
    // Gerenciamento de plantas
    CREATE_PLANT = 'create_plant',
    UPDATE_PLANT = 'update_plant',
    DELETE_PLANT = 'delete_plant',
    VIEW_PLANT = 'view_plant',
    
    // Gerenciamento de áreas
    CREATE_AREA = 'create_area',
    UPDATE_AREA = 'update_area',
    DELETE_AREA = 'delete_area',
    VIEW_AREA = 'view_area',
    
    // Gerenciamento de dispositivos
    CREATE_DEVICE = 'create_device',
    UPDATE_DEVICE = 'update_device',
    DELETE_DEVICE = 'delete_device',
    VIEW_DEVICE = 'view_device',
    LINK_IOT_DEVICE = 'link_iot_device',
    
    // Gerenciamento de consumo
    CREATE_CONSUMPTION = 'create_consumption',
    UPDATE_CONSUMPTION = 'update_consumption',
    DELETE_CONSUMPTION = 'delete_consumption',
    VIEW_CONSUMPTION = 'view_consumption',
    
    // Gerenciamento de alertas
    CREATE_ALERT = 'create_alert',
    UPDATE_ALERT = 'update_alert',
    DELETE_ALERT = 'delete_alert',
    VIEW_ALERT = 'view_alert',
    
    // Simulações (todos podem criar)
    CREATE_SIMULATION = 'create_simulation',
    VIEW_SIMULATION = 'view_simulation',
    DELETE_OWN_SIMULATION = 'delete_own_simulation',
    
    // Relatórios (todos podem exportar)
    EXPORT_REPORT = 'export_report',
    
    // Gerenciamento de companhias de energia
    CREATE_ENERGY_COMPANY = 'create_energy_company',
    UPDATE_ENERGY_COMPANY = 'update_energy_company',
    DELETE_ENERGY_COMPANY = 'delete_energy_company',
    VIEW_ENERGY_COMPANY = 'view_energy_company',
    
    // Gerenciamento de usuários (apenas admins)
    MANAGE_USERS = 'manage_users',
}

/**
 * Define o mapeamento entre roles e suas permissões.
 * Este objeto centraliza todas as regras de permissão do sistema.
 */
export const rolePermissions: Record<string, Permission[]> = {
    ADMIN: [
        // Admins têm todas as permissões
        Permission.CREATE_PLANT,
        Permission.UPDATE_PLANT,
        Permission.DELETE_PLANT,
        Permission.VIEW_PLANT,
        Permission.CREATE_AREA,
        Permission.UPDATE_AREA,
        Permission.DELETE_AREA,
        Permission.VIEW_AREA,
        Permission.CREATE_DEVICE,
        Permission.UPDATE_DEVICE,
        Permission.DELETE_DEVICE,
        Permission.VIEW_DEVICE,
        Permission.LINK_IOT_DEVICE,
        Permission.CREATE_CONSUMPTION,
        Permission.UPDATE_CONSUMPTION,
        Permission.DELETE_CONSUMPTION,
        Permission.VIEW_CONSUMPTION,
        Permission.CREATE_ALERT,
        Permission.UPDATE_ALERT,
        Permission.DELETE_ALERT,
        Permission.VIEW_ALERT,
        Permission.CREATE_SIMULATION,
        Permission.VIEW_SIMULATION,
        Permission.DELETE_OWN_SIMULATION,
        Permission.EXPORT_REPORT,
        Permission.CREATE_ENERGY_COMPANY,
        Permission.UPDATE_ENERGY_COMPANY,
        Permission.DELETE_ENERGY_COMPANY,
        Permission.VIEW_ENERGY_COMPANY,
        Permission.MANAGE_USERS,
    ],
    USER: [
        // Usuários regulares têm apenas permissões de visualização e algumas ações específicas
        Permission.VIEW_PLANT,
        Permission.VIEW_AREA,
        Permission.VIEW_DEVICE,
        Permission.VIEW_CONSUMPTION,
        Permission.VIEW_ALERT,
        Permission.CREATE_SIMULATION,
        Permission.VIEW_SIMULATION,
        Permission.DELETE_OWN_SIMULATION,
        Permission.EXPORT_REPORT,
        Permission.VIEW_ENERGY_COMPANY,
    ],
};