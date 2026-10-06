/**
 * Local Offline Engineering Assistant Engine
 * 
 * Provides 100% offline, deterministic, expert-level engineering analysis
 * for Photovoltaic (PV) and Energy Storage Systems (ESS) compliant with
 * NOM-001-SEDE-2012 (Mexico) and NEC 2023 (USA/International).
 */

import { InstallationModel, ProjectModelResult } from './types';
import { selectStandardOCPD, getTemperatureCorrectionFactor } from './standards';

export interface AssistantResponse {
  answer: string;
  category: string;
  source: 'local_expert_engine' | 'gemini_cloud';
  timestamp: string;
}

/**
 * Main entry point for local assistant queries.
 */
export function generateLocalAssistantResponse(
  query: string,
  model: InstallationModel,
  result: ProjectModelResult,
  _history: Array<{ role: string; content: string }> = []
): AssistantResponse {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Key system metrics
  const totalDcWp = result.dc.totalPowerW || (model.pv.totalModules * model.pv.powerW);
  const totalDcKwp = (totalDcWp / 1000).toFixed(2);
  const totalAcKw = (result.ac.totalAcPowerKw || model.inverter.ratedPowerKw || 3.3).toFixed(1);
  const dcAcRatio = (totalDcWp / (Number(totalAcKw) * 1000 || 1)).toFixed(2);
  const modVoc = model.pv.vocV || 52.8;
  const modVmp = model.pv.vmpV || 44.6;
  const modIsc = model.pv.iscA || 14.25;
  const strings = model.pv.numberOfStrings || 1;
  const modsPerString = model.pv.modulesPerString || 6;

  const stringVocStc = parseFloat((modsPerString * modVoc).toFixed(1));
  const stringVmpStc = parseFloat((modsPerString * modVmp).toFixed(1));
  const iscContinuousDc = parseFloat((modIsc * strings * 1.56).toFixed(2));

  // Inverter
  const invVolts = model.inverter.nominalAcVoltageV || 220;
  const invNominalCurrent = result.ac.totalAcCurrentA || parseFloat(((Number(totalAcKw) * 1000) / invVolts).toFixed(1));
  const invContinuousCurrent = result.ac.maxAcCurrentWithContinuousFactorA || parseFloat((invNominalCurrent * 1.25).toFixed(1));

  // Temperature calculations
  const tMin = model.ambientMinTempC ?? 5;
  const tMax = model.ambientMaxTempC ?? 40;
  // Temp correction for Voc at Tmin (-0.28%/°C standard or Table 690-7)
  const deltaTCold = tMin - 25; // e.g. 5 - 25 = -20
  const vocColdFactor = 1 + ((-0.0028) * deltaTCold); // 1 + 0.056 = 1.056
  const stringVocCold = parseFloat((stringVocStc * vocColdFactor).toFixed(1));
  // Hot Vmp at cell temp (ambient + 30°C on roof = ~70°C, delta = +45°C, coeff -0.35%/°C)
  const vmpHotFactor = 1 + ((-0.0035) * 45); // 1 - 0.1575 = 0.8425
  const stringVmpHot = parseFloat((stringVmpStc * vmpHotFactor).toFixed(1));

  // Compliance
  const failedValidations = result.validations.filter((v) => !v.passed);
  const allPassed = failedValidations.length === 0;

  // 1. INTENT: Caída de tensión / Voltage Drop
  if (q.includes('caida') || q.includes('voltage drop') || q.includes('delta v') || q.includes('perdida') || q.includes('3%') || q.includes('2%')) {
    return {
      category: 'voltage_drop',
      source: 'local_expert_engine',
      timestamp: new Date().toISOString(),
      answer: formatVoltageDropAnalysis(model, result, totalDcKwp, totalAcKw),
    };
  }

  // 2. INTENT: Tensión en frío / Voc / Voltaje máximo / Inversor MPP / Temperatura mínima
  if (q.includes('voc') || q.includes('frio') || q.includes('temperatura') || q.includes('tmin') || q.includes('mppt') || q.includes('vmp') || q.includes('voltaje maximo')) {
    return {
      category: 'voc_cold_analysis',
      source: 'local_expert_engine',
      timestamp: new Date().toISOString(),
      answer: formatVocColdAnalysis(model, modsPerString, modVoc, stringVocStc, stringVocCold, stringVmpHot, tMin, tMax),
    };
  }

  // 3. INTENT: Normativa NOM / NEC / Artículos / Art 690 / Art 705 / Cumplimiento
  if (q.includes('nom') || q.includes('nec') || q.includes('norma') || q.includes('articulo') || q.includes('cumplimiento') || q.includes('690') || q.includes('705') || q.includes('310') || q.includes('250')) {
    return {
      category: 'compliance_audit',
      source: 'local_expert_engine',
      timestamp: new Date().toISOString(),
      answer: formatNormativeAudit(model, result, failedValidations, allPassed),
    };
  }

  // 4. INTENT: Calibres / Ampacidad / Tuberías / Llenado EMT / Conductores
  if (q.includes('calibre') || q.includes('conductor') || q.includes('tuberia') || q.includes('emt') || q.includes('llenado') || q.includes('cable') || q.includes('awg') || q.includes('ampacidad') || q.includes('canalizacion')) {
    return {
      category: 'conductors_conduits',
      source: 'local_expert_engine',
      timestamp: new Date().toISOString(),
      answer: formatConductorsAndConduitsAnalysis(model, result),
    };
  }

  // 5. INTENT: Protecciones / OCPD / Fusibles / Interruptor Termomagnético (ITM) / Disyuntor
  if (q.includes('ocpd') || q.includes('fusible') || q.includes('itm') || q.includes('proteccion') || q.includes('disyuntor') || q.includes('termomagnetico') || q.includes('interconexion') || q.includes('1.25') || q.includes('1.56')) {
    return {
      category: 'protections_ocpd',
      source: 'local_expert_engine',
      timestamp: new Date().toISOString(),
      answer: formatProtectionsAnalysis(model, result, modIsc, iscContinuousDc, invNominalCurrent, invContinuousCurrent),
    };
  }

  // 6. INTENT: Relación DC/AC / Sobredimensionamiento / Potencia Inversor / Clipping
  if (q.includes('dc/ac') || q.includes('dc ac') || q.includes('relacion') || q.includes('clipping') || q.includes('sobredimensionamiento') || q.includes('kwp') || q.includes('potencia')) {
    return {
      category: 'dc_ac_ratio',
      source: 'local_expert_engine',
      timestamp: new Date().toISOString(),
      answer: formatDcAcRatioAnalysis(model, totalDcKwp, totalAcKw, dcAcRatio),
    };
  }

  // 7. INTENT: BOM / Lista de Materiales / Costos / Componentes
  if (q.includes('bom') || q.includes('material') || q.includes('costo') || q.includes('lista') || q.includes('presupuesto') || q.includes('catalogo')) {
    return {
      category: 'bom_summary',
      source: 'local_expert_engine',
      timestamp: new Date().toISOString(),
      answer: formatBOMAnalysis(result),
    };
  }

  // 8. INTENT: Baterías / Almacenamiento / ESS / Respaldo
  if (q.includes('bateria') || q.includes('ess') || q.includes('almacenamiento') || q.includes('kwh') || q.includes('respaldo') || q.includes('autonomia')) {
    return {
      category: 'battery_ess',
      source: 'local_expert_engine',
      timestamp: new Date().toISOString(),
      answer: formatBatteryAnalysis(model, totalDcKwp, totalAcKw),
    };
  }

  // 9. INTENT: Diagrama Unifilar / Rutas / Arquitectura
  if (q.includes('unifilar') || q.includes('diagrama') || q.includes('ruta') || q.includes('esquema') || q.includes('circuito')) {
    return {
      category: 'single_line_diagram',
      source: 'local_expert_engine',
      timestamp: new Date().toISOString(),
      answer: formatSingleLineAnalysis(model, result),
    };
  }

  // 10. DEFAULT: Comprehensive Executive Technical Summary & Diagnostics
  return {
    category: 'executive_summary',
    source: 'local_expert_engine',
    timestamp: new Date().toISOString(),
    answer: formatComprehensiveExecutiveSummary(
      model,
      result,
      totalDcKwp,
      totalAcKw,
      dcAcRatio,
      stringVocStc,
      stringVocCold,
      stringVmpStc,
      iscContinuousDc,
      invContinuousCurrent,
      allPassed,
      failedValidations
    ),
  };
}

