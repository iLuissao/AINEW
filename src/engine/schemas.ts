import { z } from 'zod';
import { InverterArchitecture, ConductorMaterial, InsulationType, TempRating, ConduitType } from './types';

/**
 * Exact Standard Service Order Specification:
 * "Orden de Servicio (Sistema Fotovoltaico)"
 * Structure: Left column (Blue label) - Right column (White value)
 */

export const EnergekaServiceOrderSchema = z.object({
  // 1. Datos Generales
  folio_orden_servicio: z.string().default(''),
  nombre_cliente: z.string().default(''),
  fecha_instalacion: z.string().default(''),
  direccion_instalacion: z.string().default(''),
  telefono_contacto: z.string().default(''),
  email: z.string().default(''),
  coordenadas_gps: z.string().default(''),

  // 2. Condiciones del lugar de instalación
  tipo_azotea: z.string().default('CONCRETO PLANO'),
  inclinacion_grados: z.string().default('0°'),
  distancia_paneles_inversores_m: z.coerce.number().default(0), // Ruta DC (0m = inversor junto al arreglo)
  distancia_inversor_centro_carga_m: z.coerce.number().default(0), // Ruta AC

  // 3. Datos del sistema fotovoltaico
  tipo_proyecto: z.string().default('CONTADO'),
  marca_panel_solar: z.string().default(''),
  numero_paneles: z.coerce.number().int().default(0),
  potencia_panel_watts: z.coerce.number().default(0),
  voltaje_operacion_dc_v: z.coerce.number().default(0),
  marca_modelo_inversor: z.string().default(''),
  proteccion_termomagnetica_ac: z.string().default(''),
  comentarios_a_mecanicos: z.string().default(''),

  // 4. Instalación eléctrica
  instalacion_electrica: z.string().default('Bifásica'), // Monofásica, Bifásica, Trifásica
  tipo_medidor: z.string().default('DIGITAL'),
  requiere_acondicionar_preparacion_medidor: z.string().default('NO'),
  acometida: z.string().default('Aérea'),
  comentarios_b_electricos: z.string().default(''),
});

export type EnergekaServiceOrder = z.infer<typeof EnergekaServiceOrderSchema>;

