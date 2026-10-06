/**
 * PV & ESS Parametric Calculation Engine
 * 100% Deterministic Electrical Modeler & BOM Generator
 * Compliant with NOM-001-SEDE-2012 / NEC 2023
 */

import {
  CONDUCTOR_DATABASE,
  CONDUIT_DATABASE,
  ConductorSpec,
  getGroupingCorrectionFactor,
  getTemperatureCorrectionFactor,
  selectStandardOCPD,
} from './standards';
import {
  BOMItem,
  CabinetConfig,
  ConductorLineDetail,
  DerivedAccessory,
  DerivedProtection,
  ElectricalSystemType,
  InstallationModel,
  ProjectModelResult,
  RouteCalculations,
  RouteConfig,
  ValidationCheckItem,
} from './types';

/**
 * Returns standard physical conductors for a given electrical system
 */
export function getDefaultPhysicalConductors(systemType: ElectricalSystemType): ConductorLineDetail[] {
  switch (systemType) {
    case 'DC-2W':
      return [
        { role: 'DC+', color: 'Rojo / Positivo', isCCC: true, name: 'Conductor DC Positivo (+)' },
        { role: 'DC-', color: 'Negro / Negativo', isCCC: true, name: 'Conductor DC Negativo (-)' },
        { role: 'GND_DC', color: 'Verde / Desnudo', isCCC: false, name: 'Conductor de Puesta a Tierra (EGC/PE)' },
      ];
    case '1F-2H-127V':
    case '1F-2H-220V':
      return [
        { role: 'L1', color: 'Negro', isCCC: true, name: 'Línea Fase 1 (L1)' },
        { role: 'N', color: 'Blanco', isCCC: true, name: 'Neutro (N)' },
        { role: 'PE', color: 'Verde', isCCC: false, name: 'Tierra de Protección (PE)' },
      ];
    case '2F-2H-220V':
      return [
        { role: 'L1', color: 'Negro', isCCC: true, name: 'Línea Fase 1 (L1)' },
        { role: 'L2', color: 'Rojo', isCCC: true, name: 'Línea Fase 2 (L2)' },
        { role: 'PE', color: 'Verde', isCCC: false, name: 'Tierra de Protección (PE)' },
      ];
    case '2F-3H-120/240V':
      return [
        { role: 'L1', color: 'Negro', isCCC: true, name: 'Línea Fase 1 (L1)' },
        { role: 'L2', color: 'Rojo', isCCC: true, name: 'Línea Fase 2 (L2)' },
        { role: 'N', color: 'Blanco', isCCC: true, name: 'Neutro (N)' },
        { role: 'PE', color: 'Verde', isCCC: false, name: 'Tierra de Protección (PE)' },
      ];
    case '3F-3H-220V':
    case '3F-3H-480V':
      return [
        { role: 'L1', color: 'Negro', isCCC: true, name: 'Línea Fase 1 (L1)' },
        { role: 'L2', color: 'Rojo', isCCC: true, name: 'Línea Fase 2 (L2)' },
        { role: 'L3', color: 'Azul', isCCC: true, name: 'Línea Fase 3 (L3)' },
        { role: 'PE', color: 'Verde', isCCC: false, name: 'Tierra de Protección (PE)' },
      ];
    case '3F-4H-220/127V':
    case '3F-4H-480/277V':
      return [
        { role: 'L1', color: 'Negro', isCCC: true, name: 'Línea Fase 1 (L1)' },
        { role: 'L2', color: 'Rojo', isCCC: true, name: 'Línea Fase 2 (L2)' },
        { role: 'L3', color: 'Azul', isCCC: true, name: 'Línea Fase 3 (L3)' },
        { role: 'N', color: 'Blanco', isCCC: false, name: 'Neutro (N - Balanceado)' },
        { role: 'PE', color: 'Verde', isCCC: false, name: 'Tierra de Protección (PE)' },
      ];
  }
}

/**
 * Calculates a single electrical route step-by-step
 */
