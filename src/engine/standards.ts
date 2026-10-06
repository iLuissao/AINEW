/**
 * Electrical Engineering Standards & Reference Tables
 * Compliant with NEC 2020/2023 and NOM-001-SEDE-2012 (Art. 310, 690, 705, 706, Chap 9)
 */

export interface ConductorSpec {
  gauge: string; // e.g. "14 AWG", "12 AWG", ..., "500 kcmil"
  areaMm2: number; // Cross-sectional area of conductor metal (mm²)
  outerDiameterMm: {
    'THHW-LS': number;
    'THHN/THWN-2': number;
    'RHW-2': number;
    'PV-Wire': number;
    'XHHW-2': number;
  };
  ampacityCu: {
    '60C': number;
    '75C': number;
    '90C': number;
  };
  ampacityAl: {
    '60C': number;
    '75C': number;
    '90C': number;
  };
  // Resistance per km at 75°C (Ohms/km) in non-metallic or PVC conduit
  resistanceCuPVC: number; 
  // Resistance per km at 75°C (Ohms/km) in Steel / EMT conduit
  resistanceCuSteel: number;
  // Resistance for Aluminum (Ohms/km) in PVC conduit
  resistanceAlPVC: number;
  // Reactance per km (Ohms/km)
  reactance: number;
}