// Unified Service Order Extraction Schema
export const ServiceOrderExtractionSchema = z.object({
  serviceOrderId: z.string().default(''),
  clientName: z.string().default(''),
  projectName: z.string().default(''),
  installationAddress: z.string().default(''),
  scheduledDate: z.string().default(''),
  contactPhone: z.string().default(''),
  contactEmail: z.string().default(''),
  coordinatesGps: z.string().default(''),
  roofType: z.string().default('Loza'),
  roofTilt: z.string().default(''),
  projectType: z.string().default('CONTADO'),
  gridConnectionType: z.string().default('Bifásica'),
  meterType: z.string().default('Digital'),
  meterPrepRequired: z.string().default('NO'),
  serviceDropType: z.string().default('Aérea'),
  acBreakerRating: z.string().default(''),
  comentariosA: z.string().default(''),
  comentariosB: z.string().default(''),
  notes: z.string().default(''),
  specialConsiderationsBox: z.string().default(''),
  specialDirectives: z.array(z.string()).default([]),
  ambientTempC: z.coerce.number().default(0),
  pv: z.object({
    manufacturer: z.string().default(''),
    model: z.string().default(''),
    powerW: z.coerce.number().default(0),
    vocV: z.coerce.number().default(0),
    vmpV: z.coerce.number().default(0),
    iscA: z.coerce.number().default(0),
    impA: z.coerce.number().default(0),
    totalModules: z.coerce.number().int().default(0),
    numberOfStrings: z.coerce.number().int().default(1),
    modulesPerString: z.coerce.number().int().default(0),
    bifacial: z.boolean().default(false),
    bifacialGainPercent: z.coerce.number().default(0),
  }),
  inverter: z.object({
    manufacturer: z.string().default(''),
    model: z.string().default(''),
    architecture: z.enum(['microinverter', 'string', 'central', 'hybrid_ess']).default('string'),
    numberOfUnits: z.coerce.number().int().default(1),
    ratedPowerKw: z.coerce.number().default(0),
    maxAcCurrentA: z.coerce.number().default(0),
    nominalAcVoltageV: z.coerce.number().default(0),
    gridPhases: z.string().default('2F-3H'),
    mpptCount: z.coerce.number().int().default(0),
  }),
  battery: z.object({
    enabled: z.boolean().default(false),
    manufacturer: z.string().default(''),
    model: z.string().default(''),
    capacityKwh: z.coerce.number().default(0),
    nominalVoltageV: z.coerce.number().default(0),
    maxContinuousDischargeCurrentA: z.coerce.number().default(0),
  }).default({
    enabled: false,
    manufacturer: '',
    model: '',
    capacityKwh: 0,
    nominalVoltageV: 0,
    maxContinuousDischargeCurrentA: 0,
  }),
  routes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['DC', 'AC']),
      lengthM: z.coerce.number().default(0),
      conduitType: z.enum(['EMT', 'PVC-40', 'PVC-80', 'IMC', 'LiquidTight']).default('EMT'),
      insulationType: z.enum(['THHW-LS', 'THHN/THWN-2', 'PV-Wire', 'XHHW-2']).default('THHW-LS'),
      conductorMaterial: z.enum(['Cu', 'Al']).default('Cu'),
      temperatureRating: z.enum(['75C', '90C']).default('90C'),
      bends90: z.coerce.number().default(0),
      bends45: z.coerce.number().default(0),
    })
  ).default([]),
  confidenceScore: z.coerce.number().min(0).max(1).default(1.0),
  confidenceBreakdown: z.record(z.string(), z.string()).optional(),
  extractedFieldsSummary: z.array(z.string()).default([]),
  _warning: z.string().optional(),
});

export type ServiceOrderExtraction = z.infer<typeof ServiceOrderExtractionSchema>;

/**
 * Extracts special engineering directives from both Comentarios A and Comentarios B
 */
export function extractSpecialDirectivesFromComments(commentsA: string, commentsB?: string): string[] {
  const combined = `${commentsA || ''} ${commentsB || ''}`.toLowerCase();
  const directives: string[] = [];

  if (combined.includes('no se debe perforar') || combined.includes('loza') || combined.includes('sin perforar')) {
    directives.push('🛡️ Loza sin perforación: Anclaje perimetral a pretil, barda y chimenea requerido');
  }
  if (combined.includes('forma de l') || combined.includes('en l')) {
    directives.push('📐 Arreglo modular en "L" según trazo arquitectónico');
  }
  if (combined.includes('centro de carga') && (combined.includes('medidor') || combined.includes('cfe') || combined.includes('costado'))) {
    directives.push('⚡ Instalación de Centro de Carga principal junto a medidor CFE');
  }
  if (combined.includes('bajada') && (combined.includes('fachada') || combined.includes('lado derecho'))) {
    directives.push('🏢 Bajada de canalización por fachada lateral derecha');
  }
  if (combined.includes('pretil') || combined.includes('azotea')) {
    directives.push('📍 Fijación en pretiles con fijación mecánica de alta resistencia');
  }
  if (combined.includes('imc') || combined.includes('intemperie')) {
    directives.push('🛡️ Tubería metálica pesada IMC para tramos exteriores expuestos');
  }

  return directives;
}

/**
 * Rigorously extracts the inverter nominal rated power (kW AC) directly from the
 * "Marca y modelo de inversor" field without making assumptions or hardcoded guesses.
 * Examples:
 * - "GROWATT 5.0" -> 5.0
 * - "GROWATT 3.3" -> 3.3
 * - "GROWATT 6.0" -> 6.0
 * - "GROWATT 7.0" -> 7.0
 * - "SOLIS 5K" / "SOLIS 5.0" -> 5.0
 * - "GROWATT MIN 5000TL-X" -> 5.0
 * - "GROWATT MIN 6000TL-X" -> 6.0
 * - "GROWATT MIC 3000TL-X" -> 3.0
 * - "HUAWEI SUN2000-6KTL-L1" -> 6.0
 * - "FRONIUS PRIMO 8.2-1" -> 8.2
 * Returns 0 if no valid number found (NEVER assumes 7.0 or any arbitrary fallback).
 */