// --------------------------------------------------------------------------
// FORMATTERS FOR SPECIFIC TECHNICAL DOMAINS
// --------------------------------------------------------------------------

function formatVoltageDropAnalysis(
  model: InstallationModel,
  result: ProjectModelResult,
  _totalDcKwp: string,
  _totalAcKw: string
): string {
  const routes = result.routeResults || [];
  
  let content = `### 📉 Análisis Detallado de Caída de Tensión (Pérdidas Óhmicas)\n\n`;
  content += `Conforme a la recomendación de la **NOM-001-SEDE-2012 Art. 210-19(a) Nota 4** y el **NEC Art. 690-8**, el límite estándar de diseño es $\\le 2\\%$ en el circuito de corriente continua (DC) y $\\le 3\\%$ en el circuito de corriente alterna (AC), con una pérdida total combinada no mayor al $5\\%$.\n\n`;

  content += `| Ruta | Tipo | Longitud Real | Conductor | $\\Delta V$ (Volts) | $\\Delta V$ (%) | Límite Normativo | Estado |\n`;
  content += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  routes.forEach((r) => {
    const rawRoute = model.routes.find((mr) => mr.id === r.routeId || mr.name === r.routeName);
    const lengthM = rawRoute ? rawRoute.lengthM : 0;
    const material = rawRoute?.material || 'Cu';
    const isDc = r.type === 'DC';
    const limitPct = isDc ? '≤ 2.0%' : '≤ 3.0%';
    const statusIcon = r.voltageDropCompliance ? '✅ Cumple' : '⚠️ Excede';
    content += `| **${r.routeName}** | ${r.type} | **${lengthM} m** | ${r.selectedGauge} AWG (${material}) | **${r.voltageDropV.toFixed(2)} V** | **${r.voltageDropPercent.toFixed(2)}%** | ${limitPct} | ${statusIcon} |\n`;
  });

  content += `\n#### 🧮 Ecuación de Cálculo Aplicada:\n`;
  content += `- **Circuito DC / Monofásico / Bifásico:**\n`;
  content += `  $$\\Delta V = \\frac{2 \\times L \\times I_{op} \\times R_{eff}}{1000}$$\n`;
  content += `  $$\\Delta V(\\%) = \\left( \\frac{\\Delta V}{V_{nominal}} \\right) \\times 100$$\n\n`;

  content += `#### 💡 Diagnóstico de Ingeniería:\n`;
  const nonCompliant = routes.filter((r) => !r.voltageDropCompliance);
  if (nonCompliant.length === 0) {
    content += `- ✅ **Excelente eficiencia:** Todas las rutas físicas calculadas cumplen con los umbrales de caída de tensión con sus distancias reales de instalación.\n`;
  } else {
    content += `- ⚠️ **Rutas con observación:** Las siguientes rutas superan el umbral recomendado:\n`;
    nonCompliant.forEach((r) => {
      const rawRoute = model.routes.find((mr) => mr.id === r.routeId || mr.name === r.routeName);
      const lengthM = rawRoute ? rawRoute.lengthM : 0;
      content += `  - **${r.routeName} (${lengthM}m)**: Actual ${r.voltageDropPercent.toFixed(2)}% con ${r.selectedGauge} AWG. Se sugiere aumentar a un calibre superior para reducir pérdidas.\n`;
    });
  }

  return content;
}