export const CONDUCTOR_DATABASE: ConductorSpec[] = [
  {
    gauge: '14 AWG',
    areaMm2: 2.08,
    outerDiameterMm: {
      'THHW-LS': 3.5,
      'THHN/THWN-2': 2.82,
      'RHW-2': 4.1,
      'PV-Wire': 5.8,
      'XHHW-2': 3.4,
    },
    ampacityCu: { '60C': 15, '75C': 20, '90C': 25 },
    ampacityAl: { '60C': 0, '75C': 0, '90C': 0 },
    resistanceCuPVC: 10.17,
    resistanceCuSteel: 10.17,
    resistanceAlPVC: 16.7,
    reactance: 0.19,
  },
  {
    gauge: '12 AWG',
    areaMm2: 3.31,
    outerDiameterMm: {
      'THHW-LS': 4.0,
      'THHN/THWN-2': 3.3,
      'RHW-2': 4.6,
      'PV-Wire': 6.2,
      'XHHW-2': 3.86,
    },
    ampacityCu: { '60C': 20, '75C': 25, '90C': 30 },
    ampacityAl: { '60C': 15, '75C': 20, '90C': 25 },
    resistanceCuPVC: 6.56,
    resistanceCuSteel: 6.56,
    resistanceAlPVC: 10.8,
    reactance: 0.177,
  },
  {
    gauge: '10 AWG',
    areaMm2: 5.26,
    outerDiameterMm: {
      'THHW-LS': 4.7,
      'THHN/THWN-2': 4.17,
      'RHW-2': 5.2,
      'PV-Wire': 6.8,
      'XHHW-2': 4.47,
    },
    ampacityCu: { '60C': 30, '75C': 35, '90C': 40 },
    ampacityAl: { '60C': 25, '75C': 30, '90C': 35 },
    resistanceCuPVC: 3.97,
    resistanceCuSteel: 3.97,
    resistanceAlPVC: 6.56,
    reactance: 0.164,
  },
  {
    gauge: '8 AWG',
    areaMm2: 8.37,
    outerDiameterMm: {
      'THHW-LS': 6.2,
      'THHN/THWN-2': 5.49,
      'RHW-2': 6.8,
      'PV-Wire': 8.5,
      'XHHW-2': 5.99,
    },
    ampacityCu: { '60C': 40, '75C': 50, '90C': 55 },
    ampacityAl: { '60C': 30, '75C': 40, '90C': 45 },
    resistanceCuPVC: 2.56,
    resistanceCuSteel: 2.56,
    resistanceAlPVC: 4.23,
    reactance: 0.171,
  },
  {
    gauge: '6 AWG',
    areaMm2: 13.3,
    outerDiameterMm: {
      'THHW-LS': 7.3,
      'THHN/THWN-2': 6.45,
      'RHW-2': 7.9,
      'PV-Wire': 9.8,
      'XHHW-2': 6.96,
    },
    ampacityCu: { '60C': 55, '75C': 65, '90C': 75 },
    ampacityAl: { '60C': 40, '75C': 50, '90C': 60 },
    resistanceCuPVC: 1.61,
    resistanceCuSteel: 1.64,
    resistanceAlPVC: 2.66,
    reactance: 0.167,
  },
  {
    gauge: '4 AWG',
    areaMm2: 21.15,
    outerDiameterMm: {
      'THHW-LS': 8.7,
      'THHN/THWN-2': 8.23,
      'RHW-2': 9.4,
      'PV-Wire': 11.2,
      'XHHW-2': 8.23,
    },
    ampacityCu: { '60C': 70, '75C': 85, '90C': 95 },
    ampacityAl: { '60C': 55, '75C': 65, '90C': 75 },
    resistanceCuPVC: 1.02,
    resistanceCuSteel: 1.05,
    resistanceAlPVC: 1.67,
    reactance: 0.157,
  },
  {
    gauge: '2 AWG',
    areaMm2: 33.62,
    outerDiameterMm: {
      'THHW-LS': 10.4,
      'THHN/THWN-2': 9.75,
      'RHW-2': 11.0,
      'PV-Wire': 13.0,
      'XHHW-2': 9.75,
    },
    ampacityCu: { '60C': 95, '75C': 115, '90C': 130 },
    ampacityAl: { '60C': 75, '75C': 90, '90C': 100 },
    resistanceCuPVC: 0.623,
    resistanceCuSteel: 0.656,
    resistanceAlPVC: 1.05,
    reactance: 0.148,
  },
  {
    gauge: '1/0 AWG',
    areaMm2: 53.49,
    outerDiameterMm: {
      'THHW-LS': 12.8,
      'THHN/THWN-2': 11.99,
      'RHW-2': 13.5,
      'PV-Wire': 15.5,
      'XHHW-2': 11.99,
    },
    ampacityCu: { '60C': 125, '75C': 150, '90C': 170 },
    ampacityAl: { '60C': 100, '75C': 120, '90C': 135 },
    resistanceCuPVC: 0.394,
    resistanceCuSteel: 0.427,
    resistanceAlPVC: 0.656,
    reactance: 0.144,
  },
  {
    gauge: '2/0 AWG',
    areaMm2: 67.43,
    outerDiameterMm: {
      'THHW-LS': 13.9,
      'THHN/THWN-2': 13.11,
      'RHW-2': 14.8,
      'PV-Wire': 17.0,
      'XHHW-2': 13.11,
    },
    ampacityCu: { '60C': 145, '75C': 175, '90C': 195 },
    ampacityAl: { '60C': 115, '75C': 135, '90C': 150 },
    resistanceCuPVC: 0.328,
    resistanceCuSteel: 0.361,
    resistanceAlPVC: 0.525,
    reactance: 0.141,
  },
  {
    gauge: '3/0 AWG',
    areaMm2: 85.01,
    outerDiameterMm: {
      'THHW-LS': 15.2,
      'THHN/THWN-2': 14.33,
      'RHW-2': 16.2,
      'PV-Wire': 18.8,
      'XHHW-2': 14.33,
    },
    ampacityCu: { '60C': 165, '75C': 200, '90C': 225 },
    ampacityAl: { '60C': 130, '75C': 155, '90C': 175 },
    resistanceCuPVC: 0.253,
    resistanceCuSteel: 0.285,
    resistanceAlPVC: 0.427,
    reactance: 0.138,
  },
  {
    gauge: '4/0 AWG',
    areaMm2: 107.2,
    outerDiameterMm: {
      'THHW-LS': 16.7,
      'THHN/THWN-2': 15.85,
      'RHW-2': 17.8,
      'PV-Wire': 20.5,
      'XHHW-2': 15.85,
    },
    ampacityCu: { '60C': 195, '75C': 230, '90C': 260 },
    ampacityAl: { '60C': 150, '75C': 180, '90C': 205 },
    resistanceCuPVC: 0.203,
    resistanceCuSteel: 0.236,
    resistanceAlPVC: 0.328,
    reactance: 0.135,
  },
  {
    gauge: '250 kcmil',
    areaMm2: 126.7,
    outerDiameterMm: {
      'THHW-LS': 18.5,
      'THHN/THWN-2': 17.91,
      'RHW-2': 20.1,
      'PV-Wire': 22.8,
      'XHHW-2': 17.91,
    },
    ampacityCu: { '60C': 215, '75C': 255, '90C': 290 },
    ampacityAl: { '60C': 170, '75C': 205, '90C': 230 },
    resistanceCuPVC: 0.171,
    resistanceCuSteel: 0.203,
    resistanceAlPVC: 0.282,
    reactance: 0.135,
  },
  {
    gauge: '300 kcmil',
    areaMm2: 152.0,
    outerDiameterMm: {
      'THHW-LS': 20.0,
      'THHN/THWN-2': 19.35,
      'RHW-2': 21.6,
      'PV-Wire': 24.6,
      'XHHW-2': 19.35,
    },
    ampacityCu: { '60C': 240, '75C': 285, '90C': 320 },
    ampacityAl: { '60C': 190, '75C': 230, '90C': 255 },
    resistanceCuPVC: 0.144,
    resistanceCuSteel: 0.177,
    resistanceAlPVC: 0.236,
    reactance: 0.131,
  },
  {
    gauge: '350 kcmil',
    areaMm2: 177.3,
    outerDiameterMm: {
      'THHW-LS': 21.3,
      'THHN/THWN-2': 20.65,
      'RHW-2': 23.0,
      'PV-Wire': 26.2,
      'XHHW-2': 20.65,
    },
    ampacityCu: { '60C': 260, '75C': 310, '90C': 350 },
    ampacityAl: { '60C': 210, '75C': 250, '90C': 280 },
    resistanceCuPVC: 0.125,
    resistanceCuSteel: 0.157,
    resistanceAlPVC: 0.203,
    reactance: 0.131,
  },
  {
    gauge: '500 kcmil',
    areaMm2: 253.4,
    outerDiameterMm: {
      'THHW-LS': 24.8,
      'THHN/THWN-2': 23.95,
      'RHW-2': 26.5,
      'PV-Wire': 30.5,
      'XHHW-2': 23.95,
    },
    ampacityCu: { '60C': 320, '75C': 380, '90C': 430 },
    ampacityAl: { '60C': 260, '75C': 310, '90C': 350 },
    resistanceCuPVC: 0.088,
    resistanceCuSteel: 0.121,
    resistanceAlPVC: 0.144,
    reactance: 0.128,
  },
];