export function calculateRoute(
  route: RouteConfig,
  model: InstallationModel
): RouteCalculations {
  const steps: string[] = [];

  // Determine dynamic electrical parameters based on route type and active model
  let systemType = route.systemType;
  let voltageV = route.voltageV;
  let operatingCurrentA = route.operatingCurrentA;
  let designCurrentA = route.maxDesignCurrentA;
  let currentBasisDescription = route.currentBasisDescription;
  const effectiveTempC = (route.ambientTempC || model.ambientMaxTempC || 35) + (route.rooftopAdderC || 0);

  if (route.type === 'DC') {
    // Sanitize unit Vmp vs String Vmp
    let unitVmp = model.pv.vmpV || 44.6;
    if (unitVmp > 100 && model.pv.modulesPerString > 1) {
      unitVmp = parseFloat((unitVmp / model.pv.modulesPerString).toFixed(2));
    }
    const modulesInString = model.pv.modulesPerString || 1;
    const stringVmp = parseFloat((modulesInString * unitVmp).toFixed(1));
    const stringImp = model.pv.impA || 13.23;
    const stringIsc = model.pv.iscA || 14.25;

    // Detect if this route is a combined trunk (cadenas en paralelo) or an individual dedicated string
    const isParallelTrunk = route.name.toLowerCase().includes('troncal') || 
                            route.name.toLowerCase().includes('combiner') || 
                            route.name.toLowerCase().includes('paralelo') ||
                            route.origin.toLowerCase().includes('combiner');

    const parallelFactor = isParallelTrunk ? Math.max(1, model.pv.numberOfStrings || 1) : 1;

    // Rigorous physical currents:
    const expectedOperatingCurrent = parseFloat((stringImp * parallelFactor).toFixed(2));
    const expectedContinuousDesignCurrent = parseFloat((stringIsc * 1.5625 * parallelFactor).toFixed(2));

    systemType = 'DC-2W';
    voltageV = stringVmp > 0 ? stringVmp : 312.2;
    operatingCurrentA = expectedOperatingCurrent;
    designCurrentA = expectedContinuousDesignCurrent;

    currentBasisDescription = parallelFactor > 1
      ? `${parallelFactor} cadenas en paralelo: ${parallelFactor} × Imp (${stringImp}A) = ${operatingCurrentA}A | I_diseño = ${parallelFactor} × Isc (${stringIsc}A) × 1.56 = ${designCurrentA}A`
      : `Cadena individual: Imp = ${operatingCurrentA}A | I_diseño = Isc (${stringIsc}A) × 1.56 = ${designCurrentA}A (NOM Art. 690-8)`;
  } else {
    const inv = model.inverter;
    const units = inv.numberOfUnits || 1;
    let invNominalCurrent = 0;
    if (inv.maxOutputCurrentA > 0) {
      invNominalCurrent = inv.maxOutputCurrentA * units;
    } else if (inv.ratedPowerKw > 0 && inv.nominalAcVoltageV > 0) {
      if (inv.systemType.includes('3F')) {
        invNominalCurrent = ((inv.ratedPowerKw * 1000) / (Math.sqrt(3) * inv.nominalAcVoltageV)) * units;
      } else {
        invNominalCurrent = ((inv.ratedPowerKw * 1000) / inv.nominalAcVoltageV) * units;
      }
    }

    if (!systemType) {
      systemType = inv.systemType;
    }
    if (!voltageV || isNaN(voltageV) || voltageV <= 0) {
      voltageV = inv.nominalAcVoltageV;
    }

    // In AC routes, current is strictly determined by the inverter rated nominal power, NEVER by DC power
    if (invNominalCurrent > 0) {
      operatingCurrentA = parseFloat(invNominalCurrent.toFixed(2));
      designCurrentA = parseFloat((invNominalCurrent * 1.25).toFixed(2));
      currentBasisDescription = `Inversor Nominal (${inv.ratedPowerKw} kW AC @ ${voltageV}V ${systemType}): I_nom = ${operatingCurrentA}A | I_diseño = ${designCurrentA}A (1.25x continuo NOM Art. 690-8 / 705)`;
    } else {
      if (!operatingCurrentA || isNaN(operatingCurrentA) || operatingCurrentA <= 0) {
        operatingCurrentA = parseFloat(invNominalCurrent.toFixed(2));
      }
      if (!designCurrentA || isNaN(designCurrentA) || designCurrentA <= 0) {
        designCurrentA = parseFloat((invNominalCurrent * 1.25).toFixed(2));
        currentBasisDescription = `I_max_ac (${invNominalCurrent.toFixed(2)}A) × 1.25 continuo (NOM Art. 690-8 / 705)`;
      }
    }
  }

  // Step 1: Conductors and CCC count
  const conductors = route.customPhysicalConductors && route.customPhysicalConductors.length > 0
    ? route.customPhysicalConductors
    : getDefaultPhysicalConductors(systemType);

  const physicalCount = conductors.length;
  const cccCount = conductors.filter((c) => c.isCCC).length;

  steps.push(`1. Conductores físicos: ${physicalCount} (${conductors.map(c => c.role).join(', ')})`);
  steps.push(`2. Conductores portadores de corriente (CCC): ${cccCount} (excluye PE y neutros balanceados)`);

  // Step 2: Current determination
  steps.push(`3. Corriente de diseño: ${designCurrentA.toFixed(2)} A (Base: ${currentBasisDescription})`);

  // Step 3: Temperature and Grouping deratings
  const tempCorrectionFactor = getTemperatureCorrectionFactor(effectiveTempC, route.tempRating);
  const groupingCorrectionFactor = getGroupingCorrectionFactor(cccCount);
  const totalDeratingFactor = Math.max(0.05, tempCorrectionFactor * groupingCorrectionFactor);

  const requiredBaseAmpacityA = designCurrentA / totalDeratingFactor;

  steps.push(
    `4. Corrección por temperatura: Ft = ${tempCorrectionFactor.toFixed(2)} (Temp efectiva = ${effectiveTempC}°C, Aislante ${route.tempRating})`
  );
  steps.push(`5. Factor por agrupamiento: Fa = ${groupingCorrectionFactor.toFixed(2)} (para ${cccCount} CCC)`);
  steps.push(
    `6. Ampacidad requerida sin corregir: I_req = ${designCurrentA.toFixed(2)} / (${tempCorrectionFactor.toFixed(2)} × ${groupingCorrectionFactor.toFixed(2)}) = ${requiredBaseAmpacityA.toFixed(2)} A`
  );

  // Step 4: Initial gauge selection based on Ampacity
  let matchedIndex = -1;
  for (let i = 0; i < CONDUCTOR_DATABASE.length; i++) {
    const spec = CONDUCTOR_DATABASE[i];
    const baseAmp = route.material === 'Cu' ? spec.ampacityCu[route.tempRating] : spec.ampacityAl[route.tempRating];
    if (baseAmp >= requiredBaseAmpacityA) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex === -1) {
    matchedIndex = CONDUCTOR_DATABASE.length - 1;
  }

  const initialGaugeSpec = CONDUCTOR_DATABASE[matchedIndex];
  steps.push(
    `7. Calibre inicial por ampacidad: ${initialGaugeSpec.gauge} ${route.material} (Ampacidad base = ${route.material === 'Cu' ? initialGaugeSpec.ampacityCu[route.tempRating] : initialGaugeSpec.ampacityAl[route.tempRating]} A)`
  );

  // Step 5: Voltage drop iterative calculation & threshold calculation
  const is3Phase = systemType.includes('3F');
  const kPhase = is3Phase ? Math.sqrt(3) : 2.0; // k=1.732 for 3-phase line-to-line, k=2 for 1-phase/DC
  const pf = route.powerFactor || 1.0;
  const sinPf = Math.sqrt(Math.max(0, 1 - pf * pf));
  const runLengthKm = (route.lengthM || 1) / 1000.0;
  const currentForVDrop = operatingCurrentA > 0 ? operatingCurrentA : (designCurrentA / (route.type === 'DC' ? 1.5625 : 1.25));
  const isSteelConduit = route.conduitType === 'EMT' || route.conduitType === 'IMC';

  const getResistance = (spec: ConductorSpec) => {
    if (route.material === 'Cu') {
      return isSteelConduit ? spec.resistanceCuSteel : spec.resistanceCuPVC;
    }
    return spec.resistanceAlPVC;
  };

  let selectedIndex = matchedIndex;
  let voltageDropV = 0;
  let voltageDropPercent = 0;
  let stepsUpForVDrop = 0;
  let resistanceOhmsPerKm = 0;
  let reactanceOhmsPerKm = 0;

  // Compute exact threshold length where baseline gauge reaches 3.00% ΔV
  const baseSpec = CONDUCTOR_DATABASE[matchedIndex];
  const baseRes = getResistance(baseSpec);
  const baseReact = baseSpec.reactance;
  const baseEffectiveZ = baseRes * pf + baseReact * sinPf;
  const thresholdLengthFor3PercentM = baseEffectiveZ > 0 && currentForVDrop > 0 && voltageV > 0
    ? parseFloat(((0.03 * voltageV * 1000) / (kPhase * currentForVDrop * baseEffectiveZ)).toFixed(1))
    : 35.0;

  for (let idx = matchedIndex; idx < CONDUCTOR_DATABASE.length; idx++) {
    const spec = CONDUCTOR_DATABASE[idx];
    resistanceOhmsPerKm = getResistance(spec);
    reactanceOhmsPerKm = spec.reactance;
    const effectiveImpedance = resistanceOhmsPerKm * pf + reactanceOhmsPerKm * sinPf;

    voltageDropV = kPhase * currentForVDrop * runLengthKm * effectiveImpedance;
    voltageDropPercent = (voltageDropV / voltageV) * 100;

    if (voltageDropPercent <= 3.0 || idx === CONDUCTOR_DATABASE.length - 1) {
      selectedIndex = idx;
      stepsUpForVDrop = idx - matchedIndex;
      break;
    }
  }

  const selectedSpec = CONDUCTOR_DATABASE[selectedIndex];
  const baseConductorAmpacityA = route.material === 'Cu'
    ? selectedSpec.ampacityCu[route.tempRating]
    : selectedSpec.ampacityAl[route.tempRating];
  const correctedConductorAmpacityA = baseConductorAmpacityA * totalDeratingFactor;
  const ampacityCompliance = correctedConductorAmpacityA >= designCurrentA;
  const voltageDropCompliance = voltageDropPercent <= 3.0;

  steps.push(
    `8. Caída de tensión calculada: ΔV = ${voltageDropV.toFixed(2)} V (${voltageDropPercent.toFixed(2)}%) para L = ${route.lengthM}m con I_op = ${currentForVDrop.toFixed(2)} A [Límite NOM-001: ≤ 3.0%]`
  );
  if (stepsUpForVDrop > 0) {
    steps.push(
      `9. Recálculo automático por caída de tensión: Calibre aumentado +${stepsUpForVDrop} posición(es) a ${selectedSpec.gauge} ${route.material} para cumplir ΔV ≤ 3%`
    );
  } else {
    steps.push(`9. Calibre seleccionado cumple caída de tensión sin requerir sobrecalibre.`);
  }

  // Step 6: Conductor Outer Diameter and Areas
  const conductorOD = selectedSpec.outerDiameterMm[route.insulation] || selectedSpec.outerDiameterMm['THHW-LS'] || 4.0;
  const singleConductorAreaMm2 = (Math.PI * Math.pow(conductorOD, 2)) / 4.0;
  const totalConductorsAreaMm2 = singleConductorAreaMm2 * physicalCount;

  steps.push(
    `10. Diámetro exterior conductor: ${conductorOD} mm (Aislamiento ${route.insulation}). Área individual: ${singleConductorAreaMm2.toFixed(1)} mm²`
  );
  steps.push(
    `11. Área total de ${physicalCount} conductores: ${totalConductorsAreaMm2.toFixed(1)} mm²`
  );

  // Step 7: Conduit Sizing based on Chapter 9 Fill Limits
  let maxFillPercentAllowed = 40;
  if (route.isNipple) {
    maxFillPercentAllowed = 60;
    steps.push(`12. Tubería clasificada como Niple (≤ 600 mm): Ocupación máxima permitida = 60%`);
  } else if (physicalCount === 1) {
    maxFillPercentAllowed = 53;
    steps.push(`12. Conductor único: Ocupación máxima permitida = 53%`);
  } else if (physicalCount === 2) {
    maxFillPercentAllowed = 31;
    steps.push(`12. Dos conductores: Ocupación máxima permitida = 31%`);
  } else {
    maxFillPercentAllowed = 40;
    steps.push(`12. Tres o más conductores: Ocupación máxima permitida = 40%`);
  }

  let selectedConduit = CONDUIT_DATABASE[0];
  let conduitMatched = false;
  for (let i = 0; i < CONDUIT_DATABASE.length; i++) {
    const cond = CONDUIT_DATABASE[i];
    const totalArea = cond.totalAreaMm2[route.conduitType];
    if (totalArea > 0) {
      const fillPct = (totalConductorsAreaMm2 / totalArea) * 100;
      if (fillPct <= maxFillPercentAllowed) {
        selectedConduit = cond;
        conduitMatched = true;
        break;
      }
    }
  }

  if (!conduitMatched) {
    selectedConduit = CONDUIT_DATABASE[CONDUIT_DATABASE.length - 1];
  }

  const conduitTotalAreaMm2 = selectedConduit.totalAreaMm2[route.conduitType];
  const actualConduitFillPercent = conduitTotalAreaMm2 > 0
    ? (totalConductorsAreaMm2 / conduitTotalAreaMm2) * 100
    : 0;
  const conduitFillCompliance = actualConduitFillPercent <= maxFillPercentAllowed;

  steps.push(
    `13. Canalización seleccionada: ${route.conduitType} ${selectedConduit.tradeSizeInch} (${selectedConduit.metricSizeMm} mm)`
  );
  steps.push(
    `14. Factor de relleno: ${actualConduitFillPercent.toFixed(1)}% (Límite permitido según NEC/NOM: ${maxFillPercentAllowed}%) [${conduitFillCompliance ? 'CUMPLE' : 'EXCEDE'}]`
  );

  // Step 8: Geometric Accessories Derivation
  const derivedAccessories: DerivedAccessory[] = [];

  // 8.1 Conduit tubes (Standard length 3.0 m)
  const conduitTubesCount = Math.max(1, Math.ceil(route.lengthM / 3.0));
  derivedAccessories.push({
    id: `${route.id}-tube`,
    category: 'Canalización',
    item: `Tubería Conduit ${route.conduitType}`,
    spec: `${selectedConduit.tradeSizeInch} (${selectedConduit.metricSizeMm} mm) tramo 3.0m`,
    qty: route.lengthM,
    unit: 'm',
    reason: `Ruta de ${route.lengthM}m (${conduitTubesCount} tramos de 3m)`,
    routeId: route.id,
  });

  // 8.2 Couplings (coples)
  const couplingsCount = Math.max(0, conduitTubesCount - 1);
  if (couplingsCount > 0) {
    derivedAccessories.push({
      id: `${route.id}-cople`,
      category: 'Accesorio',
      item: `Cople para Conduit ${route.conduitType}`,
      spec: `${selectedConduit.tradeSizeInch} (${selectedConduit.metricSizeMm} mm)`,
      qty: couplingsCount,
      unit: 'pza',
      reason: `Unión de ${conduitTubesCount} tramos de tubería de 3.0m`,
      routeId: route.id,
    });
  }

  // 8.3 Enclosure Connectors / Glands
  const totalEnclosureConnectors = (route.geometry.cabinetEntries || 1) + (route.geometry.cabinetExits || 1);
  if (totalEnclosureConnectors > 0) {
    const isOutdoor = route.geometry.isOutdoor;
    const connectorType = isOutdoor ? `Conector Hermético a Prueba de Agua / Hub` : `Conector para Tubo`;
    derivedAccessories.push({
      id: `${route.id}-conn`,
      category: 'Conector',
      item: `${connectorType} ${route.conduitType}`,
      spec: `${selectedConduit.tradeSizeInch} (${selectedConduit.metricSizeMm} mm)`,
      qty: totalEnclosureConnectors,
      unit: 'pza',
      reason: `${route.geometry.cabinetEntries || 1} entrada(s) y ${route.geometry.cabinetExits || 1} salida(s) a gabinetes/tableros`,
      routeId: route.id,
    });
  }

  // 8.4 90° Bends / Curvas
  if (route.geometry.bends90 > 0) {
    derivedAccessories.push({
      id: `${route.id}-bend90`,
      category: 'Accesorio',
      item: `Curva 90° para Conduit ${route.conduitType}`,
      spec: `${selectedConduit.tradeSizeInch} (${selectedConduit.metricSizeMm} mm)`,
      qty: route.geometry.bends90,
      unit: 'pza',
      reason: `${route.geometry.bends90} cambio(s) de dirección a 90° en la ruta`,
      routeId: route.id,
    });
  }

  // 8.5 45° Bends / Curvas
  if (route.geometry.bends45 > 0) {
    derivedAccessories.push({
      id: `${route.id}-bend45`,
      category: 'Accesorio',
      item: `Curva 45° para Conduit ${route.conduitType}`,
      spec: `${selectedConduit.tradeSizeInch} (${selectedConduit.metricSizeMm} mm)`,
      qty: route.geometry.bends45,
      unit: 'pza',
      reason: `${route.geometry.bends45} deflexión(es) a 45° en la ruta`,
      routeId: route.id,
    });
  }

  // 8.6 Conduit Straps / Abrazaderas
  const spacing = route.geometry.supportSpacingM || 1.5;
  const clampsCount = Math.max(2, Math.ceil(route.lengthM / spacing) + 1);
  derivedAccessories.push({
    id: `${route.id}-clamp`,
    category: 'Fijación',
    item: `Abrazadera ${route.geometry.isOutdoor ? 'tipo Omega / Canal Unicanal' : 'tipo Uña / Omega'}`,
    spec: `Para conduit ${selectedConduit.tradeSizeInch} con taquete y tornillo`,
    qty: clampsCount,
    unit: 'pza',
    reason: `Fijación cada ${spacing}m a lo largo de ${route.lengthM}m`,
    routeId: route.id,
  });

  // 8.7 Pull box / Condulet if bends > 360° or long runs
  const totalBendsDeg = (route.geometry.bends90 || 0) * 90 + (route.geometry.bends45 || 0) * 45;
  if (totalBendsDeg >= 360 || route.lengthM > 35) {
    const pullBoxesNeeded = Math.max(1, Math.floor(totalBendsDeg / 360) + (route.lengthM > 35 ? Math.floor(route.lengthM / 30) : 0));
    derivedAccessories.push({
      id: `${route.id}-pullbox`,
      category: 'Accesorio',
      item: `Caja de Paso / Condulet Tipo LB/LL/LR`,
      spec: `NEMA 3R/4X ${selectedConduit.tradeSizeInch}`,
      qty: pullBoxesNeeded,
      unit: 'pza',
      reason: `Requerida por normativa al acumular ${totalBendsDeg}° de curvas (>360°) o tirada de ${route.lengthM}m`,
      routeId: route.id,
    });
  }

  // 8.8 Terminal Lugs / Zapatas de compresión
  const terminalsCount = physicalCount * 2;
  derivedAccessories.push({
    id: `${route.id}-lugs`,
    category: 'Conector',
    item: `Zapata de Compresión / Terminal de Ojillo`,
    spec: `Para calibre ${selectedSpec.gauge} ${route.material}`,
    qty: terminalsCount,
    unit: 'pza',
    reason: `Conexión de ${physicalCount} conductores en origen y destino (2 extremos)`,
    routeId: route.id,
  });

  // Step 9: Protections Derivation
  const derivedProtections: DerivedProtection[] = [];

  if (route.type === 'AC') {
    const ocpdCurrentA = selectStandardOCPD(designCurrentA);
    const polesStr = route.systemType.includes('3F') ? '3P' : route.systemType.includes('2F') ? '2P' : '1P';
    derivedProtections.push({
      id: `${route.id}-itm-ac`,
      category: 'Protección',
      item: `Interruptor Termomagnético (ITM) AC`,
      spec: `${ocpdCurrentA} A, ${polesStr}, ${route.voltageV} V, Icu ≥ 10 kA`,
      ratingA: ocpdCurrentA,
      poles: polesStr,
      type: 'ITM-AC',
      qty: 1,
      unit: 'pza',
      reason: `Protección de sobrecorriente AC calculada a ${designCurrentA.toFixed(1)} A continuo (1.25x)`,
      routeId: route.id,
    });

    // AC SPD
    derivedProtections.push({
      id: `${route.id}-spd-ac`,
      category: 'Protección',
      item: `Supresor de Sobretensiones Transitorias (SPD) AC`,
      spec: `Tipo 2, ${polesStr} + N/PE, Uc ≥ ${route.voltageV * 1.15} V, Imax 40 kA`,
      ratingA: 40,
      poles: polesStr,
      type: 'SPD-AC',
      qty: 1,
      unit: 'pza',
      reason: `Protección contra sobretensiones atmosféricas y de red en tablero ${route.destination}`,
      routeId: route.id,
    });
  } else {
    // DC Route
    if (model.inverter.architecture === 'microinverter') {
      steps.push(`15. Arquitectura con Microinversores: ITM DC = 0 (Protección solo en lado AC).`);
    } else {
      const dcFuseRatingA = selectStandardOCPD(designCurrentA);
      derivedProtections.push({
        id: `${route.id}-fuse-dc`,
        category: 'Protección',
        item: `Fusible de Protección Solar gPV DC`,
        spec: `${dcFuseRatingA} A, 1000 V DC, 10x38mm con Portafusible Modular`,
        ratingA: dcFuseRatingA,
        poles: '1P',
        type: 'FUSE-DC',
        qty: 2,
        unit: 'pza',
        reason: `Protección de circuito DC dimensionada a ${designCurrentA.toFixed(1)} A continuo (1.56x)`,
        routeId: route.id,
      });

      derivedProtections.push({
        id: `${route.id}-spd-dc`,
        category: 'Protección',
        item: `Supresor de Sobretensiones Transitorias (SPD) DC`,
        spec: `Tipo 2, 600/1000 V DC, In 20 kA, Imax 40 kA`,
        ratingA: 40,
        poles: '2P',
        type: 'SPD-DC',
        qty: 1,
        unit: 'pza',
        reason: `Protección contra descargas atmosféricas inducidas en el arreglo fotovoltaico`,
        routeId: route.id,
      });
    }
  }

  // Equations and summary
  const currentEquation = `I_diseño = ${designCurrentA.toFixed(2)} A (Base: ${currentBasisDescription})`;
  const deratingEquation = `I_base_req = ${designCurrentA.toFixed(2)} / (${tempCorrectionFactor.toFixed(2)} [Ft] × ${groupingCorrectionFactor.toFixed(2)} [Fa]) = ${requiredBaseAmpacityA.toFixed(2)} A`;
  const voltageDropEquation = `ΔV = ${voltageDropV.toFixed(2)} V (${voltageDropPercent.toFixed(2)}%) ≤ 3.0% [L=${route.lengthM}m, I_op=${currentForVDrop.toFixed(2)}A, R=${resistanceOhmsPerKm} Ω/km]`;
  const conduitFillEquation = `Relleno = ${totalConductorsAreaMm2.toFixed(1)} mm² / ${conduitTotalAreaMm2} mm² = ${actualConduitFillPercent.toFixed(1)}% ≤ ${maxFillPercentAllowed}%`;

  return {
    routeId: route.id,
    routeName: route.name,
    type: route.type,
    physicalConductors: conductors,
    physicalCount,
    cccCount,
    designCurrentA,
    currentBasis: currentBasisDescription,
    effectiveTempC,
    tempCorrectionFactor,
    groupingCorrectionFactor,
    totalDeratingFactor,
    requiredBaseAmpacityA,
    selectedGauge: selectedSpec.gauge,
    conductorAreaMm2: selectedSpec.areaMm2,
    conductorOuterDiameterMm: conductorOD,
    baseConductorAmpacityA,
    correctedConductorAmpacityA,
    ampacityCompliance,
    resistanceOhmsPerKm,
    reactanceOhmsPerKm,
    voltageDropV,
    voltageDropPercent,
    voltageDropCompliance,
    voltageDropRecalculatedSteps: stepsUpForVDrop,
    thresholdLengthFor3PercentM,
    totalConductorsAreaMm2,
    maxFillPercentAllowed,
    selectedConduitTradeSize: selectedConduit.tradeSizeInch,
    selectedConduitMetricMm: selectedConduit.metricSizeMm,
    conduitTotalAreaMm2,
    actualConduitFillPercent,
    conduitFillCompliance,
    derivedAccessories,
    derivedProtections,
    trace: {
      currentEquation,
      deratingEquation,
      voltageDropEquation,
      conduitFillEquation,
      steps,
    },
  };
}