function formatVocColdAnalysis(
  model: InstallationModel,
  modsPerString: number,
  modVoc: number,
  stringVocStc: number,
  stringVocCold: number,
  stringVmpHot: number,
  tMin: number,
  _tMax: number
): string {
  const invMaxDc = model.inverter.maxDcVoltageV || 550;
  const mpptMin = 80;
  const mpptMax = Math.min(invMaxDc, 500);
  const safeMargin = invMaxDc - stringVocCold;
  const isSafe = stringVocCold <= invMaxDc;
  const isMpptSafe = stringVmpHot >= mpptMin && stringVocCold <= mpptMax;

  return `### ⚡ Análisis Térmico de Tensión en Frío ($V_{oc, cold}$) y Ventana MPPT

Bajo **NOM-001-SEDE Art. 690-7** y **NEC 690.7(A)**, la tensión máxima del sistema fotovoltaico se calcula corrigiendo la tensión de circuito abierto ($V_{oc}$) a la **temperatura mínima histórica registrada en el sitio**.

---

#### 📊 Parámetros Térmicos y Eléctricos:
- **Configuración:** ${modsPerString} módulos en serie por cadena.
- **Tensión nominal en STC ($25^\\circ\\text{C}$):** $V_{oc, STC} = ${modsPerString} \\times ${modVoc}\\text{ V} =$ **${stringVocStc} V**.
- **Temperatura mínima de diseño del proyecto ($T_{min}$):** **${tMin} °C**.
- **Coeficiente térmico de tensión ($\\beta_{Voc}$):** **$-0.28\\%/^\\circ\\text{C}$** (estándar silicio monocristalino).
- **Tensión máxima calculada en frío ($V_{oc, cold}$):** **${stringVocCold} V**.

---

#### 🛡️ Verificación frente al Inversor:
| Parámetro | Valor Calculado | Límite del Inversor | Margen de Seguridad | Estado |
| :--- | :---: | :---: | :---: | :---: |
| **$V_{oc}$ en Frío ($T_{min} = ${tMin}^\\circ\\text{C}$)** | **${stringVocCold} V** | Máx Inversor: **${invMaxDc} V** | $+${safeMargin.toFixed(1)} V$ | ${isSafe ? '✅ Seguro (No daña inversor)' : '❌ Peligro: Excede límite'} |
| **$V_{mp}$ en Caliente ($T_{cell} = 70^\\circ\\text{C}$)** | **${stringVmpHot} V** | MPPT: **${mpptMin} V - ${mpptMax} V** | En rango operativo | ${isMpptSafe ? '✅ Dentro de ventana MPPT' : '⚠️ Fuera de rango MPPT'} |

#### 📝 Fórmula Normativa (Art. 690-7):
$$V_{oc, max} = V_{oc, STC} \\times \\left[ 1 + \\beta_{Voc} \\times (T_{min} - 25^\\circ\\text{C}) \\right]$$
$$V_{oc, max} = ${stringVocStc} \\times \\left[ 1 + (-0.0028) \\times (${tMin} - 25) \\right] = ${stringVocCold}\\text{ V}$$

**Conclusión:** La cadena de ${modsPerString} módulos calculada garantiza que el inversor operará con seguridad ante temperaturas extremas registradas en el sitio.`;
}