export interface ConduitSpec {
  tradeSizeInch: string;
  metricSizeMm: number;
  innerDiameterMm: {
    EMT: number;
    'PVC-40': number;
    'PVC-80': number;
    IMC: number;
    LiquidTight: number;
  };
  totalAreaMm2: {
    EMT: number;
    'PVC-40': number;
    'PVC-80': number;
    IMC: number;
    LiquidTight: number;
  };
}

export const CONDUIT_DATABASE: ConduitSpec[] = [
  {
    tradeSizeInch: '1/2"',
    metricSizeMm: 16,
    innerDiameterMm: { EMT: 15.8, 'PVC-40': 15.8, 'PVC-80': 13.9, IMC: 16.8, LiquidTight: 16.1 },
    totalAreaMm2: { EMT: 196, 'PVC-40': 196, 'PVC-80': 152, IMC: 222, LiquidTight: 204 },
  },
  {
    tradeSizeInch: '3/4"',
    metricSizeMm: 21,
    innerDiameterMm: { EMT: 20.9, 'PVC-40': 20.9, 'PVC-80': 18.9, IMC: 21.9, LiquidTight: 21.1 },
    totalAreaMm2: { EMT: 343, 'PVC-40': 343, 'PVC-80': 281, IMC: 377, LiquidTight: 350 },
  },
  {
    tradeSizeInch: '1"',
    metricSizeMm: 27,
    innerDiameterMm: { EMT: 26.6, 'PVC-40': 26.6, 'PVC-80': 24.3, IMC: 28.1, LiquidTight: 27.0 },
    totalAreaMm2: { EMT: 556, 'PVC-40': 556, 'PVC-80': 464, IMC: 620, LiquidTight: 573 },
  },
  {
    tradeSizeInch: '1-1/4"',
    metricSizeMm: 35,
    innerDiameterMm: { EMT: 35.1, 'PVC-40': 35.1, 'PVC-80': 32.5, IMC: 36.8, LiquidTight: 35.4 },
    totalAreaMm2: { EMT: 968, 'PVC-40': 968, 'PVC-80': 830, IMC: 1064, LiquidTight: 984 },
  },
  {
    tradeSizeInch: '1-1/2"',
    metricSizeMm: 41,
    innerDiameterMm: { EMT: 40.9, 'PVC-40': 40.9, 'PVC-80': 38.1, IMC: 42.7, LiquidTight: 40.3 },
    totalAreaMm2: { EMT: 1314, 'PVC-40': 1314, 'PVC-80': 1140, IMC: 1432, LiquidTight: 1276 },
  },
  {
    tradeSizeInch: '2"',
    metricSizeMm: 53,
    innerDiameterMm: { EMT: 52.5, 'PVC-40': 52.5, 'PVC-80': 49.3, IMC: 54.4, LiquidTight: 51.6 },
    totalAreaMm2: { EMT: 2165, 'PVC-40': 2165, 'PVC-80': 1909, IMC: 2324, LiquidTight: 2091 },
  },
  {
    tradeSizeInch: '2-1/2"',
    metricSizeMm: 63,
    innerDiameterMm: { EMT: 69.4, 'PVC-40': 62.7, 'PVC-80': 59.0, IMC: 65.0, LiquidTight: 63.3 },
    totalAreaMm2: { EMT: 3783, 'PVC-40': 3088, 'PVC-80': 2734, IMC: 3318, LiquidTight: 3147 },
  },
  {
    tradeSizeInch: '3"',
    metricSizeMm: 78,
    innerDiameterMm: { EMT: 85.2, 'PVC-40': 77.9, 'PVC-80': 73.7, IMC: 80.7, LiquidTight: 78.0 },
    totalAreaMm2: { EMT: 5702, 'PVC-40': 4766, 'PVC-80': 4266, IMC: 5115, LiquidTight: 4778 },
  },
  {
    tradeSizeInch: '3-1/2"',
    metricSizeMm: 91,
    innerDiameterMm: { EMT: 97.4, 'PVC-40': 90.1, 'PVC-80': 85.4, IMC: 93.3, LiquidTight: 89.0 },
    totalAreaMm2: { EMT: 7451, 'PVC-40': 6376, 'PVC-80': 5728, IMC: 6837, LiquidTight: 6221 },
  },
  {
    tradeSizeInch: '4"',
    metricSizeMm: 103,
    innerDiameterMm: { EMT: 110.1, 'PVC-40': 102.3, 'PVC-80': 97.2, IMC: 105.4, LiquidTight: 102.0 },
    totalAreaMm2: { EMT: 9521, 'PVC-40': 8219, 'PVC-80': 7420, IMC: 8725, LiquidTight: 8171 },
  },
];