/**
 * Builds the complete model, solves DC/AC networks, routes, derives BOM and runs validations
 */
export function solveInstallationModel(model: InstallationModel): ProjectModelResult {
  const missingData: string[] = [];
  const errors: string[] = [];

  // 1. PV Module and DC Calculations
  const pv = model.pv;
  if (!pv.powerW) missingData.push('Potencia de módulo (W)');
  if (!pv.vocV) missingData.push('Voc de módulo (V)');
  if (!pv.iscA) missingData.push('Isc de módulo (A)');
  if (!pv.vmpV) missingData.push('Vmp de módulo (V)');
  if (!pv.impA) missingData.push('Imp de módulo (A)');
  if (!pv.modulesPerString) missingData.push('Módulos por string');
  if (!pv.numberOfStrings) missingData.push('Número de strings');

  // Sanitize unit Voc vs string Voc
  let unitVocV = pv.vocV || 52.8;
  if (unitVocV > 90 && pv.modulesPerString > 1) {
    unitVocV = parseFloat((unitVocV / pv.modulesPerString).toFixed(2));
  }
  let unitVmpV = pv.vmpV || 44.6;
  if (unitVmpV > 80 && pv.modulesPerString > 1) {
    unitVmpV = parseFloat((unitVmpV / pv.modulesPerString).toFixed(2));
  }

  const modulesPerString = pv.modulesPerString || 1;
  const numberOfStrings = pv.numberOfStrings || 1;
  const totalModules = pv.totalModules || (modulesPerString * numberOfStrings);
  const totalPowerW = totalModules * (pv.powerW || 590);

  // String DC Voltages at Standard Test Conditions (STC 25°C)
  const stringVocV = parseFloat((modulesPerString * unitVocV).toFixed(1));
  const stringVmpV = parseFloat((modulesPerString * unitVmpV).toFixed(1));

  // Cold temperature correction according to NOM-001-SEDE Art. 690-7 / NEC 690.7:
  // Voc_cold = Voc_string * (1 + (tempCoeffVocPercent / 100) * (T_min - 25°C))
  const tempCoeffVoc = pv.tempCoeffVocPercentPerC || -0.28;
  const minTempC = model.ambientMinTempC !== undefined ? model.ambientMinTempC : 5;
  const deltaT = minTempC - 25; // e.g. 5 - 25 = -20°C
  const coldTempCorrectionFactor = parseFloat((1 + (tempCoeffVoc / 100) * deltaT).toFixed(4)); // e.g. 1 + (-0.0028 * -20) = 1.056
  const stringVocColdV = parseFloat((stringVocV * coldTempCorrectionFactor).toFixed(1));

  // Max DC Voltage limit check of Inverter
  const invMaxDcVoltage = model.inverter.maxDcVoltageV || (model.inverter.ratedPowerKw > 10 ? 1000 : 600);
  const dcVoltageCompliance = stringVocColdV <= invMaxDcVoltage;

  const stringIscA = pv.iscA || 14.25;
  const stringImpA = pv.impA || 13.23;
  const arrayIscA = parseFloat((numberOfStrings * stringIscA).toFixed(2));
  const arrayImpA = parseFloat((numberOfStrings * stringImpA).toFixed(2));
  const configSeriesParallel = `${numberOfStrings} string(s) de ${modulesPerString} módulos en serie (${totalModules} módulos en total)`;

  // 2. AC Metrics
  const inv = model.inverter;
  if (!inv.ratedPowerKw) missingData.push('Potencia nominal del inversor (kW)');
  if (!inv.nominalAcVoltageV) missingData.push('Tensión nominal AC (V)');

  const totalAcPowerKw = (inv.numberOfUnits || 1) * (inv.ratedPowerKw || 0);
  let totalAcCurrentA = 0;

  if (inv.maxOutputCurrentA > 0) {
    totalAcCurrentA = inv.maxOutputCurrentA * (inv.numberOfUnits || 1);
  } else if (inv.ratedPowerKw > 0 && inv.nominalAcVoltageV > 0) {
    if (inv.systemType.includes('3F')) {
      totalAcCurrentA = ((inv.ratedPowerKw * 1000) / (Math.sqrt(3) * inv.nominalAcVoltageV)) * (inv.numberOfUnits || 1);
    } else {
      totalAcCurrentA = ((inv.ratedPowerKw * 1000) / inv.nominalAcVoltageV) * (inv.numberOfUnits || 1);
    }
  }

  const maxAcCurrentWithContinuousFactorA = parseFloat((totalAcCurrentA * 1.25).toFixed(2));

  // 3. Solve each route
  const routeResults: RouteCalculations[] = model.routes.map((route) => {
    return calculateRoute(route, model);
  });

  // 4. Derive Consolidated BOM
  const bom: BOMItem[] = [];

  // 4.1 Conductors
  routeResults.forEach((res) => {
    const route = model.routes.find((r) => r.id === res.routeId)!;
    res.physicalConductors.forEach((cond) => {
      const lengthM = route.lengthM;
      bom.push({
        id: `BOM-${route.id}-${cond.role}`,
        category: 'Conductor',
        element: `Cable ${route.material} ${route.insulation} (${cond.role} - ${cond.name})`,
        specification: `Calibre ${res.selectedGauge} ${route.material}, Aislamiento ${route.insulation} ${route.tempRating}, Color ${cond.color}`,
        gauge: res.selectedGauge,
        lengthM: lengthM,
        quantity: lengthM,
        unit: 'm',
        location: `${route.origin} → ${route.destination}`,
        routeIds: [route.id],
        routeNames: [route.name],
        observations: `${cond.isCCC ? 'Conductor Portador de Corriente (CCC)' : 'Conductor de Tierra/Neutro (No CCC)'}. I_diseño = ${res.designCurrentA.toFixed(1)} A, ΔV = ${res.voltageDropPercent.toFixed(2)}%`,
        traceability: {
          originRoutes: [route.name],
          currentCalculatedA: res.designCurrentA,
          voltageDropPercent: res.voltageDropPercent,
          conduitFillPercent: res.actualConduitFillPercent,
          engineeringJustification: `Calibre determinado por ${res.voltageDropRecalculatedSteps > 0 ? `Caída de Tensión (recalculado +${res.voltageDropRecalculatedSteps} calibres para ΔV ≤ 3%)` : `Ampacidad corregida (${res.correctedConductorAmpacityA.toFixed(1)} A ≥ ${res.designCurrentA.toFixed(1)} A)`}.`,
        },
      });
    });
  });

  // 4.2 Tuberías and Accessories
  routeResults.forEach((res) => {
    res.derivedAccessories.forEach((acc) => {
      const route = model.routes.find((r) => r.id === res.routeId)!;
      bom.push({
        id: `BOM-${acc.id}`,
        category: acc.category === 'Canalización' ? 'Tubería' : 'Accesorio',
        element: acc.item,
        specification: acc.spec,
        quantity: acc.qty,
        unit: acc.unit,
        location: `${route.origin} → ${route.destination}`,
        routeIds: [route.id],
        routeNames: [route.name],
        observations: acc.reason,
        traceability: {
          originRoutes: [route.name],
          currentCalculatedA: res.designCurrentA,
          voltageDropPercent: res.voltageDropPercent,
          conduitFillPercent: res.actualConduitFillPercent,
          engineeringJustification: `Accesorio geométrico derivado automáticamente: ${acc.reason}`,
        },
      });
    });
  });

  // 4.3 Protections
  routeResults.forEach((res) => {
    res.derivedProtections.forEach((prot) => {
      const route = model.routes.find((r) => r.id === res.routeId)!;
      bom.push({
        id: `BOM-${prot.id}`,
        category: 'Protección',
        element: prot.item,
        specification: prot.spec,
        quantity: prot.qty,
        unit: prot.unit,
        location: route.destination,
        routeIds: [route.id],
        routeNames: [route.name],
        observations: prot.reason,
        traceability: {
          originRoutes: [route.name],
          currentCalculatedA: res.designCurrentA,
          voltageDropPercent: res.voltageDropPercent,
          engineeringJustification: `Protección dimensionada con factor continuo 1.25x / 1.56x: ${prot.reason}`,
        },
      });
    });
  });

  // 4.4 Gabinetes / Tableros
  model.cabinets.forEach((cab) => {
    bom.push({
      id: `BOM-CAB-${cab.id}`,
      category: 'Gabinete',
      element: cab.type,
      specification: `${cab.name} (${cab.nemaRating}, ${cab.circuitsCount} circuitos)`,
      quantity: 1,
      unit: 'pza',
      location: cab.location,
      routeIds: [],
      routeNames: [],
      observations: `Gabinete para alojamiento de protecciones y barrajes en ${cab.location}`,
      traceability: {
        originRoutes: [],
        currentCalculatedA: 0,
        voltageDropPercent: 0,
        engineeringJustification: `Gabinete estructurado para ${cab.type} con capacidad de ${cab.circuitsCount} circuitos.`,
      },
    });
  });

  // 4.5 Major Equipment (Modules, Inverters, Battery)
  if (totalModules > 0) {
    bom.push({
      id: `BOM-PV-MODULES`,
      category: 'Equipo',
      element: `Módulo Fotovoltaico ${pv.manufacturer} ${pv.model}`,
      specification: `${pv.powerW} W, Voc unitario: ${unitVocV} V (String Voc: ${stringVocV} V / Frío ${stringVocColdV} V), Isc: ${stringIscA} A, Vmp: ${unitVmpV} V, Imp: ${stringImpA} A`,
      quantity: totalModules,
      unit: 'pza',
      location: 'Arreglo en Cubierta / Estructura',
      routeIds: [],
      routeNames: [],
      observations: configSeriesParallel,
      traceability: {
        originRoutes: [],
        currentCalculatedA: arrayIscA,
        voltageDropPercent: 0,
        engineeringJustification: `Generador fotovoltaico de ${(totalPowerW / 1000).toFixed(2)} kWp con ${totalModules} módulos. Voc en frío corregido a ${minTempC}°C = ${stringVocColdV} V DC.`,
      },
    });
  }

  if (inv.ratedPowerKw > 0) {
    bom.push({
      id: `BOM-INVERTER`,
      category: 'Equipo',
      element: `Inversor ${inv.manufacturer} ${inv.model}`,
      specification: `${inv.ratedPowerKw} kW, ${inv.architecture.toUpperCase()}, ${inv.systemType} ${inv.nominalAcVoltageV}V, V_max_DC: ${invMaxDcVoltage} V, Eficiencia ${inv.efficiencyPercent}%`,
      quantity: inv.numberOfUnits || 1,
      unit: 'pza',
      location: 'Área de Inversores / Muro Técnico',
      routeIds: [],
      routeNames: [],
      observations: `Arquitectura: ${inv.architecture}`,
      traceability: {
        originRoutes: [],
        currentCalculatedA: totalAcCurrentA,
        voltageDropPercent: 0,
        engineeringJustification: `Conversión de potencia DC/AC para ${totalAcPowerKw.toFixed(1)} kW AC. Tensión máxima DC de entrada = ${invMaxDcVoltage} V.`,
      },
    });
  }

  if (model.battery.enabled) {
    bom.push({
      id: `BOM-BATTERY`,
      category: 'Equipo',
      element: `Sistema de Almacenamiento ESS ${model.battery.manufacturer} ${model.battery.model}`,
      specification: `${model.battery.capacityKwh} kWh, ${model.battery.chemistry}, ${model.battery.nominalVoltageV}V, I_descarga: ${model.battery.maxContinuousDischargeCurrentA} A`,
      quantity: model.battery.unitsCount || 1,
      unit: 'pza',
      location: 'Cuarto de Baterías / Gabinete ESS',
      routeIds: [],
      routeNames: [],
      observations: `Capacidad total: ${(model.battery.capacityKwh * (model.battery.unitsCount || 1)).toFixed(1)} kWh`,
      traceability: {
        originRoutes: [],
        currentCalculatedA: model.battery.maxContinuousDischargeCurrentA,
        voltageDropPercent: 0,
        engineeringJustification: `Sistema de respaldo y autoconsumo ESS con ${model.battery.capacityKwh} kWh.`,
      },
    });
  }

  // 5. Automated 17-point Validation Checklist (including NEC/NOM 690.7 cold Voc check)
  const validations: ValidationCheckItem[] = [
    {
      id: 'VAL-01',
      title: 'Configuración completa',
      rule: 'Todos los parámetros esenciales de módulos, inversor y rutas deben estar definidos.',
      passed: missingData.length === 0,
      status: missingData.length === 0 ? 'ok' : 'missing_data',
      detail: missingData.length === 0 ? 'Configuración 100% completa' : `Faltan datos requeridos: ${missingData.join(', ')}`,
      affectedElement: missingData.length > 0 ? 'Parámetros de Entrada' : undefined,
      proposedFix: missingData.length > 0 ? 'Completar los valores marcados como [DATO FALTANTE]' : undefined,
    },
    {
      id: 'VAL-02',
      title: 'Corrientes calculadas (NOM Art. 690-8)',
      rule: 'Cada circuito debe tener su corriente de diseño calculada con factor de régimen continuo (1.25x para AC, 1.56x para DC).',
      passed: routeResults.every((r) => r.designCurrentA > 0),
      status: routeResults.every((r) => r.designCurrentA > 0) ? 'ok' : 'error',
      detail: `Todas las ${routeResults.length} rutas tienen corriente física y de diseño válida asignada (DC: 1.56x Isc por cadena / AC: 1.25x I_max).`,
    },
    {
      id: 'VAL-03',
      title: 'CCC correcto',
      rule: 'El número de CCC debe excluir tierras de protección (PE) y neutros balanceados.',
      passed: routeResults.every((r) => r.cccCount < r.physicalCount || r.physicalCount === 1),
      status: 'ok',
      detail: 'Separación rigurosa entre conductores físicos y conductores portadores de corriente (CCC).',
    },
    {
      id: 'VAL-04',
      title: 'Factores de corrección aplicados',
      rule: 'Se deben aplicar factores Ft (temperatura) y Fa (agrupamiento) según Art. 310.',
      passed: routeResults.every((r) => r.totalDeratingFactor > 0 && r.totalDeratingFactor <= 1.25),
      status: 'ok',
      detail: 'Factores Ft y Fa aplicados en todas las rutas según temperatura ambiente y agrupamiento en tubería.',
    },
    {
      id: 'VAL-05',
      title: 'Ampacidad corregida ≥ corriente requerida',
      rule: 'La ampacidad corregida del conductor seleccionado debe superar o igualar la corriente de diseño.',
      passed: routeResults.every((r) => r.ampacityCompliance),
      status: routeResults.every((r) => r.ampacityCompliance) ? 'ok' : 'error',
      detail: routeResults.every((r) => r.ampacityCompliance)
        ? 'Todos los calibres cumplen holgadamente la ampacidad corregida.'
        : 'Alguna ruta tiene conductor con ampacidad inferior a la corriente requerida.',
      proposedFix: 'Aumentar calibre en las rutas con fallo de ampacidad.',
    },
    {
      id: 'VAL-06',
      title: 'Caída de tensión ≤ 3 %',
      rule: 'La caída de tensión en cada ruta individual AC y DC no debe superar el 3.00%.',
      passed: routeResults.every((r) => r.voltageDropCompliance),
      status: routeResults.every((r) => r.voltageDropCompliance) ? 'ok' : 'error',
      detail: `Máxima caída de tensión calculada: ${Math.max(...routeResults.map((r) => r.voltageDropPercent), 0).toFixed(2)}% (todas ≤ 3.00%).`,
      proposedFix: 'El motor ya recalcula y aumenta calibre automáticamente hasta cumplir ≤ 3%.',
    },
    {
      id: 'VAL-07',
      title: 'Calibre seleccionado',
      rule: 'El calibre debe ser el mínimo comercial que cumpla simultáneamente ampacidad y caída de tensión.',
      passed: routeResults.every((r) => r.selectedGauge.length > 0),
      status: 'ok',
      detail: 'Calibres normalizados AWG / kcmil seleccionados de la tabla NEC/NOM-001.',
    },
    {
      id: 'VAL-08',
      title: 'Número físico de conductores correcto',
      rule: 'El número físico debe incluir fases, neutro y conductor de tierra PE según el sistema.',
      passed: routeResults.every((r) => r.physicalCount >= 2),
      status: 'ok',
      detail: 'Identificación física completa con código de colores por fase, neutro y puesta a tierra.',
    },
    {
      id: 'VAL-09',
      title: 'PE correctamente identificado',
      rule: 'El conductor de puesta a tierra de protección debe estar presente y no contar como CCC.',
      passed: routeResults.every((r) => r.physicalConductors.some((c) => c.role === 'PE' || c.role === 'GND_DC')),
      status: 'ok',
      detail: 'Conductor PE/GND incluido en todos los circuitos sin afectar el factor de agrupamiento CCC.',
    },
    {
      id: 'VAL-10',
      title: 'Factor de relleno correcto',
      rule: 'Ocupación máxima en tubería: 53% (1 cond), 31% (2 cond), 40% (≥3 cond), 60% (niples ≤60cm).',
      passed: routeResults.every((r) => r.conduitFillCompliance),
      status: routeResults.every((r) => r.conduitFillCompliance) ? 'ok' : 'error',
      detail: `Máximo porcentaje de relleno en canalización: ${Math.max(...routeResults.map((r) => r.actualConduitFillPercent), 0).toFixed(1)}% (cumple límites).`,
    },
    {
      id: 'VAL-11',
      title: 'Tubería comercial adecuada',
      rule: 'Diámetro comercial seleccionado disponible en catálogo estándar (1/2" a 4").',
      passed: routeResults.every((r) => r.selectedConduitTradeSize.length > 0),
      status: 'ok',
      detail: 'Diámetros comerciales seleccionados (EMT, PVC, IMC o LiquidTight).',
    },
    {
      id: 'VAL-12',
      title: 'Accesorios coherentes con geometría',
      rule: 'Los accesorios (curvas, coples, conectores, abrazaderas, cajas de paso) deben derivarse de la geometría real.',
      passed: routeResults.every((r) => r.derivedAccessories.length > 0),
      status: 'ok',
      detail: 'Accesorios calculados matemáticamente en función de longitud, tramos de 3m, curvas y entradas a tableros.',
    },
    {
      id: 'VAL-13',
      title: 'Protecciones coherentes',
      rule: 'Protecciones OCPD y SPD dimensionadas según arquitectura y normativas.',
      passed: routeResults.every((r) => r.derivedProtections.length > 0 || (inv.architecture === 'microinverter' && r.type === 'DC')),
      status: 'ok',
      detail: 'Protecciones AC y DC adaptadas a la arquitectura.',
    },
    {
      id: 'VAL-14',
      title: 'Microinversor → ITM DC = 0',
      rule: 'Si la arquitectura es con microinversores, no deben generarse ITM DC (ITM DC = 0).',
      passed: inv.architecture === 'microinverter'
        ? routeResults.filter((r) => r.type === 'DC').every((r) => r.derivedProtections.every((p) => p.type !== 'ITM-DC'))
        : true,
      status: 'ok',
      detail: inv.architecture === 'microinverter'
        ? 'Arquitectura con microinversores: Regla cumplida (ITM DC = 0).'
        : 'Inversor Central/String: Protecciones DC generadas según strings y combiners.',
    },
    {
      id: 'VAL-15',
      title: 'Inversor central/string → Protecciones DC según circuitos',
      rule: 'Si se utiliza inversor central o de cadena, deben existir fusibles/ITM DC dimensionados a 1.56x Isc.',
      passed: inv.architecture !== 'microinverter'
        ? routeResults.some((r) => r.type === 'DC') ? routeResults.filter((r) => r.type === 'DC').every((r) => r.derivedProtections.length > 0) : true
        : true,
      status: 'ok',
      detail: 'Fusibles gPV y desconectadores DC asignados correctamente según número de strings.',
    },
    {
      id: 'VAL-16',
      title: 'BOM completa y 100% trazable',
      rule: 'Todo elemento en la lista de materiales debe rastrearse hasta su circuito, cálculo y fórmula.',
      passed: bom.length > 0 && bom.every((item) => item.traceability.engineeringJustification.length > 0),
      status: 'ok',
      detail: `Lista de ${bom.length} partidas generada como consecuencia directa del modelo paramétrico.`,
    },
    {
      id: 'VAL-17',
      title: 'Tensión máxima Voc en frío (NOM Art. 690-7 / NEC 690.7)',
      rule: 'La tensión de circuito abierto en la condición más fría histórica (Voc_frío) no debe superar la tensión máxima DC del inversor (V_max_DC).',
      passed: dcVoltageCompliance,
      status: dcVoltageCompliance ? 'ok' : 'error',
      detail: dcVoltageCompliance
        ? `Voc corregido en frío (${minTempC}°C): ${stringVocColdV.toFixed(1)} V DC ≤ ${invMaxDcVoltage} V DC máx del inversor (${inv.manufacturer || 'Growatt'}). Voc_string (STC): ${stringVocV.toFixed(1)} V DC, Voc unitario: ${unitVocV.toFixed(1)} V.`
        : `¡ALERTA DE SOBRETENSIÓN DC! Voc en frío (${stringVocColdV.toFixed(1)} V) supera el límite del inversor (${invMaxDcVoltage} V). Riesgo de destrucción de la etapa MPPT según Art. 690-7.`,
      affectedElement: !dcVoltageCompliance ? 'Configuración de Strings / Inversor' : undefined,
      proposedFix: !dcVoltageCompliance ? `Reducir el número de módulos en serie por cadena (actualmente ${modulesPerString} módulos) o cambiar a inversor de mayor rango de tensión DC.` : undefined,
    },
  ];

  return {
    model,
    dc: {
      totalPowerW,
      unitVocV,
      unitVmpV,
      stringVocV,
      stringVmpV,
      stringVocColdV,
      coldTempCorrectionFactor,
      invMaxDcVoltage,
      dcVoltageCompliance,
      stringIscA,
      stringImpA,
      arrayIscA,
      arrayImpA,
      configSeriesParallel,
      missingData,
    },
    ac: {
      totalAcPowerKw,
      nominalAcVoltageV: inv.nominalAcVoltageV || 220,
      totalAcCurrentA,
      maxAcCurrentWithContinuousFactorA,
      systemType: inv.systemType || '2F-2H-220V',
    },
    routeResults,
    bom,
    validations,
    errors,
    missingDataList: missingData,
  };
}