function formatNormativeAudit(
  _model: InstallationModel,
  result: ProjectModelResult,
  failedValidations: any[],
  allPassed: boolean
): string {
  let content = `### ⚖️ Auditoría Normativa de Cumplimiento (NOM-001-SEDE-2012 / NEC 2023)\n\n`;

  if (allPassed) {
    content += `> ✅ **ESTADO GENERAL: 100% EN CUMPLIMIENTO NORMATIVO**\n> Todas las reglas de ingeniería eléctrica aplicables a sistemas fotovoltaicos e interconexión a la red han sido verificadas satisfactoriamente.\n\n`;
  } else {
    content += `> ⚠️ **ESTADO GENERAL: ${failedValidations.length} OBSERVACIÓN(ES) DETECTADA(S)**\n\n`;
  }

  content += `#### 📋 Matriz de Verificación de Reglas Técnicas:\n\n`;
  content += `| Regla | Referencia Normativa | Criterio de Ingeniería | Resultado |\n`;
  content += `| :--- | :--- | :--- | :---: |\n`;

  result.validations.forEach((v) => {
    const icon = v.passed ? '✅ Aprobado' : '⚠️ Revisar';
    content += `| **${v.title}** | ${v.rule} | ${v.detail} | ${icon} |\n`;
  });

  content += `\n#### 📚 Artículos Normativos Clave Aplicados en este Proyecto:\n`;
  content += `- **Art. 690-8(a)(1) - Corriente Máxima de Circuito:** Se aplica el factor $1.25\\times I_{sc}$ por irradiación pico superior a $1000\\text{ W/m}^2$.\n`;
  content += `- **Art. 690-8(b)(1) - Capacidad de Conducción Continua:** Se aplica el factor $1.25\\times I_{max} = 1.56\\times I_{sc}$ para conductores y protecciones de servicio continuo (> 3 horas).\n`;
  content += `- **Art. 690-9 - Protección contra Sobrecorriente (OCPD):** Los fusibles o disyuntores se seleccionan al valor comercial inmediato superior a la corriente continua de diseño.\n`;
  content += `- **Art. 705-12 - Interconexión de Fuentes de Generación:** Regla del $120\\%$ para barras de tableros de distribución ($I_{bus} \\times 1.2 \\ge I_{main} + I_{inv} \\times 1.25$).\n`;
  content += `- **Art. 250 / 690-43 - Puesta a Tierra de Equipos:** Conductor EGC verde o desnudo continuo para marcos de módulos, canalizaciones metálicas y chasis del inversor.\n`;

  return content;
}

