import { z } from 'zod';

export type ElectricalSystemType =
  | 'DC-2W'
  | '1F-2H-127V'
  | '1F-2H-220V'
  | '2F-2H-220V'
  | '2F-3H-120/240V'
  | '3F-3H-220V'
  | '3F-4H-220/127V'
  | '3F-3H-480V'
  | '3F-4H-480/277V';

export type InverterArchitecture = 'microinverter' | 'string' | 'central' | 'hybrid_ess';

export type ConductorMaterial = 'Cu' | 'Al';
export type InsulationType = 'THHW-LS' | 'THHN/THWN-2' | 'PV-Wire' | 'XHHW-2' | 'RHW-2';
export type TempRating = '60C' | '75C' | '90C';
export type ConduitType = 'EMT' | 'PVC-40' | 'PVC-80' | 'IMC' | 'LiquidTight';

export interface ConductorLineDetail {
  role: 'L1' | 'L2' | 'L3' | 'N' | 'PE' | 'DC+' | 'DC-' | 'GND_DC';
  color: string;
  isCCC: boolean; // Current Carrying Conductor
  name: string;
}

export interface RouteGeometry {
  bends90: number;
  bends45: number;
  cabinetEntries: number;
  cabinetExits: number;
  supportSpacingM: number;
  isOutdoor: boolean;
}

export interface RouteConfig {
  id: string;
  name: string;
  type: 'DC' | 'AC';
  origin: string;
  destination: string;
  lengthM: number;
  systemType: ElectricalSystemType;
  voltageV: number;
  operatingCurrentA: number;
  maxDesignCurrentA: number;
  currentBasisDescription: string;
  powerFactor: number;
  material: ConductorMaterial;
  insulation: InsulationType;
  tempRating: TempRating;
  ambientTempC: number;
  rooftopAdderC: number;
  conduitType: ConduitType;
  isNipple: boolean; // <= 600 mm (60% fill allowed)
  geometry: RouteGeometry;
  customPhysicalConductors?: ConductorLineDetail[];
}

export interface RouteCalculations {
  routeId: string;
  routeName: string;
  type: 'DC' | 'AC';
  // Conductors
  physicalConductors: ConductorLineDetail[];
  physicalCount: number;
  cccCount: number;
  // Current & Deratings
  designCurrentA: number;
  currentBasis: string;
  effectiveTempC: number;
  tempCorrectionFactor: number;
  groupingCorrectionFactor: number;
  totalDeratingFactor: number;
  requiredBaseAmpacityA: number;
  // Selected Conductor
  selectedGauge: string;
  conductorAreaMm2: number;
  conductorOuterDiameterMm: number;
  baseConductorAmpacityA: number;
  correctedConductorAmpacityA: number;
  ampacityCompliance: boolean;
  // Voltage Drop
  resistanceOhmsPerKm: number;
  reactanceOhmsPerKm: number;
  voltageDropV: number;
  voltageDropPercent: number;
  voltageDropCompliance: boolean; // <= 3%
  voltageDropRecalculatedSteps: number; // How many gauge ups were needed for <= 3%
  // Critical 3% Voltage Drop Distance Threshold
  thresholdLengthFor3PercentM?: number;
  // Conduit & Fill
  totalConductorsAreaMm2: number;
  maxFillPercentAllowed: number;
  selectedConduitTradeSize: string;
  selectedConduitMetricMm: number;
  conduitTotalAreaMm2: number;
  actualConduitFillPercent: number;
  conduitFillCompliance: boolean;
  // Accessories & Protections derived
  derivedAccessories: DerivedAccessory[];
  derivedProtections: DerivedProtection[];
  // Traceability & Engineering Log
  trace: RouteTrace;
}

export interface RouteTrace {
  currentEquation: string;
  deratingEquation: string;
  voltageDropEquation: string;
  conduitFillEquation: string;
  steps: string[];
}

export interface DerivedAccessory {
  id: string;
  category: 'Canalización' | 'Accesorio' | 'Fijación' | 'Conector' | 'Gabinete';
  item: string;
  spec: string;
  qty: number;
  unit: string;
  reason: string;
  routeId: string;
}

