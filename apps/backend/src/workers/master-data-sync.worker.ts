import { DriverRepository } from '@/repositories/driver.repository.js';
import { EventTypeRepository } from '@/repositories/event-type.repository.js';
import { VehicleRepository } from '@/repositories/vehicle.repository.js';
import { MixApiClient } from '@/services/mix-api-client.service.js';
import { logger } from '@/shared/utils/logger.js';

export class MasterDataSyncWorker {
  private driverRepository: DriverRepository;
  private vehicleRepository: VehicleRepository;
  private eventTypeRepository: EventTypeRepository;
  private mixApiClient: MixApiClient;

  constructor(
    driverRepository: DriverRepository,
    vehicleRepository: VehicleRepository,
    eventTypeRepository: EventTypeRepository,
    mixApiClient: MixApiClient
  ) {
    this.driverRepository = driverRepository;
    this.vehicleRepository = vehicleRepository;
    this.eventTypeRepository = eventTypeRepository;
    this.mixApiClient = mixApiClient;
  }
  /**
   * Método principal que orquestra toda a sincronização.
   */
  async run(): Promise<void> {
    logger.info('🚀 Iniciando worker de sincronização de dados de apoio...');
    try {
      await this._syncDrivers();
      await this._syncVehicles();
      await this._syncEventTypes();
      logger.info('✅ Worker de sincronização de dados de apoio concluído com sucesso.');
    } catch (error) {
      logger.error('❌ Erro durante a execução do worker de sincronização.', error);
      throw error;
    }
  }

  private async _syncDrivers(): Promise<void> {
    logger.info('🔄 Sincronizando motoristas...');
    const driversFromApi = await this.mixApiClient.getAllDrivers();
    if (!driversFromApi || driversFromApi.length === 0) {
      logger.warn('Nenhum motorista encontrado na API para sincronizar.');
      return;
    }

    const existingDrivers = await this.driverRepository.findAllExternalIds();
    const existingIds = new Set(existingDrivers.map(d => String(d.external_id)));

    const promises = driversFromApi.map(driverData => {
      const dataToSave = {
        external_id: driverData.DriverId,
        name: driverData.Name,
        employee_number: driverData.EmployeeNumber,
        is_system_driver: driverData.IsSystemDriver,
        raw_data: driverData,
      };

      if (existingIds.has(String(driverData.DriverId))) {
        return this.driverRepository.updateByExternalId(driverData.DriverId, dataToSave);
      } else {
        return this.driverRepository.create(dataToSave);
      }
    });

    await Promise.all(promises);
    logger.info(`Motoristas sincronizados: ${driversFromApi.length} registros processados.`);
  }

  private async _syncVehicles(): Promise<void> {
    logger.info('🔄 Sincronizando veículos...');
    const vehiclesFromApi = await this.mixApiClient.getAllVehicles();
    if (!vehiclesFromApi || vehiclesFromApi.length === 0) {
      logger.warn('Nenhum veículo encontrado na API para sincronizar.');
      return;
    }

    const existingVehicles = await this.vehicleRepository.findAllExternalIds();
    const existingIds = new Set(existingVehicles.map(v => String(v.external_id)));

    const promises = vehiclesFromApi.map(vehicleData => {
      const dataToSave = {
        external_id: vehicleData.AssetId,
        description: vehicleData.Description,
        registration_number: vehicleData.RegistrationNumber,
        fleet_number: vehicleData.FleetNumber,
        make: vehicleData.Make,
        model: vehicleData.Model,
        year: vehicleData.Year,
        raw_data: vehicleData,
      };

      if (existingIds.has(String(vehicleData.AssetId))) {
        return this.vehicleRepository.updateByExternalId(vehicleData.AssetId, dataToSave);
      } else {
        return this.vehicleRepository.create(dataToSave);
      }
    });

    await Promise.all(promises);
    logger.info(`Veículos sincronizados: ${vehiclesFromApi.length} registros processados.`);
  }

  private async _syncEventTypes(): Promise<void> {
    logger.info('🔄 Sincronizando tipos de evento...');
    const eventTypesFromApi = await this.mixApiClient.getAllEventTypes();
    if (!eventTypesFromApi || eventTypesFromApi.length === 0) {
      logger.warn('Nenhum tipo de evento encontrado na API para sincronizar.');
      return;
    }

    const existingEventTypes = await this.eventTypeRepository.findAllExternalIds();
    const existingIds = new Set(existingEventTypes.map(e => String(e.external_id)));

    const promises = eventTypesFromApi.map(eventTypeData => {
      const dataToSave = {
        external_id: eventTypeData.EventTypeId,
        description: eventTypeData.Description,
        event_type_name: eventTypeData.EventType,
        display_units: eventTypeData.DisplayUnits,
        raw_data: eventTypeData,
      };

      if (existingIds.has(String(eventTypeData.EventTypeId))) {
        return this.eventTypeRepository.updateByExternalId(eventTypeData.EventTypeId, dataToSave);
      } else {
        return this.eventTypeRepository.create(dataToSave);
      }
    });

    await Promise.all(promises);
    logger.info(
      `Tipos de evento sincronizados: ${eventTypesFromApi.length} registros processados.`
    );
  }
}