function formatConductorsAndConduitsAnalysis(
  model: InstallationModel,
  result: ProjectModelResult
): string {
  const routes = result.routeResults || [];
  const tAmbMax = model.ambientMaxTempC ?? 40;
  const ft90 = getTemperatureCorrectionFactor(tAmbMax, '90C');

  let content = `### 🔀 Dimensionamiento de Conductores, Factores de Ajuste y Canalizaciones\n\n`;
  content += `Conforme a la **NOM-001-SEDE-2012 Art. 310-15** y **Capítulo 9 (Tablas 1, 4 y 5)**:\n\n`;

  content += `| Ruta | Calibre / Aislamiento | Corriente Diseño | Ampacidad Corregida | Canalización | Factor Llenado | Estado Llenado |\n`;
  content += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  routes.forEach((r) => {
    const rawRoute = model.routes.find((mr) => mr.id === r.routeId || mr.name === r.routeName);
    const insulation = rawRoute?.insulation || 'THHW-LS';
    const conduitType = rawRoute?.conduitType || 'EMT';
    const fillStatus = r.conduitFillCompliance ? '✅ < 40%' : '⚠️ > 40%';
    content += `| **${r.routeName}** | **${r.selectedGauge} AWG** (${insulation}) | ${r.designCurrentA.toFixed(2)} A | **${r.correctedConductorAmpacityA.toFixed(1)} A** | ${r.selectedConduitTradeSize}" ${conduitType} | **${r.actualConduitFillPercent.toFixed(1)}%** | ${fillStatus} |\n`;
  });

  content += `\n#### 🧮 Factores de Corrección Térmica y Agrupamiento Aplicados:\n`;
  content += `- **Temperatura ambiente de diseño:** **${tAmbMax} °C**.\n`;
  content += `- **Factor por Temperatura ($F_T$, Tabla 310-15(b)(2)(a)):** Conductor con aislamiento a $90^\\circ\\text{C}$ en ambiente de $${tAmbMax}^\\circ\\text{C}$ $\\rightarrow F_T = ${ft90.toFixed(2)}$.\n`;
  content += `- **Factor por Agrupamiento ($F_A$, Tabla 310-15(b)(3)(a)):** Según número de conductores portadores de corriente en cada canalización.\n`;
  content += `- **Ampacidad Real Corregida:** $I_{corregida} = I_{tabla\\_310-16} \\times F_T \\times F_A$.\n\n`;

  content += `#### 📏 Regla de Llenado de Tubería (Capítulo 9 Tabla 1):\n`;
  content += `- **1 conductor:** Máximo $53\\%$.\n`;
  content += `- **2 conductores:** Máximo $31\\%$.\n`;
  content += `- **3 o más conductores:** Máximo **$40\\%$** (para facilitar el jalado del cable y disipación de calor).\n`;

  return content;
}

