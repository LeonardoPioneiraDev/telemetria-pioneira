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

    // As classificações de infração que buscamos
    const infractionClassifications = ['Infração de Condução']; // Exemplo

    // O repositório agora retorna um array de objetos simples com os dados já "joinados"
    const infractions = await this.telemetryEventRepository.findByDriverAndClassifications(
      driver.external_id, // Usamos o external_id do motorista
      infractionClassifications
    );

    // O mapeamento agora é direto, pois os dados já vêm no formato que precisamos
    return infractions.map(event => ({
      id: Number(event.external_id) || 0,
      description: event.eventType_description || 'Descrição indisponível',
      occurredAt: new Date(event.occurred_at).toISOString(), // Garantir que é um objeto Date
      speed: event.speed_kmh ? Number(event.speed_kmh) : null,

      // A lógica para speed_limit_kmh e value precisa ser adaptada se vierem do raw_data
      speedLimit: event.raw_data?.SpeedLimitKilometresPerHour
        ? Number(event.raw_data.SpeedLimitKilometresPerHour)
        : null,
      value: event.raw_data?.Value ? Number(event.raw_data.Value) : null,

      location: this.extractLocation(event.raw_data) || 'Localização não disponível',
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