/**
 * Temperature Correction Factors (NEC Table 310.15(B)(1) / NOM-001 Tabla 310-15(b)(2)(a))
 * Based on 30°C reference
 */
export function getTemperatureCorrectionFactor(ambientTempC: number, rating: '60C' | '75C' | '90C'): number {
  if (ambientTempC <= 10) return rating === '60C' ? 1.29 : rating === '75C' ? 1.20 : 1.15;
  if (ambientTempC <= 15) return rating === '60C' ? 1.22 : rating === '75C' ? 1.15 : 1.12;
  if (ambientTempC <= 20) return rating === '60C' ? 1.15 : rating === '75C' ? 1.11 : 1.08;
  if (ambientTempC <= 25) return rating === '60C' ? 1.08 : rating === '75C' ? 1.05 : 1.04;
  if (ambientTempC <= 30) return 1.00;
  if (ambientTempC <= 35) return rating === '60C' ? 0.91 : rating === '75C' ? 0.94 : 0.96;
  if (ambientTempC <= 40) return rating === '60C' ? 0.82 : rating === '75C' ? 0.88 : 0.91;
  if (ambientTempC <= 45) return rating === '60C' ? 0.71 : rating === '75C' ? 0.82 : 0.87;
  if (ambientTempC <= 50) return rating === '60C' ? 0.58 : rating === '75C' ? 0.75 : 0.82;
  if (ambientTempC <= 55) return rating === '60C' ? 0.41 : rating === '75C' ? 0.67 : 0.76;
  if (ambientTempC <= 60) return rating === '60C' ? 0.00 : rating === '75C' ? 0.58 : 0.71;
  if (ambientTempC <= 65) return rating === '60C' ? 0.00 : rating === '75C' ? 0.47 : 0.65;
  if (ambientTempC <= 70) return rating === '60C' ? 0.00 : rating === '75C' ? 0.33 : 0.58;
  if (ambientTempC <= 75) return rating === '60C' ? 0.00 : rating === '75C' ? 0.00 : 0.50;
  if (ambientTempC <= 80) return rating === '60C' ? 0.00 : rating === '75C' ? 0.00 : 0.41;
  return 0.30;
}

/**
 * Adjustment Factors for More than 3 Current-Carrying Conductors
 * NEC Table 310.15(C)(1) / NOM-001 Tabla 310-15(b)(3)(a)
 */
export function getGroupingCorrectionFactor(cccCount: number): number {
  if (cccCount <= 3) return 1.00;
  if (cccCount <= 6) return 0.80;
  if (cccCount <= 9) return 0.70;
  if (cccCount <= 20) return 0.50;
  if (cccCount <= 30) return 0.45;
  if (cccCount <= 40) return 0.40;
  return 0.35;
}

/**
 * Standard Commercial OCPD Breakers / Fuses
 */
export const STANDARD_OCPD_SIZES = [
  10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100,
  110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 500, 600, 800, 1000, 1200
];

export function selectStandardOCPD(requiredCurrent: number): number {
  for (const size of STANDARD_OCPD_SIZES) {
    if (size >= requiredCurrent) return size;
  }
  return Math.ceil(requiredCurrent / 100) * 100;
}