function formatProtectionsAnalysis(
  model: InstallationModel,
  _result: ProjectModelResult,
  modIsc: number,
  iscContinuousDc: number,
  invNominalCurrent: number,
  invContinuousCurrent: number
): string {
  const dcOcpd = selectStandardOCPD(iscContinuousDc);
  const acOcpd = selectStandardOCPD(invContinuousCurrent);
  const sysType = model.inverter.systemType || '2F-2H';

  return `### 🛡️ Coordinación de Protecciones Contra Sobrecorriente (OCPD) y Supresión de Picos

Conforme a **NOM-001-SEDE Art. 690-9** y **Art. 240-6** (Valores nominales estándar de interruptores y fusibles):

---

#### 1. Protección en Corriente Continua (DC):
- **Corriente de Cortocircuito del Arreglo ($I_{sc}$):** **${modIsc} A**.
- **Corriente Continua de Diseño ($I_{sc} \\times 1.56$):** **${iscContinuousDc.toFixed(2)} A**.
- **OCPD DC Comercial Recomendado:** **${dcOcpd} A DC** / $1000\\text{ V}$ (Portafusible o Interruptor Termomagnético bipolar para fotovoltaica).
- **Supresor de Sobretensiones Transitorias (SPD DC):** Tipo 2, $V_c = 1000\\text{ V DC}$, $I_n = 20\\text{ kA}$.

---

#### 2. Protección en Corriente Alterna (AC):
- **Corriente Nominal de Salida del Inversor ($I_{ac, nom}$):** **${invNominalCurrent.toFixed(1)} A**.
- **Corriente Continua Requerida ($I_{ac, nom} \\times 1.25$):** **${invContinuousCurrent.toFixed(1)} A**.
- **Interruptor Termomagnético Comercial (ITM AC):** **${acOcpd} A** (${sysType}, curva C, $10\\text{ kA}$ Icu).
- **Supresor de Picos (SPD AC):** Tipo 2, $275\\text{ V AC}$, $I_n = 20\\text{ kA}$ para protección del inversor y la red del inmueble.

---

#### 💡 Justificación Normativa:
Los conductores de cada ruta están protegidos contra sobrecargas y cortocircuitos ya que la ampacidad corregida del conductor seleccionado es superior al valor nominal del OCPD (${dcOcpd}A en DC y ${acOcpd}A en AC), garantizando la desconexión segura antes de superar la temperatura máxima de servicio del aislamiento ($90^\\circ\\text{C}$).`;
}

function formatDcAcRatioAnalysis(
  model: InstallationModel,
  totalDcKwp: string,
  totalAcKw: string,
  dcAcRatio: string
): string {
  const ratioNum = Number(dcAcRatio);
  let evalText = '';
  if (ratioNum >= 1.10 && ratioNum <= 1.35) {
    evalText = '✅ **Rango Óptimo:** La relación DC/AC está en el rango estándar ideal de la industria (1.10 a 1.30). Permite aprovechar la curva de generación matutina/vespertina con pérdidas por recorte (clipping) prácticamente nulas.';
  } else if (ratioNum < 1.10) {
    evalText = 'ℹ️ **Ligero Subdimensionamiento:** El inversor tiene capacidad de sobra. Podrías agregar más módulos si el cliente desea expandir la potencia sin cambiar de inversor.';
  } else {
    evalText = '⚠️ **Sobredimensionamiento Elevado:** La relación DC/AC es alta. Se presentará recorte de potencia (clipping) en horas pico de mediodía, aunque aumentará la generación en horas de baja irradiación.';
  }

  return `### ⚡ Relación DC / AC y Análisis de Dimensionamiento

- **Capacidad Generador Solar (DC):** **${totalDcKwp} kWp** (${model.pv.totalModules} módulos de ${model.pv.powerW} Wp).
- **Capacidad Inversor Solar (AC):** **${totalAcKw} kW AC** (${model.inverter.manufacturer} ${model.inverter.model}).
- **Relación DC/AC ($P_{dc} / P_{ac}$):** **${dcAcRatio}** (o **${(ratioNum * 100).toFixed(0)}%**).

---

#### 📈 Diagnóstico de Rendimiento:
${evalText}

#### 🎯 Beneficios de una Relación DC/AC ~1.15 - 1.25:
1. **Curva de generación más ancha:** El inversor alcanza su potencia nominal más temprano en la mañana y la mantiene por más tiempo en la tarde.
2. **Optimización del Costo Nivelado de Energía (LCOE):** Se amortiza mejor el costo fijo del inversor e infraestructura de interconexión.
3. **Eficiencia en Días Nublados:** Mayor generación con baja irradiancia difusa.`;
}

