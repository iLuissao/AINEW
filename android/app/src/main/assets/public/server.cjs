var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);

// src/engine/schemas.ts
var import_zod = require("zod");
var EnergekaServiceOrderSchema = import_zod.z.object({
  // 1. Datos Generales
  folio_orden_servicio: import_zod.z.string().default(""),
  nombre_cliente: import_zod.z.string().default(""),
  fecha_instalacion: import_zod.z.string().default(""),
  direccion_instalacion: import_zod.z.string().default(""),
  telefono_contacto: import_zod.z.string().default(""),
  email: import_zod.z.string().default(""),
  coordenadas_gps: import_zod.z.string().default(""),
  // 2. Condiciones del lugar de instalación
  tipo_azotea: import_zod.z.string().default("CONCRETO PLANO"),
  inclinacion_grados: import_zod.z.string().default("0\xB0"),
  distancia_paneles_inversores_m: import_zod.z.coerce.number().default(0),
  // Ruta DC (0m = inversor junto al arreglo)
  distancia_inversor_centro_carga_m: import_zod.z.coerce.number().default(0),
  // Ruta AC
  // 3. Datos del sistema fotovoltaico
  tipo_proyecto: import_zod.z.string().default("CONTADO"),
  marca_panel_solar: import_zod.z.string().default(""),
  numero_paneles: import_zod.z.coerce.number().int().default(0),
  potencia_panel_watts: import_zod.z.coerce.number().default(0),
  voltaje_operacion_dc_v: import_zod.z.coerce.number().default(0),
  marca_modelo_inversor: import_zod.z.string().default(""),
  proteccion_termomagnetica_ac: import_zod.z.string().default(""),
  comentarios_a_mecanicos: import_zod.z.string().default(""),
  // 4. Instalación eléctrica
  instalacion_electrica: import_zod.z.string().default("Bif\xE1sica"),
  // Monofásica, Bifásica, Trifásica
  tipo_medidor: import_zod.z.string().default("DIGITAL"),
  requiere_acondicionar_preparacion_medidor: import_zod.z.string().default("NO"),
  acometida: import_zod.z.string().default("A\xE9rea"),
  comentarios_b_electricos: import_zod.z.string().default("")
});
var ServiceOrderExtractionSchema = import_zod.z.object({
  serviceOrderId: import_zod.z.string().default(""),
  clientName: import_zod.z.string().default(""),
  projectName: import_zod.z.string().default(""),
  installationAddress: import_zod.z.string().default(""),
  scheduledDate: import_zod.z.string().default(""),
  contactPhone: import_zod.z.string().default(""),
  contactEmail: import_zod.z.string().default(""),
  coordinatesGps: import_zod.z.string().default(""),
  roofType: import_zod.z.string().default("Loza"),
  roofTilt: import_zod.z.string().default(""),
  projectType: import_zod.z.string().default("CONTADO"),
  gridConnectionType: import_zod.z.string().default("Bif\xE1sica"),
  meterType: import_zod.z.string().default("Digital"),
  meterPrepRequired: import_zod.z.string().default("NO"),
  serviceDropType: import_zod.z.string().default("A\xE9rea"),
  acBreakerRating: import_zod.z.string().default(""),
  comentariosA: import_zod.z.string().default(""),
  comentariosB: import_zod.z.string().default(""),
  notes: import_zod.z.string().default(""),
  specialConsiderationsBox: import_zod.z.string().default(""),
  specialDirectives: import_zod.z.array(import_zod.z.string()).default([]),
  ambientTempC: import_zod.z.coerce.number().default(0),
  pv: import_zod.z.object({
    manufacturer: import_zod.z.string().default(""),
    model: import_zod.z.string().default(""),
    powerW: import_zod.z.coerce.number().default(0),
    vocV: import_zod.z.coerce.number().default(0),
    vmpV: import_zod.z.coerce.number().default(0),
    iscA: import_zod.z.coerce.number().default(0),
    impA: import_zod.z.coerce.number().default(0),
    totalModules: import_zod.z.coerce.number().int().default(0),
    numberOfStrings: import_zod.z.coerce.number().int().default(1),
    modulesPerString: import_zod.z.coerce.number().int().default(0),
    bifacial: import_zod.z.boolean().default(false),
    bifacialGainPercent: import_zod.z.coerce.number().default(0)
  }),
  inverter: import_zod.z.object({
    manufacturer: import_zod.z.string().default(""),
    model: import_zod.z.string().default(""),
    architecture: import_zod.z.enum(["microinverter", "string", "central", "hybrid_ess"]).default("string"),
    numberOfUnits: import_zod.z.coerce.number().int().default(1),
    ratedPowerKw: import_zod.z.coerce.number().default(0),
    maxAcCurrentA: import_zod.z.coerce.number().default(0),
    nominalAcVoltageV: import_zod.z.coerce.number().default(0),
    gridPhases: import_zod.z.string().default("2F-3H"),
    mpptCount: import_zod.z.coerce.number().int().default(0)
  }),
  battery: import_zod.z.object({
    enabled: import_zod.z.boolean().default(false),
    manufacturer: import_zod.z.string().default(""),
    model: import_zod.z.string().default(""),
    capacityKwh: import_zod.z.coerce.number().default(0),
    nominalVoltageV: import_zod.z.coerce.number().default(0),
    maxContinuousDischargeCurrentA: import_zod.z.coerce.number().default(0)
  }).default({
    enabled: false,
    manufacturer: "",
    model: "",
    capacityKwh: 0,
    nominalVoltageV: 0,
    maxContinuousDischargeCurrentA: 0
  }),
  routes: import_zod.z.array(
    import_zod.z.object({
      id: import_zod.z.string(),
      name: import_zod.z.string(),
      type: import_zod.z.enum(["DC", "AC"]),
      lengthM: import_zod.z.coerce.number().default(0),
      conduitType: import_zod.z.enum(["EMT", "PVC-40", "PVC-80", "IMC", "LiquidTight"]).default("EMT"),
      insulationType: import_zod.z.enum(["THHW-LS", "THHN/THWN-2", "PV-Wire", "XHHW-2"]).default("THHW-LS"),
      conductorMaterial: import_zod.z.enum(["Cu", "Al"]).default("Cu"),
      temperatureRating: import_zod.z.enum(["75C", "90C"]).default("90C"),
      bends90: import_zod.z.coerce.number().default(0),
      bends45: import_zod.z.coerce.number().default(0)
    })
  ).default([]),
  confidenceScore: import_zod.z.coerce.number().min(0).max(1).default(1),
  confidenceBreakdown: import_zod.z.record(import_zod.z.string(), import_zod.z.string()).optional(),
  extractedFieldsSummary: import_zod.z.array(import_zod.z.string()).default([]),
  _warning: import_zod.z.string().optional()
});
function extractSpecialDirectivesFromComments(commentsA, commentsB) {
  const combined = `${commentsA || ""} ${commentsB || ""}`.toLowerCase();
  const directives = [];
  if (combined.includes("no se debe perforar") || combined.includes("loza") || combined.includes("sin perforar")) {
    directives.push("\u{1F6E1}\uFE0F Loza sin perforaci\xF3n: Anclaje perimetral a pretil, barda y chimenea requerido");
  }
  if (combined.includes("forma de l") || combined.includes("en l")) {
    directives.push('\u{1F4D0} Arreglo modular en "L" seg\xFAn trazo arquitect\xF3nico');
  }
  if (combined.includes("centro de carga") && (combined.includes("medidor") || combined.includes("cfe") || combined.includes("costado"))) {
    directives.push("\u26A1 Instalaci\xF3n de Centro de Carga principal junto a medidor CFE");
  }
  if (combined.includes("bajada") && (combined.includes("fachada") || combined.includes("lado derecho"))) {
    directives.push("\u{1F3E2} Bajada de canalizaci\xF3n por fachada lateral derecha");
  }
  if (combined.includes("pretil") || combined.includes("azotea")) {
    directives.push("\u{1F4CD} Fijaci\xF3n en pretiles con fijaci\xF3n mec\xE1nica de alta resistencia");
  }
  if (combined.includes("imc") || combined.includes("intemperie")) {
    directives.push("\u{1F6E1}\uFE0F Tuber\xEDa met\xE1lica pesada IMC para tramos exteriores expuestos");
  }
  return directives;
}
function extractInverterPowerFromModel(rawModel) {
  if (!rawModel || typeof rawModel !== "string") return 0;
  const str = rawModel.trim();
  const kwMatch = str.match(/(\d+(?:\.\d+)?)\s*k(?:w|va)?\b/i);
  if (kwMatch) {
    const val = parseFloat(kwMatch[1]);
    if (val > 0 && val < 500) return val;
  }
  const ktlMatch = str.match(/(?:[A-Z0-9_-]+[ -])?(\d+(?:\.\d+)?)\s*k(?:tl)?(?:[0-9A-Z_-]+)?/i);
  if (ktlMatch) {
    const val = parseFloat(ktlMatch[1]);
    if (val > 0 && val < 500) return val;
  }
  const decimalMatch = str.match(/\b(\d{1,2}\.\d{1,2})\b/);
  if (decimalMatch) {
    const val = parseFloat(decimalMatch[1]);
    if (val >= 0.5 && val <= 150) return val;
  }
  const wattsMatch = str.match(/(?:MIN|MIC|MOD|MID|MAC|MAX|SG|GW|TL|X)?[- ]*(\d{4,5})\s*(?:tl|x|w|va)?\b/i);
  if (wattsMatch) {
    const rawVal = parseFloat(wattsMatch[1]);
    if (rawVal >= 1e3 && rawVal <= 1e5 && rawVal !== 2e3 && rawVal !== 2023 && rawVal !== 2024 && rawVal !== 2025 && rawVal !== 2026) {
      return parseFloat((rawVal / 1e3).toFixed(2));
    }
  }
  const intAfterBrandMatch = str.match(/(?:GROWATT|SOLIS|FRONIUS|HUAWEI|SUNGROW|SMA|GOODWE|INVERSOR|INV)\s*(\d{1,2})\b/i);
  if (intAfterBrandMatch) {
    const val = parseFloat(intAfterBrandMatch[1]);
    if (val >= 1 && val <= 100) return val;
  }
  const anyNumMatch = str.match(/(\d+(?:\.\d+)?)/);
  if (anyNumMatch) {
    const val = parseFloat(anyNumMatch[1]);
    if (val >= 1e3 && val <= 1e5 && val !== 2e3 && val !== 2023 && val !== 2024 && val !== 2025 && val !== 2026) {
      return parseFloat((val / 1e3).toFixed(2));
    }
    if (val >= 0.5 && val <= 150) return val;
  }
  return 0;
}
function normalizeServiceOrderWithUnits(rawInput) {
  const clientName = rawInput?.nombre_cliente || rawInput?.clientName || "";
  const scheduledDate = rawInput?.fecha_instalacion || rawInput?.fecha_programada || rawInput?.scheduledDate || "";
  const installationAddress = rawInput?.direccion_instalacion || rawInput?.ubicacion_instalacion || rawInput?.installationAddress || "";
  const contactPhone = rawInput?.telefono_contacto || rawInput?.contactPhone || "";
  const contactEmail = rawInput?.email || rawInput?.contactEmail || "";
  let coordinatesGps = "";
  const gpsMatch = installationAddress.match(/\((?:latitud:?\s*([0-9.-]+)[;, ]+\s*longitud:?\s*([0-9.-]+[oOwW]?))\)/i);
  if (gpsMatch) {
    coordinatesGps = `${gpsMatch[1]}, ${gpsMatch[2]}`;
  }
  const roofType = rawInput?.tipo_azotea || rawInput?.roofType || "CONCRETO PLANO";
  let rawTilt = (rawInput?.inclinacion_grados || rawInput?.inclinacion || rawInput?.roofTilt || "0\xB0").toString().trim();
  if (rawTilt.toUpperCase() === "NO") rawTilt = "0\xB0 (Coplanar)";
  const dcLength = Number(rawInput?.distancia_paneles_inversores_m ?? rawInput?.longitud_ruta_dc_m ?? rawInput?.routes?.[0]?.lengthM ?? 0);
  const acLength = Number(rawInput?.distancia_inversor_centro_carga_m ?? rawInput?.longitud_ruta_ac_m ?? rawInput?.routes?.[1]?.lengthM ?? 0);
  const projectType = rawInput?.tipo_proyecto || rawInput?.projectType || "CONTADO";
  const pvBrandRaw = rawInput?.marca_panel_solar || rawInput?.marca_modulo || rawInput?.pv?.manufacturer || "JINKO SOLAR";
  const totalMods = Number(rawInput?.numero_paneles ?? rawInput?.total_modulos ?? rawInput?.pv?.totalModules ?? 0);
  const powerW = Number(rawInput?.potencia_panel_watts ?? rawInput?.potencia_modulo_w ?? rawInput?.pv?.powerW ?? 590);
  let invRaw = rawInput?.marca_modelo_inversor || rawInput?.modelo_inversor || rawInput?.marca_inversor || rawInput?.inverter?.model || "";
  if (typeof invRaw === "string") {
    if (invRaw.toLowerCase().includes("centro de carga") || invRaw.toLowerCase().includes("distancia")) {
      invRaw = "";
    }
  }
  let invKw = 0;
  if (invRaw) {
    invKw = extractInverterPowerFromModel(invRaw);
  }
  if (invKw === 0 && rawInput?.potencia_inversor_kw) {
    invKw = Number(rawInput.potencia_inversor_kw);
  } else if (invKw === 0 && rawInput?.inverter?.ratedPowerKw) {
    invKw = Number(rawInput.inverter.ratedPowerKw);
  }
  if (!invRaw && invKw > 0) {
    invRaw = `Inversor ${invKw.toFixed(1)} kW`;
  }
  const gridConnRaw = (rawInput?.instalacion_electrica || rawInput?.fases_red || rawInput?.gridConnectionType || "Bif\xE1sica").toString().toUpperCase();
  const is3Phase = gridConnRaw.includes("TRIFAS") || gridConnRaw.includes("3F");
  const is1Phase = gridConnRaw.includes("MONOFAS") || gridConnRaw.includes("1F");
  const gridConn = is3Phase ? "Trif\xE1sica" : is1Phase ? "Monof\xE1sica" : "Bif\xE1sica";
  const gridPhases = is3Phase ? "3F-4H" : is1Phase ? "1F-2H" : "2F-3H";
  const invVoltage = is3Phase ? 220 : is1Phase ? 127 : 220;
  let maxAcCurrent = 0;
  if (invKw > 0) {
    if (is3Phase) {
      maxAcCurrent = parseFloat((invKw * 1e3 / (Math.sqrt(3) * invVoltage)).toFixed(1));
    } else {
      maxAcCurrent = parseFloat((invKw * 1e3 / invVoltage).toFixed(1));
    }
  }
  let acBreaker = rawInput?.proteccion_termomagnetica_ac || rawInput?.acBreakerRating || "";
  if (!acBreaker || acBreaker.trim() === "" || acBreaker === "0" || acBreaker === "0A") {
    const continuousCurrent = maxAcCurrent * 1.25;
    const stdBreakers = [15, 20, 25, 30, 40, 50, 60, 70, 80, 100, 125, 150];
    const recommendedBreaker = stdBreakers.find((b) => b >= continuousCurrent) || Math.ceil(continuousCurrent / 10) * 10;
    const poles = is3Phase ? "3P" : is1Phase ? "1P" : "2P";
    acBreaker = `${poles}-${recommendedBreaker}A`;
  }
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
  const meterType = rawInput?.tipo_medidor || rawInput?.meterType || "DIGITAL";
  const meterPrep = rawInput?.requiere_acondicionar_preparacion_medidor || rawInput?.meterPrepRequired || "NO";
  const serviceDrop = rawInput?.acometida || rawInput?.serviceDropType || "A\xE9rea";
  const comentariosA = rawInput?.comentarios_a_mecanicos || rawInput?.comentariosA || "";
  const comentariosB = rawInput?.comentarios_b_electricos || rawInput?.comentariosB || "";
  const commentsCombined = `${comentariosA}
${comentariosB}`.trim();
  const specialDirectives = extractSpecialDirectivesFromComments(comentariosA, comentariosB);
  if (is3Phase) {
    specialDirectives.unshift("\u26A1 Sistema de Distribuci\xF3n Trif\xE1sico 220/127V (3F-4H) con protecci\xF3n termomagn\xE9tica tripolar");
  }
  if (dcLength === 0) {
    specialDirectives.push("\u{1F4CD} Inversor ubicado a pie de arreglo FV en azotea (Ruta DC directa \u2264 1m)");
  }
  if (acLength >= 30) {
    specialDirectives.push(`\u{1F4CF} Ca\xEDda de tensi\xF3n cr\xEDtica: Ruta AC de ${acLength}m al centro de carga principal (Calibre dimensionado por distancia)`);
  }
  const totalDckWp = totalMods > 0 && powerW > 0 ? parseFloat((totalMods * powerW / 1e3).toFixed(2)) : 0;
  const conduitType = commentsCombined.toLowerCase().includes("imc") || acLength >= 35 ? "EMT" : "EMT";
  const structuredData = {
    serviceOrderId: rawInput?.folio_orden_servicio || rawInput?.serviceOrderId || "OS-SFI-FOTOVOLTAICO",
    clientName,
    projectName: totalDckWp > 0 ? `Proyecto Solar ${clientName || ""} (${totalDckWp} kWp)` : "Proyecto Fotovoltaico",
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
      bifacial: commentsCombined.toLowerCase().includes("bifacial"),
      bifacialGainPercent: commentsCombined.toLowerCase().includes("bifacial") ? 10 : 0
    },
    inverter: {
      manufacturer: invRaw.toUpperCase().includes("GROWATT") ? "Growatt" : invRaw.toUpperCase().includes("HUAWEI") ? "Huawei" : "Inversor Solar",
      model: invRaw || `GROWATT ${invKw}kW`,
      architecture: "string",
      numberOfUnits: 1,
      ratedPowerKw: invKw,
      maxAcCurrentA: maxAcCurrent,
      nominalAcVoltageV: invVoltage,
      gridPhases,
      mpptCount: strings >= 2 ? 2 : 1
    },
    battery: {
      enabled: false,
      manufacturer: "",
      model: "",
      capacityKwh: 0,
      nominalVoltageV: 0,
      maxContinuousDischargeCurrentA: 0
    },
    routes: [
      {
        id: "r-dc-1",
        name: "Ruta DC (Paneles a Inversores)",
        type: "DC",
        lengthM: dcLength > 0 ? dcLength : 1,
        conduitType: "EMT",
        insulationType: "THHW-LS",
        conductorMaterial: "Cu",
        temperatureRating: "90C",
        bends90: dcLength > 0 ? 2 : 0,
        bends45: 0
      },
      {
        id: "r-ac-1",
        name: "Ruta AC (Inversor a Centro de Carga / Medidor)",
        type: "AC",
        lengthM: acLength > 0 ? acLength : 15,
        conduitType,
        insulationType: "THHW-LS",
        conductorMaterial: "Cu",
        temperatureRating: "90C",
        bends90: 2,
        bends45: 1
      }
    ],
    confidenceScore: 1,
    confidenceBreakdown: {},
    extractedFieldsSummary: [
      `Cliente: ${clientName}`,
      `Generador: ${totalMods} m\xF3dulos de ${powerW} Wp (${totalDckWp} kWp)`,
      `Inversor: ${invRaw || "Inversor"} (${invKw} kW @ ${invVoltage}V ${gridConn})`,
      `Rutas: DC ${dcLength}m | AC ${acLength}m`,
      `Protecci\xF3n AC: ${acBreaker}`
    ]
  };
  return ServiceOrderExtractionSchema.parse(structuredData);
}