export interface DerivedProtection {
  id: string;
  category: 'Protección';
  item: string;
  spec: string;
  ratingA: number;
  poles: string;
  type: 'ITM-AC' | 'ITM-DC' | 'FUSE-DC' | 'SPD-AC' | 'SPD-DC' | 'DESCONECTADOR';
  qty: number;
  unit: string;
  reason: string;
  routeId: string;
}

export interface BOMItem {
  id: string;
  category: 'Conductor' | 'Tubería' | 'Protección' | 'Accesorio' | 'Gabinete' | 'Equipo';
  element: string;
  specification: string;
  gauge?: string;
  lengthM?: number;
  quantity: number;
  unit: string;
  location: string;
  routeIds: string[];
  routeNames: string[];
  observations: string;
  traceability: {
    originRoutes: string[];
    currentCalculatedA: number;
    voltageDropPercent: number;
    conduitFillPercent?: number;
    engineeringJustification: string;
  };
}

export interface PVModuleConfig {
  model: string;
  manufacturer: string;
  powerW: number;
  vocV: number; // Unit Module Voc (e.g. 52.8 V)
  iscA: number;
  vmpV: number; // Unit Module Vmp (e.g. 44.6 V)
  impA: number;
  tempCoeffVocPercentPerC?: number; // e.g. -0.28%/°C
  totalModules: number;
  modulesPerString: number;
  numberOfStrings: number;
}

export interface InverterConfig {
  model: string;
  manufacturer: string;
  architecture: InverterArchitecture;
  ratedPowerKw: number;
  maxOutputCurrentA: number;
  nominalAcVoltageV: number;
  systemType: ElectricalSystemType;
  efficiencyPercent: number;
  numberOfUnits: number;
  mpptCount: number;
  maxDcVoltageV: number;
  maxDcCurrentPerMpptA: number;
}

export interface BatteryConfig {
  enabled: boolean;
  model: string;
  manufacturer: string;
  chemistry: string;
  capacityKwh: number;
  nominalVoltageV: number;
  maxContinuousDischargeCurrentA: number;
  maxChargeCurrentA: number;
  cRate: number;
  unitsCount: number;
}

export interface CabinetConfig {
  id: string;
  name: string;
  type: 'Gabinete AC' | 'Gabinete DC / Combiner Box' | 'Tablero AC Principal' | 'Tablero Subdistribución' | 'Caja de Paso';
  nemaRating: string;
  location: string;
  circuitsCount: number;
}

export interface InstallationModel {
  clientName: string;
  projectName: string;
  installationId: string;
  location: string;
  ambientMaxTempC: number;
  ambientMinTempC: number;
  // Photovoltaic generator
  pv: PVModuleConfig;
  // Inverters
  inverter: InverterConfig;
  // Storage
  battery: BatteryConfig;
  // Enclosures
  cabinets: CabinetConfig[];
  // Electric Routes
  routes: RouteConfig[];
}

export interface ValidationCheckItem {
  id: string;
  title: string;
  rule: string;
  passed: boolean;
  status: 'ok' | 'error' | 'warning' | 'missing_data';
  detail: string;
  affectedElement?: string;
  proposedFix?: string;
}

export interface ProjectModelResult {
  model: InstallationModel;
  // Calculated DC metrics
  dc: {
    totalPowerW: number;
    unitVocV: number;
    unitVmpV: number;
    stringVocV: number;
    stringVmpV: number;
    stringVocColdV: number; // Corrected for T_min (e.g. 5°C) according to NEC 690.7
    coldTempCorrectionFactor: number;
    invMaxDcVoltage: number;
    dcVoltageCompliance: boolean;
    stringIscA: number;
    stringImpA: number;
    arrayIscA: number;
    arrayImpA: number;
    configSeriesParallel: string;
    missingData: string[];
  };
  // Calculated AC metrics
  ac: {
    totalAcPowerKw: number;
    nominalAcVoltageV: number;
    totalAcCurrentA: number;
    maxAcCurrentWithContinuousFactorA: number; // 1.25x
    systemType: ElectricalSystemType;
  };
  // Calculated route outputs
  routeResults: RouteCalculations[];
  // Final Consolidated BOM
  bom: BOMItem[];
  // Validation checklist
  validations: ValidationCheckItem[];
  // Missing data or critical errors
  errors: string[];
  missingDataList: string[];
}