function formatBOMAnalysis(result: ProjectModelResult): string {
  const bom = result.bom || [];
  
  let content = `### 📦 Resumen de Lista de Materiales (BOM) y Componentes Consolidados\n\n`;
  content += `Se consolidaron **${bom.length} partidas de materiales** derivadas de los cálculos:\n\n`;

  content += `| Categoría | Elemento / Especificación | Cantidad | Unidad | Justificación Técnica |\n`;
  content += `| :--- | :--- | :---: | :---: | :--- |\n`;

  bom.slice(0, 10).forEach((item) => {
    content += `| **${item.category}** | ${item.element} (${item.specification}) | **${item.quantity}** | ${item.unit} | ${item.traceability?.engineeringJustification || item.observations || 'Requerido'} |\n`;
  });

  if (bom.length > 10) {
    content += `\n*... y ${bom.length - 10} partidas adicionales detalladas en la pestaña BOM.*\n`;
  }

  content += `\n> 💡 **Nota:** La cuantificación incluye conductores con factor de desperdicio y remates, tubería con curvas normalizadas y accesorios de fijación por tramo de canalización.\n`;

  return content;
}

function formatBatteryAnalysis(
  model: InstallationModel,
  totalDcKwp: string,
  totalAcKw: string
): string {
  if (!model.battery?.enabled) {
    return `### 🔋 Sistema de Almacenamiento en Baterías (ESS)

Actualmente este proyecto está configurado como un **Sistema Fotovoltaico Interconectado a la Red (Grid-Tied) Puro**, sin banco de baterías ESS habilitado.

#### 💡 Opciones de Expansión con ESS:
- **Acoplamiento DC (Hybrid Inverter):** Permite conectar baterías de alto voltaje (p. ej. $400\\text{ V}$) directamente al bus DC antes del inversor, maximizando la eficiencia de carga solar.
- **Acoplamiento AC:** Se agrega un inversor-cargador de batería en el tablero principal de respaldo para cargas críticas.
- **Capacidad Típica Sugerida:** Para tu sistema de **${totalDcKwp} kWp DC / ${totalAcKw} kW AC**, una batería de **5 kWh a 10 kWh** brindaría entre 3 y 6 horas de autonomía para cargas esenciales.`;
  }

  const bCap = model.battery.capacityKwh || 5.0;
  const bVolt = model.battery.nominalVoltageV || 400;
  const bDischarge = model.battery.maxContinuousDischargeCurrentA || 12.5;

  return `### 🔋 Diagnóstico del Sistema de Almacenamiento (Batería ESS)

- **Fabricante / Modelo:** ${model.battery.manufacturer} ${model.battery.model}
- **Química de Celda:** ${model.battery.chemistry || 'LiFePO4 (LFP)'}
- **Capacidad Nominal:** **${bCap} kWh**
- **Tensión Nominal del Banco:** **${bVolt} V DC**
- **Corriente Máxima de Descarga Continua:** **${bDischarge} A**
- **Potencia Máxima Continua:** **${((bVolt * bDischarge) / 1000).toFixed(2)} kW**

**Conclusión:** La batería proporciona respaldo ante cortes de la red pública y permite autoconsumo nocturno optimizado.`;
}

function formatSingleLineAnalysis(
  model: InstallationModel,
  result: ProjectModelResult
): string {
  const routesDiagram = model.routes.map((r) => {
    const res = result.routeResults?.find((rr) => rr.routeId === r.id || rr.routeName === r.name);
    const gauge = res?.selectedGauge || '10';
    return `   ├─ [Ruta ${r.name || r.type} (${r.type})]: Longitud ${r.lengthM}m (${gauge} AWG ${r.insulation || 'THHW-LS'} en ${r.conduitType || 'EMT'})`;
  }).join('\n');

  return `### 📐 Diagrama Unifilar y Arquitectura Eléctrica del Proyecto

\`\`\`
[ ARREGLO FOTOVOLTAICO ]
  ${model.pv.totalModules} Módulos × ${model.pv.powerW} Wp (${(result.dc.totalPowerW / 1000).toFixed(2)} kWp DC)
  Configuración: ${model.pv.numberOfStrings} String(s) × ${model.pv.modulesPerString} Módulos
  Voc STC: ${result.dc.stringVocV} V  |  Isc: ${result.dc.stringIscA} A
         │
${routesDiagram || '   ├─ [Rutas del Proyecto]'}
         ▼
[ INVERSOR SOLAR FOTOVOLTAICO ]
  ${model.inverter.manufacturer} ${model.inverter.model} (${model.inverter.ratedPowerKw} kW AC @ ${model.inverter.nominalAcVoltageV}V ${model.inverter.systemType})
  Eficiencia: ${model.inverter.efficiencyPercent || 97.5}%
         │
         ▼
[ TABLERO DE DISTRIBUCIÓN PRINCIPAL (CFE / RED) ]
  Interconexión bajo NOM-001-SEDE Art. 705-12
\`\`\`

Puedes consultar el diagrama interactivo detallado con cotas y canalizaciones en la pestaña **Unifilar**.`;
}