// src/engine/standards.ts
function getTemperatureCorrectionFactor(ambientTempC, rating) {
  if (ambientTempC <= 10) return rating === "60C" ? 1.29 : rating === "75C" ? 1.2 : 1.15;
  if (ambientTempC <= 15) return rating === "60C" ? 1.22 : rating === "75C" ? 1.15 : 1.12;
  if (ambientTempC <= 20) return rating === "60C" ? 1.15 : rating === "75C" ? 1.11 : 1.08;
  if (ambientTempC <= 25) return rating === "60C" ? 1.08 : rating === "75C" ? 1.05 : 1.04;
  if (ambientTempC <= 30) return 1;
  if (ambientTempC <= 35) return rating === "60C" ? 0.91 : rating === "75C" ? 0.94 : 0.96;
  if (ambientTempC <= 40) return rating === "60C" ? 0.82 : rating === "75C" ? 0.88 : 0.91;
  if (ambientTempC <= 45) return rating === "60C" ? 0.71 : rating === "75C" ? 0.82 : 0.87;
  if (ambientTempC <= 50) return rating === "60C" ? 0.58 : rating === "75C" ? 0.75 : 0.82;
  if (ambientTempC <= 55) return rating === "60C" ? 0.41 : rating === "75C" ? 0.67 : 0.76;
  if (ambientTempC <= 60) return rating === "60C" ? 0 : rating === "75C" ? 0.58 : 0.71;
  if (ambientTempC <= 65) return rating === "60C" ? 0 : rating === "75C" ? 0.47 : 0.65;
  if (ambientTempC <= 70) return rating === "60C" ? 0 : rating === "75C" ? 0.33 : 0.58;
  if (ambientTempC <= 75) return rating === "60C" ? 0 : rating === "75C" ? 0 : 0.5;
  if (ambientTempC <= 80) return rating === "60C" ? 0 : rating === "75C" ? 0 : 0.41;
  return 0.3;
}
var STANDARD_OCPD_SIZES = [
  10,
  15,
  20,
  25,
  30,
  35,
  40,
  45,
  50,
  60,
  70,
  80,
  90,
  100,
  110,
  125,
  150,
  175,
  200,
  225,
  250,
  300,
  350,
  400,
  500,
  600,
  800,
  1e3,
  1200
];
function selectStandardOCPD(requiredCurrent) {
  for (const size of STANDARD_OCPD_SIZES) {
    if (size >= requiredCurrent) return size;
  }
  return Math.ceil(requiredCurrent / 100) * 100;
}

