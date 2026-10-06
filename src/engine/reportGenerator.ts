/**
 * Engineering Report Generator for PV/ESS Model & BOM
 * Generates the strictly formatted 17-Section Master Report
 */

import { ProjectModelResult } from './types';

export function generateMasterReportMarkdown(res: ProjectModelResult): string {
  const { model, dc, ac, routeResults, bom, validations, missingDataList, errors } = res;

  const totalPvKw = (dc.totalPowerW / 1000).toFixed(2);
  const totalAcKw = ac.totalAcPowerKw.toFixed(2);

  let md = '';

  // 1. RESUMEN DE LA INSTALACIÓN
  md += `# PROYECTO: ${model.projectName.toUpperCase()}\n\n`;
  md += `## 1. RESUMEN DE LA INSTALACIÓN\n\n`;
  md += `- **Cliente:** ${model.clientName}\n`;
  md += `- **ID de Instalación:** ${model.installationId}\n`;
  md += `- **Ubicación:** ${model.location}\n`;
  md += `- **Temperatura ambiente de diseño:** ${model.ambientMaxTempC} °C máx / ${model.ambientMinTempC} °C mín\n`;
  md += `- **Capacidad Fotovoltaica DC:** ${totalPvKw} kWp (${model.pv.totalModules || model.pv.modulesPerString * model.pv.numberOfStrings} módulos de ${model.pv.powerW} W)\n`;
  md += `- **Capacidad de Inversión AC:** ${totalAcKw} kW (${model.inverter.numberOfUnits || 1}x ${model.inverter.ratedPowerKw} kW ${model.inverter.architecture})\n`;
  if (model.battery.enabled) {
    md += `- **Sistema de Almacenamiento ESS:** ${model.battery.capacityKwh} kWh (${model.battery.chemistry}, ${model.battery.nominalVoltageV} V)\n`;
  }
  md += `- **Sistema Eléctrico de Conexión:** ${model.inverter.systemType} @ ${model.inverter.nominalAcVoltageV} V\n`;
  md += `- **Total de Rutas Modeladas:** ${routeResults.length} (${routeResults.filter(r => r.type === 'DC').length} DC, ${routeResults.filter(r => r.type === 'AC').length} AC)\n`;
  md += `- **Total de Partidas en BOM:** ${bom.length} elementos consolidados y trazables\n\n`;

  // 2. ARQUITECTURA
  md += `## 2. ARQUITECTURA\n\n`;
  md += `### Módulos\n`;
  md += `- Fabricante / Modelo: ${model.pv.manufacturer} ${model.pv.model}\n`;
  md += `- Cantidad total: ${model.pv.totalModules || model.pv.modulesPerString * model.pv.numberOfStrings} piezas\n`;
  md += `- Potencia unitaria: ${model.pv.powerW} W\n`;
  md += `- Voc: ${model.pv.vocV} V | Isc: ${model.pv.iscA} A | Vmp: ${model.pv.vmpV} V | Imp: ${model.pv.impA} A\n\n`;

  md += `### Strings\n`;
  md += `- Módulos por string: ${model.pv.modulesPerString}\n`;
  md += `- Número de strings: ${model.pv.numberOfStrings}\n`;
  md += `- Configuración: ${dc.configSeriesParallel}\n`;
  md += `- Tensión de string (Voc): ${dc.stringVocV.toFixed(1)} V | Tensión de operación (Vmp): ${dc.stringVmpV.toFixed(1)} V\n`;
  md += `- Corriente de string (Isc): ${dc.stringIscA.toFixed(2)} A | Corriente de operación (Imp): ${dc.stringImpA.toFixed(2)} A\n\n`;

  md += `### Inversores\n`;
  md += `- Fabricante / Modelo: ${model.inverter.manufacturer} ${model.inverter.model}\n`;
  md += `- Arquitectura: ${model.inverter.architecture.toUpperCase()}\n`;
  md += `- Cantidad de unidades: ${model.inverter.numberOfUnits || 1}\n`;
  md += `- Potencia nominal por unidad: ${model.inverter.ratedPowerKw} kW\n`;
  md += `- Tensión de salida AC: ${model.inverter.nominalAcVoltageV} V (${model.inverter.systemType})\n`;
  md += `- Corriente máxima de salida AC: ${model.inverter.maxOutputCurrentA} A por unidad\n`;
  md += `- Eficiencia: ${model.inverter.efficiencyPercent}%\n\n`;

  md += `### Baterías / ESS\n`;
  if (model.battery.enabled) {
    md += `- Fabricante / Modelo: ${model.battery.manufacturer} ${model.battery.model}\n`;
    md += `- Química: ${model.battery.chemistry}\n`;
    md += `- Capacidad total: ${(model.battery.capacityKwh * (model.battery.unitsCount || 1)).toFixed(1)} kWh (${model.battery.unitsCount || 1} unidades)\n`;
    md += `- Tensión nominal: ${model.battery.nominalVoltageV} V\n`;
    md += `- Corriente máxima de descarga continua: ${model.battery.maxContinuousDischargeCurrentA} A\n\n`;
  } else {
    md += `- No aplica (Instalación Grid-Tie pura sin ESS).\n\n`;
  }

  md += `### Tableros y Gabinetes\n`;
  model.cabinets.forEach((cab, i) => {
    md += `${i + 1}. **${cab.name}** — ${cab.type} (${cab.nemaRating}, ${cab.circuitsCount} circuitos) en *${cab.location}*\n`;
  });
  md += `\n`;

  md += `### Protecciones\n`;
  if (model.inverter.architecture === 'microinverter') {
    md += `- Arquitectura Microinversores: **ITM DC = 0** (No aplica protección en DC según diseño).\n`;
    md += `- Protecciones en lado AC: Interruptores termomagnéticos en Gabinete AC y Tablero Principal, SPD Tipo 2.\n\n`;
  } else {
    md += `- Lado DC: Fusibles gPV 1000V/1500V dimensionados a 1.56×Isc, Interruptores Seccionadores DC bajo carga y Supresores de Picos (SPD) DC Tipo 2.\n`;
    md += `- Lado AC: Interruptores termomagnéticos dimensionados a 1.25×I_max_ac continuo y SPD AC Tipo 2.\n\n`;
  }

  // 3. MODELO DC
  md += `## 3. MODELO DC\n\n`;
  md += `| Parámetro | Valor | Unidad |\n`;
  md += `|---|---:|---|\n`;
  md += `| Potencia Total DC Arreglo | ${dc.totalPowerW.toFixed(0)} | Wp |\n`;
  md += `| Módulos Totales | ${model.pv.totalModules || model.pv.modulesPerString * model.pv.numberOfStrings} | pza |\n`;
  md += `| Configuración de Conexión | ${dc.configSeriesParallel} | — |\n`;
  md += `| Tensión de Circuito Abierto por String (Voc @ STC) | ${dc.stringVocV.toFixed(2)} | V |\n`;
  md += `| Tensión de Máxima Potencia por String (Vmp @ STC) | ${dc.stringVmpV.toFixed(2)} | V |\n`;
  md += `| Corriente de Cortocircuito por String (Isc @ STC) | ${dc.stringIscA.toFixed(2)} | A |\n`;
  md += `| Corriente de Máxima Potencia por String (Imp @ STC) | ${dc.stringImpA.toFixed(2)} | A |\n`;
  md += `| Corriente Total de Cortocircuito del Arreglo | ${dc.arrayIscA.toFixed(2)} | A |\n`;
  md += `| Corriente de Diseño Fotovoltaico (Isc × 1.25 × 1.25) | ${(dc.stringIscA * 1.5625).toFixed(2)} | A |\n\n`;

  // 4. MODELO AC
  md += `## 4. MODELO AC\n\n`;
  md += `| Parámetro | Valor | Unidad |\n`;
  md += `|---|---:|---|\n`;
  md += `| Potencia Nominal AC Total | ${ac.totalAcPowerKw.toFixed(2)} | kW |\n`;
  md += `| Sistema Eléctrico AC | ${ac.systemType} | — |\n`;
  md += `| Tensión Nominal AC | ${ac.nominalAcVoltageV} | V |\n`;
  md += `| Corriente Nominal AC Total | ${ac.totalAcCurrentA.toFixed(2)} | A |\n`;
  md += `| Corriente de Diseño AC (Régimen Continuo 1.25×) | ${ac.maxAcCurrentWithContinuousFactorA.toFixed(2)} | A |\n`;
  md += `| Factor de Potencia (cos φ) | 0.98 | — |\n\n`;

  // 5. TABLA DE RUTAS
  md += `## 5. TABLA DE RUTAS\n\n`;
  md += `| Ruta | Tipo | Origen | Destino | Longitud | Sistema | Tensión | Corriente | Calibre | Tubería | ΔV% |\n`;
  md += `|---|---|---|---|---:|---|---:|---:|---|---|---:|\n`;
  routeResults.forEach(r => {
    const route = model.routes.find(rt => rt.id === r.routeId)!;
    md += `| **${r.routeName}** | ${r.type} | ${route.origin} | ${route.destination} | ${route.lengthM.toFixed(1)} m | ${route.systemType} | ${route.voltageV} V | ${r.designCurrentA.toFixed(1)} A | ${r.selectedGauge} ${route.material} | ${r.selectedConduitTradeSize} ${route.conduitType} | ${r.voltageDropPercent.toFixed(2)}% |\n`;
  });
  md += `\n`;

  // 6. CÁLCULO DE CORRIENTES
  md += `## 6. CÁLCULO DE CORRIENTES\n\n`;
  routeResults.forEach(r => {
    md += `### Ruta: ${r.routeName}\n`;
    md += `- **Tipo de Circuito:** ${r.type}\n`;
    md += `- **Criterio de Corriente:** ${r.currentBasis}\n`;
    md += `- **Corriente de Diseño Aplicada:** **${r.designCurrentA.toFixed(2)} A**\n`;
    md += `- **Justificación Técnica:** ${r.trace.currentEquation}\n\n`;
  });

  // 7. CCC (CONDUCTORES PORTADORES DE CORRIENTE)
  md += `## 7. CCC (CONDUCTORES PORTADORES DE CORRIENTE)\n\n`;
  md += `| Ruta | Conductores Físicos | Detalle de Conductores | CCC | Puesta a Tierra (PE / GND) |\n`;
  md += `|---|---:|---|---:|---|\n`;
  routeResults.forEach(r => {
    const roles = r.physicalConductors.map(c => `${c.role} (${c.color})`).join(', ');
    md += `| ${r.routeName} | ${r.physicalCount} | ${roles} | **${r.cccCount}** | Identificado (No cuenta como CCC) |\n`;
  });
  md += `\n`;

  // 8. AMPACIDAD Y FACTORES DE CORRECCIÓN
  md += `## 8. AMPACIDAD Y FACTORES DE CORRECCIÓN\n\n`;
  md += `| Ruta | Temp. Efectiva | Aislamiento | Factor Temp (Ft) | Factor Agrup. (Fa) | Factor Total | I_diseño | Ampacidad Requerida (I_req / Ft×Fa) |\n`;
  md += `|---|---:|---|---:|---:|---:|---:|---:|\n`;
  routeResults.forEach(r => {
    const route = model.routes.find(rt => rt.id === r.routeId)!;
    md += `| ${r.routeName} | ${r.effectiveTempC} °C | ${route.insulation} ${route.tempRating} | ${r.tempCorrectionFactor.toFixed(2)} | ${r.groupingCorrectionFactor.toFixed(2)} | ${r.totalDeratingFactor.toFixed(2)} | ${r.designCurrentA.toFixed(2)} A | **${r.requiredBaseAmpacityA.toFixed(2)} A** |\n`;
  });
  md += `\n`;

  // 9. SELECCIÓN DE CONDUCTORES
  md += `## 9. SELECCIÓN DE CONDUCTORES\n\n`;
  md += `| Ruta | Calibre Seleccionado | Material | Ampacidad Base | Ampacidad Corregida | Cumplimiento Ampacidad |\n`;
  md += `|---|---|---|---:|---:|---|\n`;
  routeResults.forEach(r => {
    const route = model.routes.find(rt => rt.id === r.routeId)!;
    md += `| ${r.routeName} | **${r.selectedGauge}** | ${route.material} ${route.insulation} | ${r.baseConductorAmpacityA} A | **${r.correctedConductorAmpacityA.toFixed(1)} A** | ${r.ampacityCompliance ? '✅ CUMPLE (≥ ' + r.designCurrentA.toFixed(1) + ' A)' : '❌ NO CUMPLE'} |\n`;
  });
  md += `\n`;

  // 10. CAÍDA DE TENSIÓN
  md += `## 10. CAÍDA DE TENSIÓN (LÍMITE ≤ 3.00%)\n\n`;
  md += `| Ruta | Longitud | Resistencia (R) | Tensión Nominal | Caída (Volts) | Caída (%) | Calibres Subidos por ΔV | Estado |\n`;
  md += `|---|---:|---:|---:|---:|---:|---:|---|\n`;
  routeResults.forEach(r => {
    const route = model.routes.find(rt => rt.id === r.routeId)!;
    md += `| ${r.routeName} | ${route.lengthM.toFixed(1)} m | ${r.resistanceOhmsPerKm} Ω/km | ${route.voltageV} V | ${r.voltageDropV.toFixed(2)} V | **${r.voltageDropPercent.toFixed(2)} %** | +${r.voltageDropRecalculatedSteps} | ${r.voltageDropCompliance ? '✅ CUMPLE ≤ 3%' : '❌ SUPERA 3%'} |\n`;
  });
  md += `\n`;

  // 11. SELECCIÓN DE TUBERÍA
  md += `## 11. SELECCIÓN DE TUBERÍA\n\n`;
  md += `| Ruta | Tipo Canalización | Calibre Conductor | Diám. Exterior Conductor | Diámetro Comercial | Diámetro Métrico | Área Interior |\n`;
  md += `|---|---|---|---:|---|---:|---:|\n`;
  routeResults.forEach(r => {
    const route = model.routes.find(rt => rt.id === r.routeId)!;
    md += `| ${r.routeName} | ${route.conduitType} | ${r.selectedGauge} | ${r.conductorOuterDiameterMm.toFixed(2)} mm | **${r.selectedConduitTradeSize}** | ${r.selectedConduitMetricMm} mm | ${r.conduitTotalAreaMm2} mm² |\n`;
  });
  md += `\n`;

  // 12. FACTOR DE RELLENO
  md += `## 12. FACTOR DE RELLENO\n\n`;
  md += `| Ruta | N° Conductores | Área Total Conductores | Área Tubería | % Relleno Real | Límite Permitido | Cumplimiento |\n`;
  md += `|---|---:|---:|---:|---:|---:|---|\n`;
  routeResults.forEach(r => {
    md += `| ${r.routeName} | ${r.physicalCount} | ${r.totalConductorsAreaMm2.toFixed(1)} mm² | ${r.conduitTotalAreaMm2} mm² | **${r.actualConduitFillPercent.toFixed(1)} %** | ${r.maxFillPercentAllowed} % | ${r.conduitFillCompliance ? '✅ CUMPLE' : '❌ EXCEDIDO'} |\n`;
  });
  md += `\n`;

  // 13. ACCESORIOS
  md += `## 13. ACCESORIOS DERIVADOS AUTOMÁTICAMENTE\n\n`;
  md += `*Los accesorios no son manuales; se calculan a partir de la longitud física, tramos de 3.0 m, curvas de 90°/45°, entradas a gabinetes y soportería cada 1.5 m.*\n\n`;
  md += `| Ruta | Accesorio | Especificación | Cantidad | Unidad | Justificación Geométrica |\n`;
  md += `|---|---|---|---:|---|---|\n`;
  routeResults.forEach(r => {
    r.derivedAccessories.forEach(acc => {
      md += `| ${r.routeName} | ${acc.item} | ${acc.spec} | **${acc.qty}** | ${acc.unit} | ${acc.reason} |\n`;
    });
  });
  md += `\n`;

  // 14. PROTECCIONES
  md += `## 14. PROTECCIONES\n\n`;
  if (model.inverter.architecture === 'microinverter') {
    md += `> **REGLA APLICADA:** Microinversores → **ITM DC = 0**.\n\n`;
  }
  md += `| Ruta / Ubicación | Tipo | Dispositivo | Especificación | Capacidad (A) | Polos | Cantidad |\n`;
  md += `|---|---|---|---|---:|---|---:|\n`;
  routeResults.forEach(r => {
    r.derivedProtections.forEach(p => {
      md += `| ${r.routeName} | ${p.type} | ${p.item} | ${p.spec} | ${p.ratingA} A | ${p.poles} | ${p.qty} pza |\n`;
    });
  });
  md += `\n`;

  // 15. BOM
  md += `## 15. LISTA DE MATERIALES (BOM) CONSOLIDADA Y TRAZABLE\n\n`;
  md += `| Categoría | Elemento | Especificación | Cantidad | Unidad | Ubicación | Trazabilidad / Justificación |\n`;
  md += `|---|---|---|---:|---|---|---|\n`;
  bom.forEach(item => {
    md += `| ${item.category} | ${item.element} | ${item.specification} | **${item.quantity}** | ${item.unit} | ${item.location} | ${item.traceability.engineeringJustification} |\n`;
  });
  md += `\n`;

  // 16. VALIDACIÓN FINAL
  md += `## 16. VALIDACIÓN FINAL (CHECKLIST DE INGENIERÍA)\n\n`;
  validations.forEach((val, i) => {
    const icon = val.passed ? '✅' : val.status === 'missing_data' ? '⚠️' : '❌';
    md += `${i + 1}. ${icon} **[${val.id}] ${val.title}:** ${val.detail}\n`;
  });
  md += `\n`;

  // 17. ERRORES / DATOS FALTANTES
  md += `## 17. ERRORES / DATOS FALTANTES\n\n`;
  if (missingDataList.length === 0 && errors.length === 0) {
    md += `✅ **No se detectaron errores ni datos faltantes.** El modelo eléctrico y la lista de materiales son 100% consistentes y conformes a norma técnica.\n`;
  } else {
    if (missingDataList.length > 0) {
      md += `### [DATO FALTANTE]\n`;
      missingDataList.forEach(item => {
        md += `- [DATO FALTANTE]: Se requiere especificar: **${item}**\n`;
      });
      md += `\n`;
    }
    if (errors.length > 0) {
      md += `### ERROR\n`;
      errors.forEach(err => {
        md += `- **ERROR:** ${err}\n`;
      });
      md += `\n`;
    }
  }

  return md;
}