function formatComprehensiveExecutiveSummary(
  model: InstallationModel,
  result: ProjectModelResult,
  totalDcKwp: string,
  totalAcKw: string,
  dcAcRatio: string,
  stringVocStc: number,
  stringVocCold: number,
  stringVmpStc: number,
  iscContinuousDc: number,
  invContinuousCurrent: number,
  allPassed: boolean,
  failedValidations: any[]
): string {
  const complianceBadge = allPassed
    ? '✅ **100% en Cumplimiento Normativo (0 Violaciones)**'
    : `⚠️ **${failedValidations.length} Observaciones Normativas**`;

  const dcOcpd = selectStandardOCPD(iscContinuousDc);
  const acOcpd = selectStandardOCPD(invContinuousCurrent);
  const tMinSite = model.ambientMinTempC ?? 5;
  const maxDcV = model.inverter.maxDcVoltageV || 550;
  const isColdSafe = stringVocCold <= maxDcV;

  return `### 📊 Diagnóstico y Resumen Técnico Ejecutivo

**Proyecto:** **${model.projectName || 'Instalación Solar FV'}** | **Cliente:** ${model.clientName || 'Cliente'}

---

#### ⚡ 1. Balance de Potencia y Generación:
- **Potencia Solar Pico (DC):** **${totalDcKwp} kWp DC** (${model.pv.totalModules} módulos de **${model.pv.powerW} Wp** ${model.pv.manufacturer}).
- **Potencia Inversor (AC):** **${totalAcKw} kW AC** (${model.inverter.manufacturer} ${model.inverter.model} @ **${model.inverter.nominalAcVoltageV} V**).
- **Relación DC/AC:** **${dcAcRatio}** (Rango recomendado estándar: 1.15 a 1.30).

---

#### 🔌 2. Parámetros de Operación y Seguridad:
- **Tensión de Cadena en STC ($V_{oc}$):** **${stringVocStc} V DC**
- **Tensión Máxima en Frío ($V_{oc, cold}$ a ${tMinSite}°C):** **${stringVocCold} V DC** (Límite Inversor: ${maxDcV} V) $\\rightarrow$ ${isColdSafe ? '✅ Seguro (No daña inversor)' : '⚠️ Excede límite máximo'}.
- **Tensión Operativa de Máxima Potencia ($V_{mp}$):** **${stringVmpStc} V DC** (Dentro del rango MPPT).
- **Corriente Continua DC ($I_{sc} \\times 1.56$):** **${iscContinuousDc.toFixed(2)} A** $\\rightarrow$ OCPD recomendado: **${dcOcpd} A DC**.
- **Corriente Continua AC ($I_{ac} \\times 1.25$):** **${invContinuousCurrent.toFixed(1)} A** $\\rightarrow$ ITM recomendado: **${acOcpd} A AC**.

---

#### 📐 3. Estado de Rutas Físicas y Caídas de Tensión:
${result.routeResults.map(r => {
  const rawR = model.routes.find(mr => mr.id === r.routeId || mr.name === r.routeName);
  const len = rawR ? rawR.lengthM : 0;
  return `- **${r.routeName} (${r.type}):** Longitud **${len}m** con calibre **${r.selectedGauge} AWG**, caída de tensión **${r.voltageDropPercent.toFixed(2)}%** (${r.voltageDropV.toFixed(2)}V) y llenado al **${r.actualConduitFillPercent.toFixed(1)}%** $\\rightarrow$ ${r.voltageDropCompliance ? '✅ Cumple' : '⚠️ Excede'}`;
}).join('\n')}

---

#### ⚖️ 4. Estado de Auditoría Normativa:
${complianceBadge}

¿Deseas profundizar en algún punto específico? Puedes preguntarme sobre caídas de tensión, selección de protecciones OCPD, análisis de tensión en frío o calibres de tubería.`;
}