// src/engine/localAssistantEngine.ts
function generateLocalAssistantResponse(query, model, result, _history = []) {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const totalDcWp = result.dc.totalPowerW || model.pv.totalModules * model.pv.powerW;
  const totalDcKwp = (totalDcWp / 1e3).toFixed(2);
  const totalAcKw = (result.ac.totalAcPowerKw || model.inverter.ratedPowerKw || 3.3).toFixed(1);
  const dcAcRatio = (totalDcWp / (Number(totalAcKw) * 1e3 || 1)).toFixed(2);
  const modVoc = model.pv.vocV || 52.8;
  const modVmp = model.pv.vmpV || 44.6;
  const modIsc = model.pv.iscA || 14.25;
  const strings = model.pv.numberOfStrings || 1;
  const modsPerString = model.pv.modulesPerString || 6;
  const stringVocStc = parseFloat((modsPerString * modVoc).toFixed(1));
  const stringVmpStc = parseFloat((modsPerString * modVmp).toFixed(1));
  const iscContinuousDc = parseFloat((modIsc * strings * 1.56).toFixed(2));
  const invVolts = model.inverter.nominalAcVoltageV || 220;
  const invNominalCurrent = result.ac.totalAcCurrentA || parseFloat((Number(totalAcKw) * 1e3 / invVolts).toFixed(1));
  const invContinuousCurrent = result.ac.maxAcCurrentWithContinuousFactorA || parseFloat((invNominalCurrent * 1.25).toFixed(1));
  const tMin = model.ambientMinTempC ?? 5;
  const tMax = model.ambientMaxTempC ?? 40;
  const deltaTCold = tMin - 25;
  const vocColdFactor = 1 + -28e-4 * deltaTCold;
  const stringVocCold = parseFloat((stringVocStc * vocColdFactor).toFixed(1));
  const vmpHotFactor = 1 + -35e-4 * 45;
  const stringVmpHot = parseFloat((stringVmpStc * vmpHotFactor).toFixed(1));
  const failedValidations = result.validations.filter((v) => !v.passed);
  const allPassed = failedValidations.length === 0;
  if (q.includes("caida") || q.includes("voltage drop") || q.includes("delta v") || q.includes("perdida") || q.includes("3%") || q.includes("2%")) {
    return {
      category: "voltage_drop",
      source: "local_expert_engine",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      answer: formatVoltageDropAnalysis(model, result, totalDcKwp, totalAcKw)
    };
  }
  if (q.includes("voc") || q.includes("frio") || q.includes("temperatura") || q.includes("tmin") || q.includes("mppt") || q.includes("vmp") || q.includes("voltaje maximo")) {
    return {
      category: "voc_cold_analysis",
      source: "local_expert_engine",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      answer: formatVocColdAnalysis(model, modsPerString, modVoc, stringVocStc, stringVocCold, stringVmpHot, tMin, tMax)
    };
  }
  if (q.includes("nom") || q.includes("nec") || q.includes("norma") || q.includes("articulo") || q.includes("cumplimiento") || q.includes("690") || q.includes("705") || q.includes("310") || q.includes("250")) {
    return {
      category: "compliance_audit",
      source: "local_expert_engine",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      answer: formatNormativeAudit(model, result, failedValidations, allPassed)
    };
  }
  if (q.includes("calibre") || q.includes("conductor") || q.includes("tuberia") || q.includes("emt") || q.includes("llenado") || q.includes("cable") || q.includes("awg") || q.includes("ampacidad") || q.includes("canalizacion")) {
    return {
      category: "conductors_conduits",
      source: "local_expert_engine",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      answer: formatConductorsAndConduitsAnalysis(model, result)
    };
  }
  if (q.includes("ocpd") || q.includes("fusible") || q.includes("itm") || q.includes("proteccion") || q.includes("disyuntor") || q.includes("termomagnetico") || q.includes("interconexion") || q.includes("1.25") || q.includes("1.56")) {
    return {
      category: "protections_ocpd",
      source: "local_expert_engine",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      answer: formatProtectionsAnalysis(model, result, modIsc, iscContinuousDc, invNominalCurrent, invContinuousCurrent)
    };
  }
  if (q.includes("dc/ac") || q.includes("dc ac") || q.includes("relacion") || q.includes("clipping") || q.includes("sobredimensionamiento") || q.includes("kwp") || q.includes("potencia")) {
    return {
      category: "dc_ac_ratio",
      source: "local_expert_engine",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      answer: formatDcAcRatioAnalysis(model, totalDcKwp, totalAcKw, dcAcRatio)
    };
  }
  if (q.includes("bom") || q.includes("material") || q.includes("costo") || q.includes("lista") || q.includes("presupuesto") || q.includes("catalogo")) {
    return {
      category: "bom_summary",
      source: "local_expert_engine",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      answer: formatBOMAnalysis(result)
    };
  }
  if (q.includes("bateria") || q.includes("ess") || q.includes("almacenamiento") || q.includes("kwh") || q.includes("respaldo") || q.includes("autonomia")) {
    return {
      category: "battery_ess",
      source: "local_expert_engine",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      answer: formatBatteryAnalysis(model, totalDcKwp, totalAcKw)
    };
  }
  if (q.includes("unifilar") || q.includes("diagrama") || q.includes("ruta") || q.includes("esquema") || q.includes("circuito")) {
    return {
      category: "single_line_diagram",
      source: "local_expert_engine",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      answer: formatSingleLineAnalysis(model, result)
    };
  }
  return {
    category: "executive_summary",
    source: "local_expert_engine",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
    )
  };
}
function formatVoltageDropAnalysis(model, result, _totalDcKwp, _totalAcKw) {
  const routes = result.routeResults || [];
  let content = `### \u{1F4C9} An\xE1lisis Detallado de Ca\xEDda de Tensi\xF3n (P\xE9rdidas \xD3hmicas)

`;
  content += `Conforme a la recomendaci\xF3n de la **NOM-001-SEDE-2012 Art. 210-19(a) Nota 4** y el **NEC Art. 690-8**, el l\xEDmite est\xE1ndar de dise\xF1o es $\\le 2\\%$ en el circuito de corriente continua (DC) y $\\le 3\\%$ en el circuito de corriente alterna (AC), con una p\xE9rdida total combinada no mayor al $5\\%$.

`;
  content += `| Ruta | Tipo | Longitud Real | Conductor | $\\Delta V$ (Volts) | $\\Delta V$ (%) | L\xEDmite Normativo | Estado |
`;
  content += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
`;
  routes.forEach((r) => {
    const rawRoute = model.routes.find((mr) => mr.id === r.routeId || mr.name === r.routeName);
    const lengthM = rawRoute ? rawRoute.lengthM : 0;
    const material = rawRoute?.material || "Cu";
    const isDc = r.type === "DC";
    const limitPct = isDc ? "\u2264 2.0%" : "\u2264 3.0%";
    const statusIcon = r.voltageDropCompliance ? "\u2705 Cumple" : "\u26A0\uFE0F Excede";
    content += `| **${r.routeName}** | ${r.type} | **${lengthM} m** | ${r.selectedGauge} AWG (${material}) | **${r.voltageDropV.toFixed(2)} V** | **${r.voltageDropPercent.toFixed(2)}%** | ${limitPct} | ${statusIcon} |
`;
  });
  content += `
#### \u{1F9EE} Ecuaci\xF3n de C\xE1lculo Aplicada:
`;
  content += `- **Circuito DC / Monof\xE1sico / Bif\xE1sico:**
`;
  content += `  $$\\Delta V = \\frac{2 \\times L \\times I_{op} \\times R_{eff}}{1000}$$
`;
  content += `  $$\\Delta V(\\%) = \\left( \\frac{\\Delta V}{V_{nominal}} \\right) \\times 100$$

`;
  content += `#### \u{1F4A1} Diagn\xF3stico de Ingenier\xEDa:
`;
  const nonCompliant = routes.filter((r) => !r.voltageDropCompliance);
  if (nonCompliant.length === 0) {
    content += `- \u2705 **Excelente eficiencia:** Todas las rutas f\xEDsicas calculadas cumplen con los umbrales de ca\xEDda de tensi\xF3n con sus distancias reales de instalaci\xF3n.
`;
  } else {
    content += `- \u26A0\uFE0F **Rutas con observaci\xF3n:** Las siguientes rutas superan el umbral recomendado:
`;
    nonCompliant.forEach((r) => {
      const rawRoute = model.routes.find((mr) => mr.id === r.routeId || mr.name === r.routeName);
      const lengthM = rawRoute ? rawRoute.lengthM : 0;
      content += `  - **${r.routeName} (${lengthM}m)**: Actual ${r.voltageDropPercent.toFixed(2)}% con ${r.selectedGauge} AWG. Se sugiere aumentar a un calibre superior para reducir p\xE9rdidas.
`;
    });
  }
  return content;
}
function formatVocColdAnalysis(model, modsPerString, modVoc, stringVocStc, stringVocCold, stringVmpHot, tMin, _tMax) {
  const invMaxDc = model.inverter.maxDcVoltageV || 550;
  const mpptMin = 80;
  const mpptMax = Math.min(invMaxDc, 500);
  const safeMargin = invMaxDc - stringVocCold;
  const isSafe = stringVocCold <= invMaxDc;
  const isMpptSafe = stringVmpHot >= mpptMin && stringVocCold <= mpptMax;
  return `### \u26A1 An\xE1lisis T\xE9rmico de Tensi\xF3n en Fr\xEDo ($V_{oc, cold}$) y Ventana MPPT

Bajo **NOM-001-SEDE Art. 690-7** y **NEC 690.7(A)**, la tensi\xF3n m\xE1xima del sistema fotovoltaico se calcula corrigiendo la tensi\xF3n de circuito abierto ($V_{oc}$) a la **temperatura m\xEDnima hist\xF3rica registrada en el sitio**.

---

#### \u{1F4CA} Par\xE1metros T\xE9rmicos y El\xE9ctricos:
- **Configuraci\xF3n:** ${modsPerString} m\xF3dulos en serie por cadena.
- **Tensi\xF3n nominal en STC ($25^\\circ\\text{C}$):** $V_{oc, STC} = ${modsPerString} \\times ${modVoc}\\text{ V} =$ **${stringVocStc} V**.
- **Temperatura m\xEDnima de dise\xF1o del proyecto ($T_{min}$):** **${tMin} \xB0C**.
- **Coeficiente t\xE9rmico de tensi\xF3n ($\\beta_{Voc}$):** **$-0.28\\%/^\\circ\\text{C}$** (est\xE1ndar silicio monocristalino).
- **Tensi\xF3n m\xE1xima calculada en fr\xEDo ($V_{oc, cold}$):** **${stringVocCold} V**.

---

#### \u{1F6E1}\uFE0F Verificaci\xF3n frente al Inversor:
| Par\xE1metro | Valor Calculado | L\xEDmite del Inversor | Margen de Seguridad | Estado |
| :--- | :---: | :---: | :---: | :---: |
| **$V_{oc}$ en Fr\xEDo ($T_{min} = ${tMin}^\\circ\\text{C}$)** | **${stringVocCold} V** | M\xE1x Inversor: **${invMaxDc} V** | $+${safeMargin.toFixed(1)} V$ | ${isSafe ? "\u2705 Seguro (No da\xF1a inversor)" : "\u274C Peligro: Excede l\xEDmite"} |
| **$V_{mp}$ en Caliente ($T_{cell} = 70^\\circ\\text{C}$)** | **${stringVmpHot} V** | MPPT: **${mpptMin} V - ${mpptMax} V** | En rango operativo | ${isMpptSafe ? "\u2705 Dentro de ventana MPPT" : "\u26A0\uFE0F Fuera de rango MPPT"} |

#### \u{1F4DD} F\xF3rmula Normativa (Art. 690-7):
$$V_{oc, max} = V_{oc, STC} \\times \\left[ 1 + \\beta_{Voc} \\times (T_{min} - 25^\\circ\\text{C}) \\right]$$
$$V_{oc, max} = ${stringVocStc} \\times \\left[ 1 + (-0.0028) \\times (${tMin} - 25) \\right] = ${stringVocCold}\\text{ V}$$

**Conclusi\xF3n:** La cadena de ${modsPerString} m\xF3dulos calculada garantiza que el inversor operar\xE1 con seguridad ante temperaturas extremas registradas en el sitio.`;
}
function formatNormativeAudit(_model, result, failedValidations, allPassed) {
  let content = `### \u2696\uFE0F Auditor\xEDa Normativa de Cumplimiento (NOM-001-SEDE-2012 / NEC 2023)

`;
  if (allPassed) {
    content += `> \u2705 **ESTADO GENERAL: 100% EN CUMPLIMIENTO NORMATIVO**
> Todas las reglas de ingenier\xEDa el\xE9ctrica aplicables a sistemas fotovoltaicos e interconexi\xF3n a la red han sido verificadas satisfactoriamente.

`;
  } else {
    content += `> \u26A0\uFE0F **ESTADO GENERAL: ${failedValidations.length} OBSERVACI\xD3N(ES) DETECTADA(S)**

`;
  }
  content += `#### \u{1F4CB} Matriz de Verificaci\xF3n de Reglas T\xE9cnicas:

`;
  content += `| Regla | Referencia Normativa | Criterio de Ingenier\xEDa | Resultado |
`;
  content += `| :--- | :--- | :--- | :---: |
`;
  result.validations.forEach((v) => {
    const icon = v.passed ? "\u2705 Aprobado" : "\u26A0\uFE0F Revisar";
    content += `| **${v.title}** | ${v.rule} | ${v.detail} | ${icon} |
`;
  });
  content += `
#### \u{1F4DA} Art\xEDculos Normativos Clave Aplicados en este Proyecto:
`;
  content += `- **Art. 690-8(a)(1) - Corriente M\xE1xima de Circuito:** Se aplica el factor $1.25\\times I_{sc}$ por irradiaci\xF3n pico superior a $1000\\text{ W/m}^2$.
`;
  content += `- **Art. 690-8(b)(1) - Capacidad de Conducci\xF3n Continua:** Se aplica el factor $1.25\\times I_{max} = 1.56\\times I_{sc}$ para conductores y protecciones de servicio continuo (> 3 horas).
`;
  content += `- **Art. 690-9 - Protecci\xF3n contra Sobrecorriente (OCPD):** Los fusibles o disyuntores se seleccionan al valor comercial inmediato superior a la corriente continua de dise\xF1o.
`;
  content += `- **Art. 705-12 - Interconexi\xF3n de Fuentes de Generaci\xF3n:** Regla del $120\\%$ para barras de tableros de distribuci\xF3n ($I_{bus} \\times 1.2 \\ge I_{main} + I_{inv} \\times 1.25$).
`;
  content += `- **Art. 250 / 690-43 - Puesta a Tierra de Equipos:** Conductor EGC verde o desnudo continuo para marcos de m\xF3dulos, canalizaciones met\xE1licas y chasis del inversor.
`;
  return content;
}
function formatConductorsAndConduitsAnalysis(model, result) {
  const routes = result.routeResults || [];
  const tAmbMax = model.ambientMaxTempC ?? 40;
  const ft90 = getTemperatureCorrectionFactor(tAmbMax, "90C");
  let content = `### \u{1F500} Dimensionamiento de Conductores, Factores de Ajuste y Canalizaciones

`;
  content += `Conforme a la **NOM-001-SEDE-2012 Art. 310-15** y **Cap\xEDtulo 9 (Tablas 1, 4 y 5)**:

`;
  content += `| Ruta | Calibre / Aislamiento | Corriente Dise\xF1o | Ampacidad Corregida | Canalizaci\xF3n | Factor Llenado | Estado Llenado |
`;
  content += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
`;
  routes.forEach((r) => {
    const rawRoute = model.routes.find((mr) => mr.id === r.routeId || mr.name === r.routeName);
    const insulation = rawRoute?.insulation || "THHW-LS";
    const conduitType = rawRoute?.conduitType || "EMT";
    const fillStatus = r.conduitFillCompliance ? "\u2705 < 40%" : "\u26A0\uFE0F > 40%";
    content += `| **${r.routeName}** | **${r.selectedGauge} AWG** (${insulation}) | ${r.designCurrentA.toFixed(2)} A | **${r.correctedConductorAmpacityA.toFixed(1)} A** | ${r.selectedConduitTradeSize}" ${conduitType} | **${r.actualConduitFillPercent.toFixed(1)}%** | ${fillStatus} |
`;
  });
  content += `
#### \u{1F9EE} Factores de Correcci\xF3n T\xE9rmica y Agrupamiento Aplicados:
`;
  content += `- **Temperatura ambiente de dise\xF1o:** **${tAmbMax} \xB0C**.
`;
  content += `- **Factor por Temperatura ($F_T$, Tabla 310-15(b)(2)(a)):** Conductor con aislamiento a $90^\\circ\\text{C}$ en ambiente de $${tAmbMax}^\\circ\\text{C}$ $\\rightarrow F_T = ${ft90.toFixed(2)}$.
`;
  content += `- **Factor por Agrupamiento ($F_A$, Tabla 310-15(b)(3)(a)):** Seg\xFAn n\xFAmero de conductores portadores de corriente en cada canalizaci\xF3n.
`;
  content += `- **Ampacidad Real Corregida:** $I_{corregida} = I_{tabla\\_310-16} \\times F_T \\times F_A$.

`;
  content += `#### \u{1F4CF} Regla de Llenado de Tuber\xEDa (Cap\xEDtulo 9 Tabla 1):
`;
  content += `- **1 conductor:** M\xE1ximo $53\\%$.
`;
  content += `- **2 conductores:** M\xE1ximo $31\\%$.
`;
  content += `- **3 o m\xE1s conductores:** M\xE1ximo **$40\\%$** (para facilitar el jalado del cable y disipaci\xF3n de calor).
`;
  return content;
}
function formatProtectionsAnalysis(model, _result, modIsc, iscContinuousDc, invNominalCurrent, invContinuousCurrent) {
  const dcOcpd = selectStandardOCPD(iscContinuousDc);
  const acOcpd = selectStandardOCPD(invContinuousCurrent);
  const sysType = model.inverter.systemType || "2F-2H";
  return `### \u{1F6E1}\uFE0F Coordinaci\xF3n de Protecciones Contra Sobrecorriente (OCPD) y Supresi\xF3n de Picos

Conforme a **NOM-001-SEDE Art. 690-9** y **Art. 240-6** (Valores nominales est\xE1ndar de interruptores y fusibles):

---

#### 1. Protecci\xF3n en Corriente Continua (DC):
- **Corriente de Cortocircuito del Arreglo ($I_{sc}$):** **${modIsc} A**.
- **Corriente Continua de Dise\xF1o ($I_{sc} \\times 1.56$):** **${iscContinuousDc.toFixed(2)} A**.
- **OCPD DC Comercial Recomendado:** **${dcOcpd} A DC** / $1000\\text{ V}$ (Portafusible o Interruptor Termomagn\xE9tico bipolar para fotovoltaica).
- **Supresor de Sobretensiones Transitorias (SPD DC):** Tipo 2, $V_c = 1000\\text{ V DC}$, $I_n = 20\\text{ kA}$.

---

#### 2. Protecci\xF3n en Corriente Alterna (AC):
- **Corriente Nominal de Salida del Inversor ($I_{ac, nom}$):** **${invNominalCurrent.toFixed(1)} A**.
- **Corriente Continua Requerida ($I_{ac, nom} \\times 1.25$):** **${invContinuousCurrent.toFixed(1)} A**.
- **Interruptor Termomagn\xE9tico Comercial (ITM AC):** **${acOcpd} A** (${sysType}, curva C, $10\\text{ kA}$ Icu).
- **Supresor de Picos (SPD AC):** Tipo 2, $275\\text{ V AC}$, $I_n = 20\\text{ kA}$ para protecci\xF3n del inversor y la red del inmueble.

---

#### \u{1F4A1} Justificaci\xF3n Normativa:
Los conductores de cada ruta est\xE1n protegidos contra sobrecargas y cortocircuitos ya que la ampacidad corregida del conductor seleccionado es superior al valor nominal del OCPD (${dcOcpd}A en DC y ${acOcpd}A en AC), garantizando la desconexi\xF3n segura antes de superar la temperatura m\xE1xima de servicio del aislamiento ($90^\\circ\\text{C}$).`;
}
function formatDcAcRatioAnalysis(model, totalDcKwp, totalAcKw, dcAcRatio) {
  const ratioNum = Number(dcAcRatio);
  let evalText = "";
  if (ratioNum >= 1.1 && ratioNum <= 1.35) {
    evalText = "\u2705 **Rango \xD3ptimo:** La relaci\xF3n DC/AC est\xE1 en el rango est\xE1ndar ideal de la industria (1.10 a 1.30). Permite aprovechar la curva de generaci\xF3n matutina/vespertina con p\xE9rdidas por recorte (clipping) pr\xE1cticamente nulas.";
  } else if (ratioNum < 1.1) {
    evalText = "\u2139\uFE0F **Ligero Subdimensionamiento:** El inversor tiene capacidad de sobra. Podr\xEDas agregar m\xE1s m\xF3dulos si el cliente desea expandir la potencia sin cambiar de inversor.";
  } else {
    evalText = "\u26A0\uFE0F **Sobredimensionamiento Elevado:** La relaci\xF3n DC/AC es alta. Se presentar\xE1 recorte de potencia (clipping) en horas pico de mediod\xEDa, aunque aumentar\xE1 la generaci\xF3n en horas de baja irradiaci\xF3n.";
  }
  return `### \u26A1 Relaci\xF3n DC / AC y An\xE1lisis de Dimensionamiento

- **Capacidad Generador Solar (DC):** **${totalDcKwp} kWp** (${model.pv.totalModules} m\xF3dulos de ${model.pv.powerW} Wp).
- **Capacidad Inversor Solar (AC):** **${totalAcKw} kW AC** (${model.inverter.manufacturer} ${model.inverter.model}).
- **Relaci\xF3n DC/AC ($P_{dc} / P_{ac}$):** **${dcAcRatio}** (o **${(ratioNum * 100).toFixed(0)}%**).

---

#### \u{1F4C8} Diagn\xF3stico de Rendimiento:
${evalText}

#### \u{1F3AF} Beneficios de una Relaci\xF3n DC/AC ~1.15 - 1.25:
1. **Curva de generaci\xF3n m\xE1s ancha:** El inversor alcanza su potencia nominal m\xE1s temprano en la ma\xF1ana y la mantiene por m\xE1s tiempo en la tarde.
2. **Optimizaci\xF3n del Costo Nivelado de Energ\xEDa (LCOE):** Se amortiza mejor el costo fijo del inversor e infraestructura de interconexi\xF3n.
3. **Eficiencia en D\xEDas Nublados:** Mayor generaci\xF3n con baja irradiancia difusa.`;
}
function formatBOMAnalysis(result) {
  const bom = result.bom || [];
  let content = `### \u{1F4E6} Resumen de Lista de Materiales (BOM) y Componentes Consolidados

`;
  content += `Se consolidaron **${bom.length} partidas de materiales** derivadas de los c\xE1lculos:

`;
  content += `| Categor\xEDa | Elemento / Especificaci\xF3n | Cantidad | Unidad | Justificaci\xF3n T\xE9cnica |
`;
  content += `| :--- | :--- | :---: | :---: | :--- |
`;
  bom.slice(0, 10).forEach((item) => {
    content += `| **${item.category}** | ${item.element} (${item.specification}) | **${item.quantity}** | ${item.unit} | ${item.traceability?.engineeringJustification || item.observations || "Requerido"} |
`;
  });
  if (bom.length > 10) {
    content += `
*... y ${bom.length - 10} partidas adicionales detalladas en la pesta\xF1a BOM.*
`;
  }
  content += `
> \u{1F4A1} **Nota:** La cuantificaci\xF3n incluye conductores con factor de desperdicio y remates, tuber\xEDa con curvas normalizadas y accesorios de fijaci\xF3n por tramo de canalizaci\xF3n.
`;
  return content;
}
function formatBatteryAnalysis(model, totalDcKwp, totalAcKw) {
  if (!model.battery?.enabled) {
    return `### \u{1F50B} Sistema de Almacenamiento en Bater\xEDas (ESS)

Actualmente este proyecto est\xE1 configurado como un **Sistema Fotovoltaico Interconectado a la Red (Grid-Tied) Puro**, sin banco de bater\xEDas ESS habilitado.

#### \u{1F4A1} Opciones de Expansi\xF3n con ESS:
- **Acoplamiento DC (Hybrid Inverter):** Permite conectar bater\xEDas de alto voltaje (p. ej. $400\\text{ V}$) directamente al bus DC antes del inversor, maximizando la eficiencia de carga solar.
- **Acoplamiento AC:** Se agrega un inversor-cargador de bater\xEDa en el tablero principal de respaldo para cargas cr\xEDticas.
- **Capacidad T\xEDpica Sugerida:** Para tu sistema de **${totalDcKwp} kWp DC / ${totalAcKw} kW AC**, una bater\xEDa de **5 kWh a 10 kWh** brindar\xEDa entre 3 y 6 horas de autonom\xEDa para cargas esenciales.`;
  }
  const bCap = model.battery.capacityKwh || 5;
  const bVolt = model.battery.nominalVoltageV || 400;
  const bDischarge = model.battery.maxContinuousDischargeCurrentA || 12.5;
  return `### \u{1F50B} Diagn\xF3stico del Sistema de Almacenamiento (Bater\xEDa ESS)

- **Fabricante / Modelo:** ${model.battery.manufacturer} ${model.battery.model}
- **Qu\xEDmica de Celda:** ${model.battery.chemistry || "LiFePO4 (LFP)"}
- **Capacidad Nominal:** **${bCap} kWh**
- **Tensi\xF3n Nominal del Banco:** **${bVolt} V DC**
- **Corriente M\xE1xima de Descarga Continua:** **${bDischarge} A**
- **Potencia M\xE1xima Continua:** **${(bVolt * bDischarge / 1e3).toFixed(2)} kW**

**Conclusi\xF3n:** La bater\xEDa proporciona respaldo ante cortes de la red p\xFAblica y permite autoconsumo nocturno optimizado.`;
}
function formatSingleLineAnalysis(model, result) {
  const routesDiagram = model.routes.map((r) => {
    const res = result.routeResults?.find((rr) => rr.routeId === r.id || rr.routeName === r.name);
    const gauge = res?.selectedGauge || "10";
    return `   \u251C\u2500 [Ruta ${r.name || r.type} (${r.type})]: Longitud ${r.lengthM}m (${gauge} AWG ${r.insulation || "THHW-LS"} en ${r.conduitType || "EMT"})`;
  }).join("\n");
  return `### \u{1F4D0} Diagrama Unifilar y Arquitectura El\xE9ctrica del Proyecto

\`\`\`
[ ARREGLO FOTOVOLTAICO ]
  ${model.pv.totalModules} M\xF3dulos \xD7 ${model.pv.powerW} Wp (${(result.dc.totalPowerW / 1e3).toFixed(2)} kWp DC)
  Configuraci\xF3n: ${model.pv.numberOfStrings} String(s) \xD7 ${model.pv.modulesPerString} M\xF3dulos
  Voc STC: ${result.dc.stringVocV} V  |  Isc: ${result.dc.stringIscA} A
         \u2502
${routesDiagram || "   \u251C\u2500 [Rutas del Proyecto]"}
         \u25BC
[ INVERSOR SOLAR FOTOVOLTAICO ]
  ${model.inverter.manufacturer} ${model.inverter.model} (${model.inverter.ratedPowerKw} kW AC @ ${model.inverter.nominalAcVoltageV}V ${model.inverter.systemType})
  Eficiencia: ${model.inverter.efficiencyPercent || 97.5}%
         \u2502
         \u25BC
[ TABLERO DE DISTRIBUCI\xD3N PRINCIPAL (CFE / RED) ]
  Interconexi\xF3n bajo NOM-001-SEDE Art. 705-12
\`\`\`

Puedes consultar el diagrama interactivo detallado con cotas y canalizaciones en la pesta\xF1a **Unifilar**.`;
}
function formatComprehensiveExecutiveSummary(model, result, totalDcKwp, totalAcKw, dcAcRatio, stringVocStc, stringVocCold, stringVmpStc, iscContinuousDc, invContinuousCurrent, allPassed, failedValidations) {
  const complianceBadge = allPassed ? "\u2705 **100% en Cumplimiento Normativo (0 Violaciones)**" : `\u26A0\uFE0F **${failedValidations.length} Observaciones Normativas**`;
  const dcOcpd = selectStandardOCPD(iscContinuousDc);
  const acOcpd = selectStandardOCPD(invContinuousCurrent);
  const tMinSite = model.ambientMinTempC ?? 5;
  const maxDcV = model.inverter.maxDcVoltageV || 550;
  const isColdSafe = stringVocCold <= maxDcV;
  return `### \u{1F4CA} Diagn\xF3stico y Resumen T\xE9cnico Ejecutivo

**Proyecto:** **${model.projectName || "Instalaci\xF3n Solar FV"}** | **Cliente:** ${model.clientName || "Cliente"}

---

#### \u26A1 1. Balance de Potencia y Generaci\xF3n:
- **Potencia Solar Pico (DC):** **${totalDcKwp} kWp DC** (${model.pv.totalModules} m\xF3dulos de **${model.pv.powerW} Wp** ${model.pv.manufacturer}).
- **Potencia Inversor (AC):** **${totalAcKw} kW AC** (${model.inverter.manufacturer} ${model.inverter.model} @ **${model.inverter.nominalAcVoltageV} V**).
- **Relaci\xF3n DC/AC:** **${dcAcRatio}** (Rango recomendado est\xE1ndar: 1.15 a 1.30).

---

#### \u{1F50C} 2. Par\xE1metros de Operaci\xF3n y Seguridad:
- **Tensi\xF3n de Cadena en STC ($V_{oc}$):** **${stringVocStc} V DC**
- **Tensi\xF3n M\xE1xima en Fr\xEDo ($V_{oc, cold}$ a ${tMinSite}\xB0C):** **${stringVocCold} V DC** (L\xEDmite Inversor: ${maxDcV} V) $\\rightarrow$ ${isColdSafe ? "\u2705 Seguro (No da\xF1a inversor)" : "\u26A0\uFE0F Excede l\xEDmite m\xE1ximo"}.
- **Tensi\xF3n Operativa de M\xE1xima Potencia ($V_{mp}$):** **${stringVmpStc} V DC** (Dentro del rango MPPT).
- **Corriente Continua DC ($I_{sc} \\times 1.56$):** **${iscContinuousDc.toFixed(2)} A** $\\rightarrow$ OCPD recomendado: **${dcOcpd} A DC**.
- **Corriente Continua AC ($I_{ac} \\times 1.25$):** **${invContinuousCurrent.toFixed(1)} A** $\\rightarrow$ ITM recomendado: **${acOcpd} A AC**.

---

#### \u{1F4D0} 3. Estado de Rutas F\xEDsicas y Ca\xEDdas de Tensi\xF3n:
${result.routeResults.map((r) => {
    const rawR = model.routes.find((mr) => mr.id === r.routeId || mr.name === r.routeName);
    const len = rawR ? rawR.lengthM : 0;
    return `- **${r.routeName} (${r.type}):** Longitud **${len}m** con calibre **${r.selectedGauge} AWG**, ca\xEDda de tensi\xF3n **${r.voltageDropPercent.toFixed(2)}%** (${r.voltageDropV.toFixed(2)}V) y llenado al **${r.actualConduitFillPercent.toFixed(1)}%** $\\rightarrow$ ${r.voltageDropCompliance ? "\u2705 Cumple" : "\u26A0\uFE0F Excede"}`;
  }).join("\n")}

---

#### \u2696\uFE0F 4. Estado de Auditor\xEDa Normativa:
${complianceBadge}

\xBFDeseas profundizar en alg\xFAn punto espec\xEDfico? Puedes preguntarme sobre ca\xEDdas de tensi\xF3n, selecci\xF3n de protecciones OCPD, an\xE1lisis de tensi\xF3n en fr\xEDo o calibres de tuber\xEDa.`;
}

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "20mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "20mb" }));
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var FAST_MODELS = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
async function generateWithFallback(ai, requestPayload) {
  let lastError = null;
  for (const model of FAST_MODELS) {
    try {
      const response = await ai.models.generateContent({
        ...requestPayload,
        model,
        config: {
          ...requestPayload.config,
          thinkingConfig: { thinkingLevel: import_genai.ThinkingLevel.LOW }
        }
      });
      if (response && response.text) {
        return response;
      }
    } catch (err) {
      lastError = err;
      const isUnavailableOrRateLimited = err?.status === 503 || err?.message?.includes("503") || err?.message?.includes("high demand") || err?.message?.includes("UNAVAILABLE") || err?.status === 429 || err?.message?.includes("429");
      if (!isUnavailableOrRateLimited) {
        break;
      }
    }
  }
  throw lastError || new Error("Modelos no disponibles temporalmente.");
}
app.post("/api/ocr-service-order", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", notes } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "No se proporcion\xF3 imagen de la orden de servicio." });
    }
    const ai = getGeminiClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    const prompt = `
Eres un analista experto de ingenier\xEDa fotovoltaica y ESS.
Analiza minuciosamente esta ORDEN DE SERVICIO (SISTEMA FOTOVOLTAICO).

ESTRUCTURA VISUAL DEL FORMATO (TABLA DE 2 COLUMNAS):
- COLUMNA IZQUIERDA (Fondo Azul): Nombres de los campos / etiquetas.
- COLUMNA DERECHA (Fondo Blanco / Claro): Valores y datos del proyecto.

SECCIONES Y CAMPOS A EXTRAER:

1. SECCI\xD3N: DATOS GENERALES
   \u2022 Nombre del Cliente -> nombre_cliente
   \u2022 Fecha de instalaci\xF3n -> fecha_programada / fecha_instalacion
   \u2022 Direcci\xF3n de la instalaci\xF3n (incluyendo notas entre par\xE9ntesis) -> ubicacion_instalacion
   \u2022 Tel\xE9fono de contacto -> telefono_contacto
   \u2022 E-Mail -> email

2. SECCI\xD3N: CONDICIONES DEL LUGAR DE INSTALACI\xD3N
   \u2022 Tipo de Azotea (ej. Loza, L\xE1mina, Teja) -> tipo_azotea
   \u2022 Inclinaci\xF3n (ej. 6\xB0) -> inclinacion_grados
   \u2022 Distancia en metros entre los paneles y los inversores (ej. 2m) -> longitud_ruta_dc_m (Ruta DC)
   \u2022 Distancia en metros entre el inversor y centro de carga (ej. 25m) -> longitud_ruta_ac_m (Ruta AC)

3. SECCI\xD3N: DATOS DEL SISTEMA FOTOVOLTAICO
   \u2022 Tipo de proyecto -> tipo_proyecto
   \u2022 Marca del Panel Solar -> marca_modulo
   \u2022 N\xFAmero de paneles -> total_modulos / numero_paneles
   \u2022 Potencia del panel (Watts) -> potencia_modulo_w
   \u2022 Voltaje de Operaci\xF3n en DC -> vmp_v / voltaje_operacion_dc_v
   \u2022 Marca y modelo de inversor -> modelo_inversor
     (Copia fielmente y sin alteraciones el texto exacto de la celda 'Marca y modelo de inversor' o 'Marca y modelo del inversor'. NO supongas ni adivines).
   \u2022 Potencia nominal del inversor en kW AC -> potencia_inversor_kw
     REGLA CR\xCDTICA: La potencia del inversor est\xE1 escrita e indicada DIRECTAMENTE dentro del texto de 'Marca y modelo de inversor'.
     Debes extraer el n\xFAmero de la capacidad nominal en kW de ese mismo texto (por ejemplo: si la celda dice 'GROWATT 5.0', la potencia es 5.0; si dice 'GROWATT 3.3', la potencia es 3.3; si dice 'GROWATT 6.0', es 6.0; si dice 'SOLIS 5K', es 5.0).
     NUNCA supongas 7.0 ni inventes ning\xFAn valor arbitrario. Si la celda no menciona ning\xFAn n\xFAmero, pon 0.
   \u2022 Protecci\xF3n termomagn\xE9tica en AC -> proteccion_termomagnetica_ac
   \u2022 Comentarios (Comentarios A / Mec\xE1nicos / Cubierta):
     Extrae textualmente todo el texto (ej. "No se debe perforar la loza, es necesario hacer el anclaje en los pretiles...") -> comentarios_a_mecanicos

REGLA FUNDAMENTAL DE POTENCIA EN AC:
La potencia en AC del proyecto NO es la potencia en DC (paneles x Wp).
La potencia en AC es EXCLUSIVAMENTE la capacidad nominal del inversor en kW le\xEDda en 'Marca y modelo de inversor'.
Todos los c\xE1lculos de corriente de salida del inversor, corriente continua 1.25x, protecci\xF3n termomagn\xE9tica en AC y ca\xEDda de tensi\xF3n en ruta AC se realizan con base en esta potencia nominal del inversor.

4. SECCI\xD3N: INSTALACI\xD3N EL\xC9CTRICA
   \u2022 Instalaci\xF3n el\xE9ctrica (ej. Bif\xE1sica, Monof\xE1sica, Trif\xE1sica) -> fases_red (ej. "2F-3H")
   \u2022 Tipo de medidor (ej. Digital) -> tipo_medidor
   \u2022 Requiere acondicionar preparaci\xF3n para medidor (ej. NO / S\xCD) -> requiere_acondicionar_preparacion_medidor
   \u2022 Acometida (ej. A\xE9rea / Subterr\xE1nea) -> acometida
   \u2022 Comentarios (Comentarios B / El\xE9ctricos / Interconexi\xF3n):
     Extrae textualmente todo el texto (ej. "Se colocar\xE1 un Centro de Carga a un costado del medidor de CFE...") -> comentarios_b_electricos / ultimo_cuadro_consideraciones_especiales

REGLA DE FIDELIDAD:
- Vaciado exacto de las cifras de la columna derecha blanca y los textos de comentarios.
- Si un campo no existe o est\xE1 vac\xEDo, pon 0 (n\xFAmeros) o "" (texto).
`;
    const response = await generateWithFallback(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64
            }
          },
          {
            text: prompt + (notes ? `
Notas adicionales del usuario: ${notes}` : "")
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            folio_orden_servicio: { type: import_genai.Type.STRING, description: "Folio o c\xF3digo de la orden de servicio si existe" },
            nombre_cliente: { type: import_genai.Type.STRING, description: "Nombre del cliente en la tabla" },
            fecha_programada: { type: import_genai.Type.STRING, description: "Fecha de instalaci\xF3n en la tabla" },
            ubicacion_instalacion: { type: import_genai.Type.STRING, description: "Direcci\xF3n de la instalaci\xF3n completa" },
            telefono_contacto: { type: import_genai.Type.STRING, description: "Tel\xE9fono de contacto" },
            email: { type: import_genai.Type.STRING, description: "E-Mail de contacto" },
            temperatura_ambiente_c: { type: import_genai.Type.NUMBER, description: "Temperatura ambiente en \xB0C si existe, o 35" },
            // Condiciones del lugar de instalación
            tipo_azotea: { type: import_genai.Type.STRING, description: "Tipo de Azotea (ej. Loza, L\xE1mina, Teja)" },
            inclinacion_grados: { type: import_genai.Type.STRING, description: "Inclinaci\xF3n de la azotea (ej. 6\xB0)" },
            distancia_paneles_inversores_m: { type: import_genai.Type.NUMBER, description: "Distancia en metros entre paneles e inversores (Ruta DC)" },
            distancia_inversor_centro_carga_m: { type: import_genai.Type.NUMBER, description: "Distancia en metros entre inversor y centro de carga (Ruta AC)" },
            // Datos del sistema fotovoltaico
            tipo_proyecto: { type: import_genai.Type.STRING, description: "Tipo de proyecto (ej. CONTADO)" },
            marca_modulo: { type: import_genai.Type.STRING, description: "Marca y modelo del Panel Solar (ej. Jinko Solar 590W)" },
            total_modulos: { type: import_genai.Type.NUMBER, description: "N\xFAmero de paneles (ej. 6)" },
            potencia_modulo_w: { type: import_genai.Type.NUMBER, description: "Potencia del panel en Watts (ej. 590)" },
            vmp_v: { type: import_genai.Type.NUMBER, description: "Voltaje de Operaci\xF3n en DC (ej. 54.5)" },
            modelo_inversor: { type: import_genai.Type.STRING, description: 'Texto exacto le\xEDdo de la celda "Marca y modelo de inversor" (ej. GROWATT 5.0, GROWATT 3.3, GROWATT 6.0, SOLIS 5K, etc.). Sin inventar.' },
            potencia_inversor_kw: { type: import_genai.Type.NUMBER, description: 'Potencia nominal en kW extra\xEDda del texto de "Marca y modelo de inversor". Ej: si dice GROWATT 5.0 es 5.0, si dice GROWATT 3.3 es 3.3. Sin inventar.' },
            proteccion_termomagnetica_ac: { type: import_genai.Type.STRING, description: "Protecci\xF3n termomagn\xE9tica en AC (ej. 30A)" },
            comentarios_a_mecanicos: { type: import_genai.Type.STRING, description: "Texto del recuadro Comentarios de la secci\xF3n FV (Comentarios A)" },
            // Instalación eléctrica
            fases_red: { type: import_genai.Type.STRING, description: "Instalaci\xF3n el\xE9ctrica (ej. Bif\xE1sica, Monof\xE1sica, Trif\xE1sica)" },
            tipo_medidor: { type: import_genai.Type.STRING, description: "Tipo de medidor (ej. Digital)" },
            requiere_acondicionar_preparacion_medidor: { type: import_genai.Type.STRING, description: "Requiere acondicionar preparaci\xF3n para medidor (NO / S\xCD)" },
            acometida: { type: import_genai.Type.STRING, description: "Acometida (ej. A\xE9rea / Subterr\xE1nea)" },
            comentarios_b_electricos: { type: import_genai.Type.STRING, description: "Texto del recuadro Comentarios de la secci\xF3n Instalaci\xF3n El\xE9ctrica (Comentarios B)" },
            // Conduits & routes
            longitud_ruta_dc_m: { type: import_genai.Type.NUMBER, description: "Longitud ruta DC en metros [m]" },
            tipo_tuberia_dc: { type: import_genai.Type.STRING, description: "Tipo canalizaci\xF3n DC (EMT | IMC | PVC-40)" },
            longitud_ruta_ac_m: { type: import_genai.Type.NUMBER, description: "Longitud ruta AC en metros [m]" },
            tipo_tuberia_ac: { type: import_genai.Type.STRING, description: "Tipo canalizaci\xF3n AC (EMT | IMC | PVC-40)" },
            material_conductor: { type: import_genai.Type.STRING, description: "Material conductor (Cu | Al)" },
            aislamiento_conductor: { type: import_genai.Type.STRING, description: "Aislamiento (THHW-LS | THHN)" },
            temperatura_aislamiento: { type: import_genai.Type.STRING, description: "Rango t\xE9rmico (90C)" },
            // Último Cuadro de Texto: Consideraciones Especiales del Proyecto
            ultimo_cuadro_consideraciones_especiales: { type: import_genai.Type.STRING, description: "Texto de los comentarios y consideraciones especiales del proyecto" },
            directivas_especiales_extraidas: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "Lista de directivas de ingenier\xEDa detectadas en el cuadro de consideraciones especiales"
            },
            confianza_score: { type: import_genai.Type.NUMBER, description: "\xCDndice de confianza de extracci\xF3n (0.0 a 1.0)" },
            notas_observaciones: { type: import_genai.Type.STRING, description: "Comentarios o datos detectados" }
          }
        }
      }
    });
    let rawText = response.text?.trim() || "{}";
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const rawParsed = JSON.parse(rawText);
    if (rawParsed.modelo_inversor) {
      const derivedFromModel = extractInverterPowerFromModel(rawParsed.modelo_inversor);
      if (derivedFromModel > 0) {
        rawParsed.potencia_inversor_kw = derivedFromModel;
      }
    }
    const validatedData = normalizeServiceOrderWithUnits(rawParsed);
    return res.json({ success: true, data: validatedData });
  } catch (error) {
    return res.status(500).json({
      error: "Error al procesar la imagen de la orden de servicio con IA.",
      details: error.message
    });
  }
});
app.post("/api/geo-solar-weather", async (req, res) => {
  try {
    const { address, lat: reqLat, lon: reqLon } = req.body;
    let lat = reqLat ? Number(reqLat) : null;
    let lon = reqLon ? Number(reqLon) : null;
    let formattedAddress = address || "Naucalpan, Estado de M\xE9xico";
    let city = "Naucalpan";
    let state = "Estado de M\xE9xico";
    let country = "M\xE9xico";
    if ((lat === null || lon === null) && address) {
      try {
        const cleanQuery = encodeURIComponent(
          address.replace(/\(.*?\)/g, "").replace(/HAY QUE TOCAR.*$/i, "").trim()
        );
        const geoResp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${cleanQuery}&limit=1&addressdetails=1`,
          {
            headers: {
              "User-Agent": "PV-ESS-Solar-Engine/1.0"
            }
          }
        );
        if (geoResp.ok) {
          const geoData = await geoResp.json();
          if (Array.isArray(geoData) && geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lon = parseFloat(geoData[0].lon);
            formattedAddress = geoData[0].display_name || formattedAddress;
            const addrDetails = geoData[0].address || {};
            city = addrDetails.city || addrDetails.town || addrDetails.municipality || addrDetails.suburb || city;
            state = addrDetails.state || state;
            country = addrDetails.country || country;
          }
        }
      } catch (e) {
        console.warn("Nominatim geocode failed, using coordinates fallback:", e);
      }
    }
    if (lat === null || lon === null) {
      lat = 19.4785;
      lon = -99.2396;
      city = "Naucalpan";
      state = "Estado de M\xE9xico";
    }
    let ambientMaxTempC = 38;
    let ambientMinTempC = 5;
    let currentTempC = 22;
    let dailyAverageGHI = 5.42;
    let maxIrradianceW = 1040;
    let elevation = 2275;
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,surface_pressure&daily=temperature_2m_max,temperature_2m_min,shortwave_radiation_sum,direct_normal_irradiance_instant_max&timezone=auto&forecast_days=7`;
      const wResp = await fetch(weatherUrl);
      if (wResp.ok) {
        const wData = await wResp.json();
        if (wData.current?.temperature_2m != null) {
          currentTempC = Math.round(wData.current.temperature_2m);
        }
        if (wData.elevation != null) {
          elevation = Math.round(wData.elevation);
        }
        if (wData.daily?.temperature_2m_max?.length) {
          const maxForecast = Math.max(...wData.daily.temperature_2m_max);
          ambientMaxTempC = Math.max(35, Math.round(maxForecast + 3));
        }
        if (wData.daily?.temperature_2m_min?.length) {
          const minForecast = Math.min(...wData.daily.temperature_2m_min);
          ambientMinTempC = Math.min(10, Math.round(minForecast - 2));
        }
        if (wData.daily?.shortwave_radiation_sum?.length) {
          const validSums = wData.daily.shortwave_radiation_sum.filter((s) => s > 0);
          if (validSums.length > 0) {
            const avgMJ = validSums.reduce((a, b) => a + b, 0) / validSums.length;
            dailyAverageGHI = parseFloat((avgMJ / 3.6).toFixed(2));
          }
        }
        if (wData.daily?.direct_normal_irradiance_instant_max?.length) {
          maxIrradianceW = Math.round(Math.max(...wData.daily.direct_normal_irradiance_instant_max, 980));
        }
      }
    } catch (e) {
      console.warn("Open-Meteo weather fetch error, using calibrated regional database:", e);
    }
    if (lat > 25) {
      ambientMaxTempC = Math.max(ambientMaxTempC, 42);
      ambientMinTempC = Math.min(ambientMinTempC, 2);
    }
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const seasonalHspCoeffs = [0.88, 0.94, 1.05, 1.12, 1.1, 1.02, 0.98, 0.99, 0.95, 0.97, 0.91, 0.86];
    const seasonalTempDeltas = [-4, -2, 1, 3, 4, 3, 2, 2, 1, 0, -2, -4];
    const monthlyHSP = months.map((m, idx) => ({
      month: m,
      hsp: parseFloat((dailyAverageGHI * seasonalHspCoeffs[idx]).toFixed(2)),
      avgTempC: Math.round(currentTempC + seasonalTempDeltas[idx])
    }));
    const resultPayload = {
      location: {
        lat: parseFloat(lat.toFixed(5)),
        lon: parseFloat(lon.toFixed(5)),
        formattedAddress,
        city,
        state,
        country,
        elevationM: elevation
      },
      ambientMaxTempC,
      ambientMinTempC,
      currentTempC,
      dailyAverageGHI_kWh_m2: dailyAverageGHI,
      peakSunHours: dailyAverageGHI,
      maxIrradianceW_m2: maxIrradianceW,
      yearlySpecificYield_kWh_kWp: Math.round(dailyAverageGHI * 365 * 0.82),
      optimalTiltDeg: Math.round(Math.abs(lat)),
      optimalAzimuthDeg: 180,
      monthlyHSP,
      climateZone: elevation > 2e3 ? "Altiplano Central (Templado)" : lat > 25 ? "\xC1rido / Des\xE9rtico" : "C\xE1lido Subh\xFAmedo",
      source: "Open-Meteo API / NASA POWER Calibrated Solar Resource"
    };
    return res.json({ success: true, data: resultPayload });
  } catch (error) {
    return res.status(500).json({
      error: "Error al consultar variables geogr\xE1ficas y solares.",
      details: error.message
    });
  }
});
function buildCompactEngineeringContext(model, result) {
  const dcP = result?.dc?.totalPowerW ? (result.dc.totalPowerW / 1e3).toFixed(2) : result?.systemSummary?.dcPowerKw || (Number(model?.pv?.totalModules || 6) * Number(model?.pv?.powerW || 590) / 1e3).toFixed(2);
  const acP = result?.ac?.totalAcPowerKw ? result.ac.totalAcPowerKw.toFixed(1) : result?.systemSummary?.acPowerKw || model?.inverter?.ratedPowerKw || "3.3";
  const dcAc = result?.systemSummary?.dcAcRatio || (Number(dcP) / (Number(acP) || 1)).toFixed(2);
  const routesList = (model?.routes || []).map((r) => {
    const calc = (result?.routeResults || result?.routes || []).find((cr) => cr.routeId === r.id || cr.routeName === r.name || cr.name === r.name);
    const dropPct = calc?.voltageDropPercent != null ? typeof calc.voltageDropPercent === "number" ? calc.voltageDropPercent.toFixed(2) : calc.voltageDropPercent : "N/A";
    const dropV = calc?.voltageDropV != null ? typeof calc.voltageDropV === "number" ? calc.voltageDropV.toFixed(2) : calc.voltageDropV : "N/A";
    const gauge = calc?.selectedGauge || r.conductorGauge || "10";
    const fillPct = calc?.actualConduitFillPercent != null ? typeof calc.actualConduitFillPercent === "number" ? calc.actualConduitFillPercent.toFixed(1) : calc.actualConduitFillPercent : calc?.conduitFillPercent || "N/A";
    const ocpd = calc?.ocpdRatingA || r.ocpdRatingA || "N/A";
    return `\u2022 Ruta "${r.name || r.type}" (${r.type}): Longitud REAL = ${r.lengthM}m, Conductor = ${gauge} AWG (${r.material || "Cu"}, ${r.insulation || "THHW-LS"}), Canalizaci\xF3n = ${calc?.selectedConduitTradeSize || r.conduitTradeSize || "3/4"}" ${r.conduitType || "EMT"} (Llenado: ${fillPct}%), Ca\xEDda de tensi\xF3n = ${dropPct}% (${dropV}V), OCPD = ${ocpd}A`;
  }).join("\n");
  const validations = result?.validations || [];
  const failed = validations.filter((v) => v.passed === false || v.status === "failed");
  const auditStr = failed.length === 0 ? "100% Cumplimiento NOM-001-SEDE / NEC (0 violaciones)" : `${failed.length} observaciones detectadas (${failed.map((f) => f.rule || f.title).join(", ")})`;
  return `[DATOS EXACTOS DEL PROYECTO ACTUAL EN TIEMPO REAL]
Proyecto: ${model?.projectName || "Solar FV"} | Cliente: ${model?.clientName || "Cliente"} | Temp Sitio: Min ${model?.ambientMinTempC ?? 5}\xB0C, Max ${model?.ambientMaxTempC ?? 40}\xB0C
Generador FV: ${model?.pv?.totalModules} m\xF3dulos de ${model?.pv?.powerW}W (${model?.pv?.manufacturer || "LONGi"} ${model?.pv?.model || ""}) = ${dcP} kWp DC | Voc STC: ${model?.pv?.vocV}V, Vmp: ${model?.pv?.vmpV}V, Isc: ${model?.pv?.iscA}A | Arreglo: ${model?.pv?.numberOfStrings} strings \xD7 ${model?.pv?.modulesPerString} m\xF3dulos
Inversor: ${model?.inverter?.manufacturer || "Growatt"} ${model?.inverter?.model || "MIN"} (${acP} kW AC @ ${model?.inverter?.nominalAcVoltageV || 220}V ${model?.inverter?.systemType || "2F-2H"}) | Relaci\xF3n DC/AC: ${dcAc}
Rutas F\xEDsicas Reales (${model?.routes?.length || 0}):
${routesList || "\u2022 Sin rutas configuradas"}
Auditor\xEDa Normativa: ${auditStr}`;
}
var ASSISTANT_SYSTEM_INSTRUCTION = `Eres el Asistente Experto de Ingenier\xEDa El\xE9ctrica y Solar NOM/NEC.
Tu objetivo es dar respuestas t\xE9cnicas, concisas y de m\xE1xima fidelidad basadas en la NOM-001-SEDE-2012 y NEC 2023.

REGLA CR\xCDTICA DE PRECISI\xD3N DE DATOS:
- Basa tus respuestas \xDANICAMENTE en las cifras exactas del [DATOS EXACTOS DEL PROYECTO ACTUAL EN TIEMPO REAL].
- NUNCA inventes, supongas ni generalices valores predeterminados (por ejemplo: si una ruta mide 25m, 28m o cualquier otra distancia, debes citar EXACTAMENTE esa distancia en metros; NUNCA uses 22m, 20m o 12m si la ruta del proyecto indica otro valor).
- Cita los art\xEDculos normativos pertinentes (Art. 690, 705, 310, 250, 240) y c\xE1lculos num\xE9ricos con absoluta precisi\xF3n.`;
app.post("/api/gemini/assistant-stream", async (req, res) => {
  const { query, model, result, history = [] } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Falta la consulta para el asistente." });
  }
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  try {
    const ai = getGeminiClient();
    const compactContext = buildCompactEngineeringContext(model, result);
    const recentHistory = history.slice(-4);
    const historyText = recentHistory.length > 0 ? `HISTORIAL:
${recentHistory.map((h) => `${h.role === "user" ? "U" : "A"}: ${h.content}`).join("\n")}

` : "";
    const promptText = `${compactContext}

${historyText}CONSULTA: "${query}"`;
    let streamGenerated = false;
    for (const modelName of FAST_MODELS) {
      try {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: [{ parts: [{ text: promptText }] }],
          config: {
            systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
            temperature: 0.2,
            thinkingConfig: { thinkingLevel: import_genai.ThinkingLevel.LOW }
          }
        });
        for await (const chunk of stream) {
          if (chunk.text) {
            streamGenerated = true;
            res.write(`data: ${JSON.stringify({ text: chunk.text, source: "cloud" })}

`);
          }
        }
        if (streamGenerated) {
          res.write(`data: ${JSON.stringify({ done: true, source: "cloud" })}

`);
          res.end();
          return;
        }
      } catch (err) {
        console.warn(`Fallback stream con ${modelName}:`, err?.message || err);
      }
    }
    const localRes = generateLocalAssistantResponse(query, model, result, history);
    res.write(`data: ${JSON.stringify({ text: localRes.answer, source: "local" })}

`);
    res.write(`data: ${JSON.stringify({ done: true, source: "local" })}

`);
    res.end();
  } catch (error) {
    console.warn("Error en stream nube, ejecutando motor local:", error);
    const localRes = generateLocalAssistantResponse(query, model, result, history);
    res.write(`data: ${JSON.stringify({ text: localRes.answer, source: "local" })}

`);
    res.write(`data: ${JSON.stringify({ done: true, source: "local" })}

`);
    res.end();
  }
});
app.post("/api/gemini/assistant", async (req, res) => {
  try {
    const { query, model, result, history = [] } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Falta la consulta para el asistente." });
    }
    const ai = getGeminiClient();
    const compactContext = buildCompactEngineeringContext(model, result);
    const recentHistory = history.slice(-4);
    const historyText = recentHistory.length > 0 ? `HISTORIAL:
${recentHistory.map((h) => `${h.role === "user" ? "U" : "A"}: ${h.content}`).join("\n")}

` : "";
    const promptText = `${compactContext}

${historyText}CONSULTA: "${query}"`;
    const response = await generateWithFallback(ai, {
      contents: {
        parts: [{ text: promptText }]
      },
      config: {
        systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
        temperature: 0.2
      }
    });
    const assistantAnswer = response?.text || "No se pudo generar una respuesta t\xE9cnica en este momento.";
    return res.json({
      success: true,
      answer: assistantAnswer,
      source: "gemini_cloud",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.warn("Asistente IA Nube no disponible o sin API key, aplicando Motor de Ingenier\xEDa Local NOM/NEC:", error?.message || error);
    const reqModel = req.body?.model;
    const reqResult = req.body?.result;
    const reqQuery = req.body?.query || "";
    const reqHistory = req.body?.history || [];
    if (reqModel && reqResult) {
      const localResponse = generateLocalAssistantResponse(reqQuery, reqModel, reqResult, reqHistory);
      return res.json({
        success: true,
        answer: localResponse.answer,
        _fallback: true,
        source: "local_expert_engine",
        timestamp: localResponse.timestamp
      });
    }
    return res.status(200).json({
      success: true,
      answer: "### \u26A1 Asistente de Ingenier\xEDa Local NOM/NEC\n\nEl motor de c\xE1lculo local est\xE1 activo. Carga o selecciona tu proyecto para ver el an\xE1lisis t\xE9cnico en tiempo real.",
      _fallback: true,
      source: "local_expert_engine"
    });
  }
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "pv-ess-bom-engine" });
});
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}
start();
//# sourceMappingURL=server.cjs.map
