// apps/backend/src/modules/infractions/services/infractionService.ts
import { DriverRepository } from '@/repositories/driver.repository.js';
import { TelemetryEventRepository } from '@/repositories/telemetry-event.repository.js';
import { logger } from '@/shared/utils/logger.js';

export class InfractionService {
  private driverRepository: DriverRepository;
  private telemetryEventRepository: TelemetryEventRepository;

  constructor() {
    this.driverRepository = new DriverRepository();
    this.telemetryEventRepository = new TelemetryEventRepository();
  }

  public async getInfractionsForDriver(driverId: number) {
    logger.info(`Buscando infrações para o motorista com ID interno: ${driverId}`);

    const driver = await this.driverRepository.findById(driverId);
    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    const infractionClassifications = ['Infração de Condução'];

    const infractions = await this.telemetryEventRepository.findByDriverAndClassifications(
      String(driver.external_id),
      infractionClassifications
    );

    // ✅ MAPEAMENTO DIRETO E LIMPO
    return infractions.map(event => ({
      id: Number(event.external_id) || 0,
      description: event.eventType_description || 'Descrição indisponível',
      occurredAt: event.occurred_at.toISOString(),
      speed: event.speed_kmh ? Number(event.speed_kmh) : null,
      speedLimit: event.speed_limit_kmh ? Number(event.speed_limit_kmh) : null,
      location: this.extractLocation(event.raw_data) || 'Localização não disponível',
      value: event.value ? Number(event.value) : null,
    }));
  }

  private extractLocation(rawData: any): string | null {
    try {
      if (typeof rawData === 'string') {
        rawData = JSON.parse(rawData);
      }

      if (rawData?.StartPosition?.FormattedAddress) {
        return rawData.StartPosition.FormattedAddress;
      }
      if (rawData?.EndPosition?.FormattedAddress) {
        return rawData.EndPosition.FormattedAddress;
      }
      if (rawData?.Position?.FormattedAddress) {
        return rawData.Position.FormattedAddress;
      }
      return null;
    } catch {
      return null;
    }
  }
}