export function extractInverterPowerFromModel(rawModel: string): number {
  if (!rawModel || typeof rawModel !== 'string') return 0;
  const str = rawModel.trim();

  // 1. Explicit kW notation: e.g. "5.0 kW", "7.0kW", "3.3 KW", "11.4 kW", "6.0 k"
  const kwMatch = str.match(/(\d+(?:\.\d+)?)\s*k(?:w|va)?\b/i);
  if (kwMatch) {
    const val = parseFloat(kwMatch[1]);
    if (val > 0 && val < 500) return val;
  }

  // 2. Solar model with KTL/K suffix: e.g. "5KTL", "6KTL", "10KTL", "-5K-", "1P5K", "3.6K"
  const ktlMatch = str.match(/(?:[A-Z0-9_-]+[ -])?(\d+(?:\.\d+)?)\s*k(?:tl)?(?:[0-9A-Z_-]+)?/i);
  if (ktlMatch) {
    const val = parseFloat(ktlMatch[1]);
    if (val > 0 && val < 500) return val;
  }

  // 3. Decimal power directly in name: e.g. "GROWATT 5.0", "GROWATT 3.3", "GROWATT 6.0", "SOLIS 4.6", "FRONIUS 8.2", "PRIMO 3.8"
  const decimalMatch = str.match(/\b(\d{1,2}\.\d{1,2})\b/);
  if (decimalMatch) {
    const val = parseFloat(decimalMatch[1]);
    if (val >= 0.5 && val <= 150) return val;
  }

  // 4. Inverter models using Watts (e.g. 5000, 3000, 6000, 3300, 10000)
  // Look for 4-5 digits, often followed by TL, X, W, etc. E.g. "5000TL", "MIN 6000", "MIC 3300"
  // Avoid matching years like 2024 or SUN2000
  const wattsMatch = str.match(/(?:MIN|MIC|MOD|MID|MAC|MAX|SG|GW|TL|X)?[- ]*(\d{4,5})\s*(?:tl|x|w|va)?\b/i);
  if (wattsMatch) {
    const rawVal = parseFloat(wattsMatch[1]);
    if (rawVal >= 1000 && rawVal <= 100000 && rawVal !== 2000 && rawVal !== 2023 && rawVal !== 2024 && rawVal !== 2025 && rawVal !== 2026) {
      return parseFloat((rawVal / 1000).toFixed(2));
    }
  }

  // 5. If brand is followed by an integer: e.g. "GROWATT 5", "SOLIS 6", "INVERSOR 5"
  const intAfterBrandMatch = str.match(/(?:GROWATT|SOLIS|FRONIUS|HUAWEI|SUNGROW|SMA|GOODWE|INVERSOR|INV)\s*(\d{1,2})\b/i);
  if (intAfterBrandMatch) {
    const val = parseFloat(intAfterBrandMatch[1]);
    if (val >= 1 && val <= 100) return val;
  }

  // 6. Generic first valid number between 0.5 and 150
  const anyNumMatch = str.match(/(\d+(?:\.\d+)?)/);
  if (anyNumMatch) {
    const val = parseFloat(anyNumMatch[1]);
    if (val >= 1000 && val <= 100000 && val !== 2000 && val !== 2023 && val !== 2024 && val !== 2025 && val !== 2026) {
      return parseFloat((val / 1000).toFixed(2));
    }
    if (val >= 0.5 && val <= 150) return val;
  }

  return 0;
}

/**
 * Normalizes Energeka or general Service Order into standard system data
 * Handles single-phase, two-phase and three-phase, variable inverter sizes, and auto-sizing missing values.
 */
