import { initializeDataSource } from '@/data-source.js';
import { EventTypeRepository } from '@/repositories/event-type.repository.js';
import { logger } from '@/shared/utils/logger.js';
import 'dotenv/config';

// Mapeamento COMPLETO da sua lista de classificação
const classificationMap: { [key: string]: string } = {
  // Categoria 1: Operação Normal
  'Active Trail point': 'Operação Normal',
  'Active track point': 'Operação Normal',
  'High priority active track point': 'Operação Normal',
  'Final active track point': 'Operação Normal',
  'Active ignition state change': 'Operação Normal',
  'Ignition On': 'Operação Normal',
  'Ignition Off': 'Operação Normal',
  'Sub-trip start': 'Operação Normal',
  'Sub-trip end': 'Operação Normal',
  'Periodic SOC': 'Operação Normal',
  'Start of trip fuel tank level percentage': 'Operação Normal',
  'End of trip fuel tank level percentage': 'Operação Normal',
  'Start of trip state of charge': 'Operação Normal',
  'End of trip state of charge': 'Operação Normal',

  // Categoria 2: Infrações de Condução
  'Over speeding': 'Infração de Condução',
  'Road Speed Overspeeding': 'Infração de Condução',
  'Over speeding in location - EXCESSIVE SPEED': 'Infração de Condução',
  'Over speeding - TIERED': 'Infração de Condução',
  'Over speeding in location - EXCESSIVE DURATION': 'Infração de Condução',
  'In-cab road speed over speeding': 'Infração de Condução',
  'In-cab road speed over speeding - EXCESSIVE DURATION': 'Infração de Condução',
  'In-cab road speed over speeding - EXCESSIVE SPEED': 'Infração de Condução',
  'Over speeding in location': 'Infração de Condução',
  'Out of green band driving': 'Infração de Condução',
  'Over revving': 'Infração de Condução',
  'Harsh braking': 'Infração de Condução',
  'Harsh acceleration': 'Infração de Condução',
  Idle: 'Infração de Condução',
  'Idle - excessive': 'Infração de Condução',
  '(Tr) Excesso de Velocidade 70 Km (Buzzer)': 'Infração de Condução',
  '(Tr) Excesso de Velocidade 60 Km': 'Infração de Condução',
  '(Tr) Excesso de Velocidade 30 Km (Buzzer)': 'Infração de Condução',
  '(Tr) Excesso de Velocidade 20 Km': 'Infração de Condução',
  '(Tr) Excesso de Velocidade 30 Km': 'Infração de Condução',
  '(Tr) Excesso de Velocidade 40 Km': 'Infração de Condução',
  '(Tr) Excesso de Velocidade 70 Km': 'Infração de Condução',
  '(Tr) Excesso de Velocidade 60 Km (Buzzer)': 'Infração de Condução',
  '(Tr) Excesso de Velocidade 20 Km (Buzzer)': 'Infração de Condução',
  '(Tr) Excesso de Marcha Lenta': 'Infração de Condução',
  '(Tr) Excesso de Rotação': 'Infração de Condução',
  '(Tr) Excesso RPM Veículo Parado': 'Infração de Condução',
  '(Tr) Freada Brusca': 'Infração de Condução',
  '(Tr) Aceleração Brusca': 'Infração de Condução',
  '(Tr) Curva Brusca': 'Infração de Condução',
  '(Tr) Fora da Faixa Verde': 'Infração de Condução',
  'Excesso de Rotação': 'Infração de Condução',

  // Categoria 3: Segurança e Proteção
  'Panic Alert': 'Segurança e Proteção',
  'Driver seatbelt not engaged': 'Segurança e Proteção',
  'Passenger seatbelt not engaged': 'Segurança e Proteção',
  'Driver door open': 'Segurança e Proteção',
  'Passenger door open': 'Segurança e Proteção',
  'Driver side rear door open': 'Segurança e Proteção',
  'Passenger side rear door open': 'Segurança e Proteção',
  'Passenger IDed': 'Segurança e Proteção',
  'Possible impact': 'Segurança e Proteção',
  'Possible impact when parked': 'Segurança e Proteção',
  'Possible Rollover': 'Segurança e Proteção',

  // Categoria 4: Diagnósticos e Manutenção
  'Engine Oil level low': 'Diagnóstico e Manutenção',
  'Engine Oil Pressure low': 'Diagnóstico e Manutenção',
  'Engine coolant temperature high': 'Diagnóstico e Manutenção',
  'Engine light (MIL) on': 'Diagnóstico e Manutenção',
  'Diagnostic trouble code': 'Diagnóstico e Manutenção',
  'Diagnostic: Noise on speed line': 'Diagnóstico e Manutenção',
  'Diagnostic: GPS velocity as speed fallback': 'Diagnóstico e Manutenção',
  'Diagnostic: Maximum GPS Velocity': 'Diagnóstico e Manutenção',
  'Diagnostic: Fault no GPS': 'Diagnóstico e Manutenção',
  'Diagnostic: CAN Scan': 'Diagnóstico e Manutenção',
  'CAN speed/RPM loss detected': 'Diagnóstico e Manutenção',
  'CAN loss detected': 'Diagnóstico e Manutenção',
  '(TST) Alta Temperatura do Óleo do Motor': 'Diagnóstico e Manutenção',
  '(TST) Bloqueio por relé': 'Diagnóstico e Manutenção',
  '(TST) Alta Temperatura do Óleo do Motor (Volvos)': 'Diagnóstico e Manutenção',
  '(TST) Alta Temperatura do Óleo do Motor (EURO 6)': 'Diagnóstico e Manutenção',
  '(TST) Baixa Pressão do Óleo do Motor (EURO 6)': 'Diagnóstico e Manutenção',
  '(TST) Baixa Pressão do Óleo do Motor (EURO 5)': 'Diagnóstico e Manutenção',
  '(TST) Baixa Pressão do Óleo do Motor (EURO 3)': 'Diagnóstico e Manutenção',
  '(TST) Baixa Tensão da Bateria': 'Diagnóstico e Manutenção',
  '(TST) Alta Tensão da Bateria': 'Diagnóstico e Manutenção',
  '(TST) Alta Temperatura do Motor': 'Diagnóstico e Manutenção',
  '(TST) Pedal do Acelerador Pressionado CAN J1939': 'Diagnóstico e Manutenção',
  '(TST) Pedal do Acelerador Pressionado CAN VOLKS E6': 'Diagnóstico e Manutenção',
  '(TST) Pedal do Acelerador Pressionado CAN': 'Diagnóstico e Manutenção',
  '(TST) Pedal do Acelerador Pressionado CAN Volvo': 'Diagnóstico e Manutenção',
  '(TST) Pedal do Acelerador Pressionado CAN PSM': 'Diagnóstico e Manutenção',
  '(TST) Pedal do Acelerador Pressionado SENSOR': 'Diagnóstico e Manutenção',
  '(TST) PEDAL ARTICULADO 6': 'Diagnóstico e Manutenção',

  // Categoria 5: Comunicação e Sistema
  'End of trip call back request': 'Comunicação e Sistema',
  'COMMS: Terminal Event Download Request': 'Comunicação e Sistema',
  'COMMS: EOT Download': 'Comunicação e Sistema',
  'COMMS: BOT Download': 'Comunicação e Sistema',
  'SMS: Near daily limit': 'Comunicação e Sistema',
  'SMS: Daily limit reached': 'Comunicação e Sistema',
  '(TST) GPRS Sem Sinal': 'Comunicação e Sistema',
  'Charging status whilst out of trip': 'Comunicação e Sistema',
  'Diagnostic: Satellite communication message limit set': 'Comunicação e Sistema',

  // Categoria 6: Configuração e Firmware
  'OBC unit odometer changed': 'Configuração e Firmware',
  'OBC unit date changed': 'Configuração e Firmware',
  'OBC unit Engine Hours changed': 'Configuração e Firmware',
  'OBC unit reset': 'Configuração e Firmware',
  'Firmware version changed': 'Configuração e Firmware',
  'Firmware info': 'Configuração e Firmware',
  'Firmware error': 'Configuração e Firmware',
  'Configuration accepted': 'Configuração e Firmware',
  'Configuration confirmed': 'Configuração e Firmware',
  'Configuration version changed': 'Configuração e Firmware',
  'Settings version changed': 'Configuração e Firmware',
  'Store new values for time deviation calculation': 'Configuração e Firmware',
  'Calculate soft clock value when after the time change date': 'Configuração e Firmware',
  'Calculate soft clock value when before the time change date': 'Configuração e Firmware',
  'Calculate soft clock current date time using calculated time': 'Configuração e Firmware',

  // Categoria 7: Jornada de Trabalho e Descanso
  '805:Weekly Rest': 'Jornada de Trabalho e Descanso',
  '214:Daily Driving': 'Jornada de Trabalho e Descanso',
  '203:Daily Driving': 'Jornada de Trabalho e Descanso',
  '811:Driving in 7 day period': 'Jornada de Trabalho e Descanso',
  '838:Monthly Driving': 'Jornada de Trabalho e Descanso',
  '703:Weekly Driving': 'Jornada de Trabalho e Descanso',
  '704:Two Weekly Driving': 'Jornada de Trabalho e Descanso',
  '207:Daily On Duty Maximum': 'Jornada de Trabalho e Descanso',
  '"823:Rest block short (5:30h, BFM 6:15h)"': 'Jornada de Trabalho e Descanso',
  '854:Maximum Weekly Driving': 'Jornada de Trabalho e Descanso',
  '206:Daily Off Duty Not For Shift Reset': 'Jornada de Trabalho e Descanso',
  '507:Shift Driving': 'Jornada de Trabalho e Descanso',
  '815:Required Rest In 14 days': 'Jornada de Trabalho e Descanso',
  '830:Required Rest In 28 days': 'Jornada de Trabalho e Descanso',
  '835:Night Driving': 'Jornada de Trabalho e Descanso',
  '702:Two Weekly Rest': 'Jornada de Trabalho e Descanso',
  '806:Daily Driving': 'Jornada de Trabalho e Descanso',
  '809:Required Rest In 24 Hours': 'Jornada de Trabalho e Descanso',
  '205:Daily Off Duty': 'Jornada de Trabalho e Descanso',
  '706:Reduced Rest Compensation': 'Jornada de Trabalho e Descanso',
  '812:Required Rest In 7 days': 'Jornada de Trabalho e Descanso',
  '856:Split Break Reset': 'Jornada de Trabalho e Descanso',
  '801:Continuous Driving': 'Jornada de Trabalho e Descanso',
  '508:Shift Break': 'Jornada de Trabalho e Descanso',
  '509:Shift On Duty': 'Jornada de Trabalho e Descanso',
  '808:Driving in 24H period': 'Jornada de Trabalho e Descanso',
  '834:Required Rest In 82 Hours': 'Jornada de Trabalho e Descanso',
  '855:Weekly Rolling On Duty Reset': 'Jornada de Trabalho e Descanso',
  '862:Weekly Rest': 'Jornada de Trabalho e Descanso',
  '802:Daily Rest': 'Jornada de Trabalho e Descanso',
  '514:Shift Total': 'Jornada de Trabalho e Descanso',
  '109:Cycle On Duty': 'Jornada de Trabalho e Descanso',
  '829:Driving in 28 day period': 'Jornada de Trabalho e Descanso',
  '840:Required Rest Before': 'Jornada de Trabalho e Descanso',
  '857:Maximum Two Week Driving': 'Jornada de Trabalho e Descanso',
  '861:Required Off Duty In Calendar Month ': 'Jornada de Trabalho e Descanso',
  '701:Weekly Rest': 'Jornada de Trabalho e Descanso',
  '111:Cycle On Duty Without Required Off Duty': 'Jornada de Trabalho e Descanso',
  '"821:Rest block long (11:00h, BFM 12:00h)"': 'Jornada de Trabalho e Descanso',
  '213:Daily Driving Without Break': 'Jornada de Trabalho e Descanso',
  '215:Daily Rest': 'Jornada de Trabalho e Descanso',
  '"822:Rest block medium (8:00h, BFM 9:00h)"': 'Jornada de Trabalho e Descanso',
  '825: Required Rest In 52 Hours': 'Jornada de Trabalho e Descanso',
  '852:Maximum Consecutive Driving Days': 'Jornada de Trabalho e Descanso',
  '204:Daily Off Duty Deferral': 'Jornada de Trabalho e Descanso',
  '112:Cycle Off Duty Periods': 'Jornada de Trabalho e Descanso',
  '824:Driving in 14 day period': 'Jornada de Trabalho e Descanso',
  '837:Weekly Driving': 'Jornada de Trabalho e Descanso',
  '853:Weekly Rolling Reset': 'Jornada de Trabalho e Descanso',

  // Categoria 8: Equipamentos Especiais
  'PTO Engaged': 'Equipamentos Especiais',
  'DriveMate Mode Change': 'Equipamentos Especiais',
  '(Tr) Batendo Transmissão': 'Equipamentos Especiais',

  // Categoria 9: Monitoramento Contínuo
  'z(TST) Pedal de freio acionado 3': 'Monitoramento Contínuo',
  'z(TST) Temperatura óleo motor (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Delta Fuel Decrease (Tick - 5 min)': 'Monitoramento Contínuo',
  'z(TST) Pressão freio primário (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Nível Combustível (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Pressão freio secundário (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Corrente da bateria (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Pressão freio de ar 1 (Tick - 30 s)': 'Monitoramento Contínuo',
  'z(TST) Total horas motor (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Dist. próxima manutenção (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Pressão óleo motor (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Nível pós tratamento (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Nível líquido arrefecimento (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Retarder acionado': 'Monitoramento Contínuo',
  'z(TST) Delta Fuel Increase (Tick - 5 min)': 'Monitoramento Contínuo',
  'z(TST) Pressão freio de ar 2 (Tick - 30 s)': 'Monitoramento Contínuo',
  'z(TST) Tensão da bateria 2 (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Torque do motor (Tick – 30s)': 'Monitoramento Contínuo',
  'z(TST) Nível óleo do motor (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Temp. líquido arrefecimento (Tick - 10 min)': 'Monitoramento Contínuo',
  'z(TST) Pedal de freio acionado': 'Monitoramento Contínuo',
  'z(TST) Tensão da bateria (Tick - 10 min)': 'Monitoramento Contínuo',

  // outros
  '* Ignition Off': 'Eventos do Veículo - Operação Normal',
  '* Panic Alert': 'Segurança e Proteção',
  '* Ignition On': 'Eventos do Veículo - Operação Normal',
  '823:Rest block short (5:30h, BFM 6:15h)': 'Jornada de Trabalho e Descanso',
  '821:Rest block long (11:00h, BFM 12:00h)': 'Jornada de Trabalho e Descanso',
  '822:Rest block medium (8:00h, BFM 9:00h)': 'Jornada de Trabalho e Descanso',
  'z(TST) Temp. óleo transmissão (Tick - 10 min)': 'Monitoramento Contínuo',
};

async function seedClassifications() {
  logger.info('🌱 Iniciando a semeadura das classificações de eventos...');
  await initializeDataSource();

  const eventTypeRepo = new EventTypeRepository();
  const allEventTypes = await eventTypeRepo.findAll();

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const eventType of allEventTypes) {
    const classification = classificationMap[eventType.description];
    if (classification && eventType.classification !== classification) {
      await eventTypeRepo.update(eventType.id, { classification });
      updatedCount++;
    } else if (!classification) {
      notFoundCount++;
    }
  }

  logger.info(`✅ Semeadura concluída. ${updatedCount} registros foram atualizados/classificados.`);
  if (notFoundCount > 0) {
    logger.warn(
      `⚠️  ${notFoundCount} descrições de eventos no banco não foram encontradas no mapa de classificação.`
    );
  }
  process.exit(0);
}

seedClassifications().catch(error => {
  logger.error('❌ Erro durante a semeadura das classificações:', error);
  process.exit(1);
});
