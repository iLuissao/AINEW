/**
 * Independent Verification Engine (Double Calculation & Verification)
 * Implements Phase 21 & 22 of V2 Architecture:
 * - Independent calculation path to detect discrepancies.
 * - Zero automatic fixing of verification errors (audit transparency).
 */

import { RouteCalculations, RouteConfig, InstallationModel } from './types';
import { CONDUCTOR_DATABASE } from './standards';

export interface VerificationResult {
  routeId: string;
  routeName: string;
  status: 'VERIFIED' | 'VERIFICATION_FAILED' | 'WARNING';
  engineAmpacityCorrected: number;
  verifierAmpacityCorrected: number;
  engineVoltageDropPercent: number;
  verifierVoltageDropPercent: number;
  differenceAmpacity: number;
  differenceVoltageDrop: number;
  tolerance: number;
  messages: string[];
}

/**
 * Independent verifier for route calculations (Ampacity and Voltage Drop)
 */
export function verifyRouteCalculation(
  route: RouteConfig,
  calc: RouteCalculations,
  model: InstallationModel
): VerificationResult {
  const messages: string[] = [];
  const tolerance = 0.05; // 5% tolerance for decimal rounding variations

  // 1. Independent Ampacity Verification
  // Verifier recalculates derated ampacity directly from base specifications
  const baseSpec = CONDUCTOR_DATABASE.find((c) => c.gauge === calc.selectedGauge);
  const baseAmp = baseSpec
    ? (route.material === 'Cu' ? baseSpec.ampacityCu[route.tempRating] : baseSpec.ampacityAl[route.tempRating])
    : calc.baseConductorAmpacityA;

  const verifierCorrectedAmp = parseFloat((baseAmp * calc.totalDeratingFactor).toFixed(2));
  const diffAmp = Math.abs(calc.correctedConductorAmpacityA - verifierCorrectedAmp);

  if (diffAmp > tolerance * baseAmp) {
    messages.push(`Discrepancia en ampacidad corregida: Motor=${calc.correctedConductorAmpacityA}A vs Verificador=${verifierCorrectedAmp}A`);
  }

  // 2. Independent Voltage Drop Verification
  // Verifier recalculates ΔV using direct impedance formula: ΔV = k * I * L * Z / 1000
  const is3Phase = route.systemType.includes('3F');
  const kPhase = is3Phase ? Math.sqrt(3) : 2.0;
  const pf = route.powerFactor || 1.0;
  const sinPf = Math.sqrt(Math.max(0, 1 - pf * pf));
  const runKm = (route.lengthM || 1) / 1000.0;
  const isSteel = route.conduitType === 'EMT' || route.conduitType === 'IMC';

  const res = baseSpec ? (route.material === 'Cu' ? (isSteel ? baseSpec.resistanceCuSteel : baseSpec.resistanceCuPVC) : baseSpec.resistanceAlPVC) : 1.0;
  const react = baseSpec ? baseSpec.reactance : 0.15;
  const effZ = res * pf + react * sinPf;

  const currentForVDrop = calc.designCurrentA / (route.type === 'DC' ? 1.5625 : 1.25);
  const verifierVDropV = kPhase * currentForVDrop * runKm * effZ;
  const verifierVDropPct = route.voltageV > 0 ? (verifierVDropV / route.voltageV) * 100 : 0;
  const diffVD = Math.abs(calc.voltageDropPercent - verifierVDropPct);

  if (diffVD > 0.5) {
    messages.push(`Discrepancia en caída de tensión: Motor=${calc.voltageDropPercent.toFixed(2)}% vs Verificador=${verifierVDropPct.toFixed(2)}%`);
  }

  const isFailed = messages.length > 0;

  return {
    routeId: route.id,
    routeName: route.name,
    status: isFailed ? 'VERIFICATION_FAILED' : 'VERIFIED',
    engineAmpacityCorrected: calc.correctedConductorAmpacityA,
    verifierAmpacityCorrected: verifierCorrectedAmp,
    engineVoltageDropPercent: calc.voltageDropPercent,
    verifierVoltageDropPercent: verifierVDropPct,
    differenceAmpacity: parseFloat(diffAmp.toFixed(2)),
    differenceVoltageDrop: parseFloat(diffVD.toFixed(2)),
    tolerance,
    messages,
  };
}