export function normalizeServiceOrderWithUnits(rawInput: any): ServiceOrderExtraction {
  const clientName = rawInput?.nombre_cliente || rawInput?.clientName || '';
  const scheduledDate = rawInput?.fecha_instalacion || rawInput?.fecha_programada || rawInput?.scheduledDate || '';
  const installationAddress = rawInput?.direccion_instalacion || rawInput?.ubicacion_instalacion || rawInput?.installationAddress || '';
  const contactPhone = rawInput?.telefono_contacto || rawInput?.contactPhone || '';
  const contactEmail = rawInput?.email || rawInput?.contactEmail || '';
  
  // Extract GPS coordinates if present in address
  let coordinatesGps = '';
  const gpsMatch = installationAddress.match(/\((?:latitud:?\s*([0-9.-]+)[;, ]+\s*longitud:?\s*([0-9.-]+[oOwW]?))\)/i);
  if (gpsMatch) {
    coordinatesGps = `${gpsMatch[1]}, ${gpsMatch[2]}`;
  }

  const roofType = rawInput?.tipo_azotea || rawInput?.roofType || 'CONCRETO PLANO';
  let rawTilt = (rawInput?.inclinacion_grados || rawInput?.inclinacion || rawInput?.roofTilt || '0°').toString().trim();
  if (rawTilt.toUpperCase() === 'NO') rawTilt = '0° (Coplanar)';

  const dcLength = Number(rawInput?.distancia_paneles_inversores_m ?? rawInput?.longitud_ruta_dc_m ?? rawInput?.routes?.[0]?.lengthM ?? 0);
  const acLength = Number(rawInput?.distancia_inversor_centro_carga_m ?? rawInput?.longitud_ruta_ac_m ?? rawInput?.routes?.[1]?.lengthM ?? 0);

  const projectType = rawInput?.tipo_proyecto || rawInput?.projectType || 'CONTADO';
  const pvBrandRaw = rawInput?.marca_panel_solar || rawInput?.marca_modulo || rawInput?.pv?.manufacturer || 'JINKO SOLAR';
  const totalMods = Number(rawInput?.numero_paneles ?? rawInput?.total_modulos ?? rawInput?.pv?.totalModules ?? 0);
  const powerW = Number(rawInput?.potencia_panel_watts ?? rawInput?.potencia_modulo_w ?? rawInput?.pv?.powerW ?? 590);

  // Inverter analysis: clean candidate and explicitly filter out "centro de carga"
  let invRaw = rawInput?.marca_modelo_inversor || rawInput?.modelo_inversor || rawInput?.marca_inversor || rawInput?.inverter?.model || '';
  if (typeof invRaw === 'string') {
    if (invRaw.toLowerCase().includes('centro de carga') || invRaw.toLowerCase().includes('distancia')) {
      invRaw = '';
    }
  }

  // Extraer la potencia del inversor DIRECTAMENTE del texto de "Marca y modelo de inversor"
  let invKw = 0;
  if (invRaw) {
    invKw = extractInverterPowerFromModel(invRaw);
  }
  // Si no se extrajo del modelo, intentar del campo numérico explícito:
  if (invKw === 0 && rawInput?.potencia_inversor_kw) {
    invKw = Number(rawInput.potencia_inversor_kw);
  } else if (invKw === 0 && rawInput?.inverter?.ratedPowerKw) {
    invKw = Number(rawInput.inverter.ratedPowerKw);
  }

  // SI NO HAY POTENCIA EN EL TEXTO, DEJAR invKw EN 0 (NUNCA SUPONER 7.0 NI NINGÚN OTRO VALOR)
  if (!invRaw && invKw > 0) {
    invRaw = `Inversor ${invKw.toFixed(1)} kW`;
  }

  // Grid connection type (Trifásica, Bifásica, Monofásica)
  const gridConnRaw = (rawInput?.instalacion_electrica || rawInput?.fases_red || rawInput?.gridConnectionType || 'Bifásica').toString().toUpperCase();
  const is3Phase = gridConnRaw.includes('TRIFAS') || gridConnRaw.includes('3F');
  const is1Phase = gridConnRaw.includes('MONOFAS') || gridConnRaw.includes('1F');
  
  const gridConn = is3Phase ? 'Trifásica' : (is1Phase ? 'Monofásica' : 'Bifásica');
  const gridPhases = is3Phase ? '3F-4H' : (is1Phase ? '1F-2H' : '2F-3H');
  const invVoltage = is3Phase ? 220 : (is1Phase ? 127 : 220);

  // Electrical sizing for Inverter AC Current:
  let maxAcCurrent = 0;
  if (invKw > 0) {
    if (is3Phase) {
      maxAcCurrent = parseFloat(((invKw * 1000) / (Math.sqrt(3) * invVoltage)).toFixed(1));
    } else {
      maxAcCurrent = parseFloat(((invKw * 1000) / invVoltage).toFixed(1));
    }
  }

  // Auto-size AC Breaker if not provided or empty
  let acBreaker = rawInput?.proteccion_termomagnetica_ac || rawInput?.acBreakerRating || '';
  if (!acBreaker || acBreaker.trim() === '' || acBreaker === '0' || acBreaker === '0A') {
    const continuousCurrent = maxAcCurrent * 1.25;
    const stdBreakers = [15, 20, 25, 30, 40, 50, 60, 70, 80, 100, 125, 150];
    const recommendedBreaker = stdBreakers.find(b => b >= continuousCurrent) || Math.ceil(continuousCurrent / 10) * 10;
    const poles = is3Phase ? '3P' : (is1Phase ? '1P' : '2P');
    acBreaker = `${poles}-${recommendedBreaker}A`;
  }

  // Calculate DC array configuration & operating voltage
  let strings = 1;
  let modsPerString = totalMods;
  if (totalMods >= 10 && invKw >= 5) {
    strings = 2;
    modsPerString = Math.ceil(totalMods / 2);
  }

  let vDcOper = Number(rawInput?.voltaje_operacion_dc_v ?? rawInput?.vmp_v ?? rawInput?.pv?.vmpV ?? 0);
  if (vDcOper === 0 && totalMods > 0) {
    vDcOper = parseFloat((modsPerString * 44.6).toFixed(1));
  }

  const unitModuleVoc = 52.8;
  const unitModuleVmp = 44.6;
  const iscA = 14.25;
  const impA = 13.23;

  const meterType = rawInput?.tipo_medidor || rawInput?.meterType || 'DIGITAL';
  const meterPrep = rawInput?.requiere_acondicionar_preparacion_medidor || rawInput?.meterPrepRequired || 'NO';
  const serviceDrop = rawInput?.acometida || rawInput?.serviceDropType || 'Aérea';
  const comentariosA = rawInput?.comentarios_a_mecanicos || rawInput?.comentariosA || '';
  const comentariosB = rawInput?.comentarios_b_electricos || rawInput?.comentariosB || '';

  const commentsCombined = `${comentariosA}\n${comentariosB}`.trim();
  const specialDirectives = extractSpecialDirectivesFromComments(comentariosA, comentariosB);
  
  if (is3Phase) {
    specialDirectives.unshift('⚡ Sistema de Distribución Trifásico 220/127V (3F-4H) con protección termomagnética tripolar');
  }
  if (dcLength === 0) {
    specialDirectives.push('📍 Inversor ubicado a pie de arreglo FV en azotea (Ruta DC directa ≤ 1m)');
  }
  if (acLength >= 30) {
    specialDirectives.push(`📏 Caída de tensión crítica: Ruta AC de ${acLength}m al centro de carga principal (Calibre dimensionado por distancia)`);
  }

  const totalDckWp = (totalMods > 0 && powerW > 0) ? parseFloat(((totalMods * powerW) / 1000).toFixed(2)) : 0;
  const conduitType = (commentsCombined.toLowerCase().includes('imc') || acLength >= 35) ? 'EMT' : 'EMT';

  const structuredData = {
    serviceOrderId: rawInput?.folio_orden_servicio || rawInput?.serviceOrderId || 'OS-SFI-FOTOVOLTAICO',
    clientName,
    projectName: totalDckWp > 0 ? `Proyecto Solar ${clientName || ''} (${totalDckWp} kWp)` : 'Proyecto Fotovoltaico',
    installationAddress,
    scheduledDate,
    contactPhone,
    contactEmail,
    coordinatesGps,
    roofType,
    roofTilt: rawTilt,
    projectType,
    gridConnectionType: gridConn,
    meterType,
    meterPrepRequired: meterPrep,
    serviceDropType: serviceDrop,
    acBreakerRating: acBreaker,
    comentariosA,
    comentariosB,
    notes: commentsCombined,
    specialConsiderationsBox: commentsCombined,
    specialDirectives,
    ambientTempC: Number(rawInput?.temperatura_ambiente_c || rawInput?.ambientTempC || 38),
    pv: {
      manufacturer: pvBrandRaw,
      model: `${pvBrandRaw} ${powerW}W`,
      powerW,
      vocV: unitModuleVoc,
      vmpV: unitModuleVmp,
      iscA,
      impA,
      totalModules: totalMods,
      numberOfStrings: strings,
      modulesPerString: modsPerString,
      bifacial: commentsCombined.toLowerCase().includes('bifacial'),
      bifacialGainPercent: commentsCombined.toLowerCase().includes('bifacial') ? 10 : 0,
    },
    inverter: {
      manufacturer: invRaw.toUpperCase().includes('GROWATT') ? 'Growatt' : (invRaw.toUpperCase().includes('HUAWEI') ? 'Huawei' : 'Inversor Solar'),
      model: invRaw || `GROWATT ${invKw}kW`,
      architecture: 'string' as InverterArchitecture,
      numberOfUnits: 1,
      ratedPowerKw: invKw,
      maxAcCurrentA: maxAcCurrent,
      nominalAcVoltageV: invVoltage,
      gridPhases,
      mpptCount: strings >= 2 ? 2 : 1,
    },
    battery: {
      enabled: false,
      manufacturer: '',
      model: '',
      capacityKwh: 0,
      nominalVoltageV: 0,
      maxContinuousDischargeCurrentA: 0,
    },
    routes: [
      {
        id: 'r-dc-1',
        name: 'Ruta DC (Paneles a Inversores)',
        type: 'DC' as const,
        lengthM: dcLength > 0 ? dcLength : 1,
        conduitType: 'EMT' as ConduitType,
        insulationType: 'THHW-LS' as InsulationType,
        conductorMaterial: 'Cu' as ConductorMaterial,
        temperatureRating: '90C' as TempRating,
        bends90: dcLength > 0 ? 2 : 0,
        bends45: 0,
      },
      {
        id: 'r-ac-1',
        name: 'Ruta AC (Inversor a Centro de Carga / Medidor)',
        type: 'AC' as const,
        lengthM: acLength > 0 ? acLength : 15,
        conduitType: conduitType as ConduitType,
        insulationType: 'THHW-LS' as InsulationType,
        conductorMaterial: 'Cu' as ConductorMaterial,
        temperatureRating: '90C' as TempRating,
        bends90: 2,
        bends45: 1,
      },
    ],
    confidenceScore: 1.0,
    confidenceBreakdown: {},
    extractedFieldsSummary: [
      `Cliente: ${clientName}`,
      `Generador: ${totalMods} módulos de ${powerW} Wp (${totalDckWp} kWp)`,
      `Inversor: ${invRaw || 'Inversor'} (${invKw} kW @ ${invVoltage}V ${gridConn})`,
      `Rutas: DC ${dcLength}m | AC ${acLength}m`,
      `Protección AC: ${acBreaker}`,
    ],
  };

  return ServiceOrderExtractionSchema.parse(structuredData);
}
