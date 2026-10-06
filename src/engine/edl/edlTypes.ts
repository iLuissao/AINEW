/**
 * EDL (Electrical Diagram Language) Core Types & Schema
 * Deterministic semantic representation of photovoltaic, storage and electrical installations.
 */

export type DomainType = 'AC' | 'DC' | 'GROUND' | 'HYBRID';
export type PortDirection = 'INPUT' | 'OUTPUT' | 'BIDIRECTIONAL';
export type DetailLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ElectricalElementType =
  | 'PV_MODULE'
  | 'PV_STRING'
  | 'PV_ARRAY'
  | 'FUSE'
  | 'DC_DISCONNECT'
  | 'SPD_DC'
  | 'SPD_AC'
  | 'INVERTER'
  | 'MICROINVERTER'
  | 'AC_COMBINER'
  | 'AC_BREAKER'
  | 'MAIN_BREAKER'
  | 'DISCONNECT'
  | 'METER'
  | 'GRID'
  | 'LOAD'
  | 'PANEL'
  | 'TRANSFORMER'
  | 'GENERATOR'
  | 'BATTERY'
  | 'CHARGE_CONTROLLER'
  | 'EV_CHARGER'
  | 'GROUND'
  | 'GROUND_BAR'
  | 'GROUND_ELECTRODE'
  | 'INTERCONNECTION_POINT'
  | 'CONDUCTOR'
  | 'CONDUIT'
  | 'CABINET'
  | 'LABEL'
  | 'ANNOTATION';

export interface ElectricalPort {
  id: string;
  name: string;
  domain: DomainType;
  direction: PortDirection;
  nominalVoltageV?: number;
  maxCurrentA?: number;
  phase?: 'L1' | 'L2' | 'L3' | 'N' | 'PE' | 'DC+' | 'DC-';
  polarity?: '+' | '-';
  label?: string;
}

export interface ElectricalNode {
  id: string;
  type: ElectricalElementType;
  name: string;
  functionDesc?: string;
  manufacturer?: string;
  model?: string;
  poles?: number;
  voltageV?: number;
  currentA?: number;
  powerW?: number;
  domain: DomainType;
  phasesCount?: number;
  level: number; // 0: Gen, 1: DC Prot, 2: Conv, 3: AC Prot, 4: Interconn, 5: Dist/Load, 6: Meter, 7: Grid
  ports: Record<string, ElectricalPort>;
  location?: string;
  tags?: string[];
  notes?: string;
  subComponentsCount?: number; // e.g. 9 modules in a string
  customParams?: Record<string, any>;
}

export interface ConductorSpec {
  system: 'AC' | 'DC' | 'GROUND';
  conductorsCount: number;
  gauge: string; // e.g. "10 AWG", "6 AWG", "1x6mm²"
  material: 'Cu' | 'Al';
  insulation: string; // "PV-Wire", "THHW-LS", "RHW-2", "Desnudo"
  lengthM: number;
  conduitTradeSize?: string; // "21mm (3/4\")", "25mm (1\")"
  conduitType?: string; // "PG", "EMT", "PVC"
  voltageDropPercent?: number;
  circuitTag?: number | string;
}

export interface ElectricalConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  domain: DomainType;
  conductor?: ConductorSpec;
  notes?: string;
}

export interface ElectricalModel {
  systemId: string;
  systemName: string;
  systemType: 'GRID_TIED' | 'HYBRID_STORAGE' | 'MICROINVERTER' | 'OFF_GRID' | 'COMMERCIAL_MULTI';
  standard: 'NOM-001-SEDE-2012' | 'NEC-2023';
  metadata: {
    clientName?: string;
    projectAddress?: string;
    rpu?: string;
    drafter?: string;
    engineer?: string;
    date?: string;
    notes?: string;
  };
  nodes: Record<string, ElectricalNode>;
  connections: ElectricalConnection[];
}

export interface ValidationIssue {
  id: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  nodeId?: string;
  connectionId?: string;
  message: string;
  recommendation?: string;
}

export interface ValidationReport {
  isValid: boolean;
  errorsCount: number;
  warningsCount: number;
  issues: ValidationIssue[];
  metrics: {
    totalDcPowerW: number;
    totalAcPowerKw: number;
    maxDcVoltageV: number;
    maxAcCurrentA: number;
    nodesCount: number;
    connectionsCount: number;
  };
}

export interface LayoutPortAnchor {
  portId: string;
  x: number;
  y: number;
  direction: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
}

export interface LayoutNode {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  ports: Record<string, LayoutPortAnchor>;
  subElements?: {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

export interface LayoutPathPoint {
  x: number;
  y: number;
}

export interface LayoutWire {
  connectionId: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  domain: DomainType;
  points: LayoutPathPoint[];
  conductor?: ConductorSpec;
  tagPosition?: { x: number; y: number; tag: string | number };
}

export interface LayoutGraph {
  viewBox: { width: number; height: number };
  nodes: LayoutNode[];
  wires: LayoutWire[];
  groundingNetwork: {
    busLine: { x1: number; y1: number; x2: number; y2: number };
    taps: { x1: number; y1: number; x2: number; y2: number; nodeId: string }[];
    electrode: { x: number; y: number };
  };
  annotations: {
    x: number;
    y: number;
    text: string;
    category: 'CIRCUIT' | 'POINT_OF_INTERCONNECTION' | 'NOTE';
  }[];
  titleBlock: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
