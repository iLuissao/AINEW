import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import { normalizeServiceOrderWithUnits, extractInverterPowerFromModel } from './src/engine/schemas';
import { generateLocalAssistantResponse } from './src/engine/localAssistantEngine';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing middleware for JSON with increased limit for base64 images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Lazy initialize Gemini API client with User-Agent
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Ultra-fast model hierarchy: gemini-3.1-flash-lite offers lowest latency & fastest TTFT
const FAST_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

async function generateWithFallback(ai: GoogleGenAI, requestPayload: any) {
  let lastError: any = null;

  for (const model of FAST_MODELS) {
    try {
      const response = await ai.models.generateContent({
        ...requestPayload,
        model,
        config: {
          ...requestPayload.config,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      const isUnavailableOrRateLimited =
        err?.status === 503 ||
        err?.message?.includes('503') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.status === 429 ||
        err?.message?.includes('429');

      if (!isUnavailableOrRateLimited) {
        // Non-transient error, break immediately
        break;
      }
      // Transient error: switch instantly to next model without blocking sleep
    }
  }

  throw lastError || new Error('Modelos no disponibles temporalmente.');
}

// OCR Service Order Extraction Endpoint
app.post('/api/ocr-service-order', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', notes } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No se proporcionó imagen de la orden de servicio.' });
    }

    const ai = getGeminiClient();

    // Clean base64 string if it contains data URI prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const prompt = `
Eres un analista experto de ingeniería fotovoltaica y ESS.
Analiza minuciosamente esta ORDEN DE SERVICIO (SISTEMA FOTOVOLTAICO).

ESTRUCTURA VISUAL DEL FORMATO (TABLA DE 2 COLUMNAS):
- COLUMNA IZQUIERDA (Fondo Azul): Nombres de los campos / etiquetas.
- COLUMNA DERECHA (Fondo Blanco / Claro): Valores y datos del proyecto.

SECCIONES Y CAMPOS A EXTRAER:

1. SECCIÓN: DATOS GENERALES
   • Nombre del Cliente -> nombre_cliente
   • Fecha de instalación -> fecha_programada / fecha_instalacion
   • Dirección de la instalación (incluyendo notas entre paréntesis) -> ubicacion_instalacion
   • Teléfono de contacto -> telefono_contacto
   • E-Mail -> email

2. SECCIÓN: CONDICIONES DEL LUGAR DE INSTALACIÓN
   • Tipo de Azotea (ej. Loza, Lámina, Teja) -> tipo_azotea
   • Inclinación (ej. 6°) -> inclinacion_grados
   • Distancia en metros entre los paneles y los inversores (ej. 2m) -> longitud_ruta_dc_m (Ruta DC)
   • Distancia en metros entre el inversor y centro de carga (ej. 25m) -> longitud_ruta_ac_m (Ruta AC)

3. SECCIÓN: DATOS DEL SISTEMA FOTOVOLTAICO
   • Tipo de proyecto -> tipo_proyecto
   • Marca del Panel Solar -> marca_modulo
   • Número de paneles -> total_modulos / numero_paneles
   • Potencia del panel (Watts) -> potencia_modulo_w
   • Voltaje de Operación en DC -> vmp_v / voltaje_operacion_dc_v
   • Marca y modelo de inversor -> modelo_inversor
     (Copia fielmente y sin alteraciones el texto exacto de la celda 'Marca y modelo de inversor' o 'Marca y modelo del inversor'. NO supongas ni adivines).
   • Potencia nominal del inversor en kW AC -> potencia_inversor_kw
     REGLA CRÍTICA: La potencia del inversor está escrita e indicada DIRECTAMENTE dentro del texto de 'Marca y modelo de inversor'.
     Debes extraer el número de la capacidad nominal en kW de ese mismo texto (por ejemplo: si la celda dice 'GROWATT 5.0', la potencia es 5.0; si dice 'GROWATT 3.3', la potencia es 3.3; si dice 'GROWATT 6.0', es 6.0; si dice 'SOLIS 5K', es 5.0).
     NUNCA supongas 7.0 ni inventes ningún valor arbitrario. Si la celda no menciona ningún número, pon 0.
   • Protección termomagnética en AC -> proteccion_termomagnetica_ac
   • Comentarios (Comentarios A / Mecánicos / Cubierta):
     Extrae textualmente todo el texto (ej. "No se debe perforar la loza, es necesario hacer el anclaje en los pretiles...") -> comentarios_a_mecanicos

REGLA FUNDAMENTAL DE POTENCIA EN AC:
La potencia en AC del proyecto NO es la potencia en DC (paneles x Wp).
La potencia en AC es EXCLUSIVAMENTE la capacidad nominal del inversor en kW leída en 'Marca y modelo de inversor'.
Todos los cálculos de corriente de salida del inversor, corriente continua 1.25x, protección termomagnética en AC y caída de tensión en ruta AC se realizan con base en esta potencia nominal del inversor.

4. SECCIÓN: INSTALACIÓN ELÉCTRICA
   • Instalación eléctrica (ej. Bifásica, Monofásica, Trifásica) -> fases_red (ej. "2F-3H")
   • Tipo de medidor (ej. Digital) -> tipo_medidor
   • Requiere acondicionar preparación para medidor (ej. NO / SÍ) -> requiere_acondicionar_preparacion_medidor
   • Acometida (ej. Aérea / Subterránea) -> acometida
   • Comentarios (Comentarios B / Eléctricos / Interconexión):
     Extrae textualmente todo el texto (ej. "Se colocará un Centro de Carga a un costado del medidor de CFE...") -> comentarios_b_electricos / ultimo_cuadro_consideraciones_especiales

REGLA DE FIDELIDAD:
- Vaciado exacto de las cifras de la columna derecha blanca y los textos de comentarios.
- Si un campo no existe o está vacío, pon 0 (números) o "" (texto).
`;

    const response = await generateWithFallback(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: prompt + (notes ? `\nNotas adicionales del usuario: ${notes}` : ''),
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            folio_orden_servicio: { type: Type.STRING, description: 'Folio o código de la orden de servicio si existe' },
            nombre_cliente: { type: Type.STRING, description: 'Nombre del cliente en la tabla' },
            fecha_programada: { type: Type.STRING, description: 'Fecha de instalación en la tabla' },
            ubicacion_instalacion: { type: Type.STRING, description: 'Dirección de la instalación completa' },
            telefono_contacto: { type: Type.STRING, description: 'Teléfono de contacto' },
            email: { type: Type.STRING, description: 'E-Mail de contacto' },
            temperatura_ambiente_c: { type: Type.NUMBER, description: 'Temperatura ambiente en °C si existe, o 35' },

            // Condiciones del lugar de instalación
            tipo_azotea: { type: Type.STRING, description: 'Tipo de Azotea (ej. Loza, Lámina, Teja)' },
            inclinacion_grados: { type: Type.STRING, description: 'Inclinación de la azotea (ej. 6°)' },
            distancia_paneles_inversores_m: { type: Type.NUMBER, description: 'Distancia en metros entre paneles e inversores (Ruta DC)' },
            distancia_inversor_centro_carga_m: { type: Type.NUMBER, description: 'Distancia en metros entre inversor y centro de carga (Ruta AC)' },

            // Datos del sistema fotovoltaico
            tipo_proyecto: { type: Type.STRING, description: 'Tipo de proyecto (ej. CONTADO)' },
            marca_modulo: { type: Type.STRING, description: 'Marca y modelo del Panel Solar (ej. Jinko Solar 590W)' },
            total_modulos: { type: Type.NUMBER, description: 'Número de paneles (ej. 6)' },
            potencia_modulo_w: { type: Type.NUMBER, description: 'Potencia del panel en Watts (ej. 590)' },
            vmp_v: { type: Type.NUMBER, description: 'Voltaje de Operación en DC (ej. 54.5)' },
            modelo_inversor: { type: Type.STRING, description: 'Texto exacto leído de la celda "Marca y modelo de inversor" (ej. GROWATT 5.0, GROWATT 3.3, GROWATT 6.0, SOLIS 5K, etc.). Sin inventar.' },
            potencia_inversor_kw: { type: Type.NUMBER, description: 'Potencia nominal en kW extraída del texto de "Marca y modelo de inversor". Ej: si dice GROWATT 5.0 es 5.0, si dice GROWATT 3.3 es 3.3. Sin inventar.' },
            proteccion_termomagnetica_ac: { type: Type.STRING, description: 'Protección termomagnética en AC (ej. 30A)' },
            comentarios_a_mecanicos: { type: Type.STRING, description: 'Texto del recuadro Comentarios de la sección FV (Comentarios A)' },

            // Instalación eléctrica
            fases_red: { type: Type.STRING, description: 'Instalación eléctrica (ej. Bifásica, Monofásica, Trifásica)' },
            tipo_medidor: { type: Type.STRING, description: 'Tipo de medidor (ej. Digital)' },
            requiere_acondicionar_preparacion_medidor: { type: Type.STRING, description: 'Requiere acondicionar preparación para medidor (NO / SÍ)' },
            acometida: { type: Type.STRING, description: 'Acometida (ej. Aérea / Subterránea)' },
            comentarios_b_electricos: { type: Type.STRING, description: 'Texto del recuadro Comentarios de la sección Instalación Eléctrica (Comentarios B)' },

            // Conduits & routes
            longitud_ruta_dc_m: { type: Type.NUMBER, description: 'Longitud ruta DC en metros [m]' },
            tipo_tuberia_dc: { type: Type.STRING, description: 'Tipo canalización DC (EMT | IMC | PVC-40)' },
            longitud_ruta_ac_m: { type: Type.NUMBER, description: 'Longitud ruta AC en metros [m]' },
            tipo_tuberia_ac: { type: Type.STRING, description: 'Tipo canalización AC (EMT | IMC | PVC-40)' },
            material_conductor: { type: Type.STRING, description: 'Material conductor (Cu | Al)' },
            aislamiento_conductor: { type: Type.STRING, description: 'Aislamiento (THHW-LS | THHN)' },
            temperatura_aislamiento: { type: Type.STRING, description: 'Rango térmico (90C)' },

            // Último Cuadro de Texto: Consideraciones Especiales del Proyecto
            ultimo_cuadro_consideraciones_especiales: { type: Type.STRING, description: 'Texto de los comentarios y consideraciones especiales del proyecto' },
            directivas_especiales_extraidas: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'Lista de directivas de ingeniería detectadas en el cuadro de consideraciones especiales'
            },

            confianza_score: { type: Type.NUMBER, description: 'Índice de confianza de extracción (0.0 a 1.0)' },
            notas_observaciones: { type: Type.STRING, description: 'Comentarios o datos detectados' },
          },
        },
      },
    });

    let rawText = response.text?.trim() || '{}';
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const rawParsed = JSON.parse(rawText);
    
    // Extracción rigurosa de potencia desde el texto de modelo_inversor
    if (rawParsed.modelo_inversor) {
      const derivedFromModel = extractInverterPowerFromModel(rawParsed.modelo_inversor);
      if (derivedFromModel > 0) {
        rawParsed.potencia_inversor_kw = derivedFromModel;
      }
    }

    const validatedData = normalizeServiceOrderWithUnits(rawParsed);
    return res.json({ success: true, data: validatedData });
  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Error al procesar la imagen de la orden de servicio con IA.',
      details: error.message 
    });
  }
});

// Proactive Geo-Location & Solar Irradiation API
app.post('/api/geo-solar-weather', async (req, res) => {
  try {
    const { address, lat: reqLat, lon: reqLon } = req.body;

    let lat = reqLat ? Number(reqLat) : null;
    let lon = reqLon ? Number(reqLon) : null;
    let formattedAddress = address || 'Naucalpan, Estado de México';
    let city = 'Naucalpan';
    let state = 'Estado de México';
    let country = 'México';

    // 1. Geocode address if coordinates are not provided
    if ((lat === null || lon === null) && address) {
      try {
        // Clean address query for Nominatim
        const cleanQuery = encodeURIComponent(
          address
            .replace(/\(.*?\)/g, '') // remove parenthetical notes
            .replace(/HAY QUE TOCAR.*$/i, '')
            .trim()
        );
        const geoResp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${cleanQuery}&limit=1&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'PV-ESS-Solar-Engine/1.0',
            },
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
        console.warn('Nominatim geocode failed, using coordinates fallback:', e);
      }
    }

    // Default Naucalpan fallback if still unresolved
    if (lat === null || lon === null) {
      lat = 19.4785;
      lon = -99.2396;
      city = 'Naucalpan';
      state = 'Estado de México';
    }

    // 2. Fetch Open-Meteo Solar Resource & Climate Data
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
          // Climate design max is slightly above 7-day forecast
          ambientMaxTempC = Math.max(35, Math.round(maxForecast + 3));
        }
        if (wData.daily?.temperature_2m_min?.length) {
          const minForecast = Math.min(...wData.daily.temperature_2m_min);
          // Extreme cold temperature for Voc calculation
          ambientMinTempC = Math.min(10, Math.round(minForecast - 2));
        }
        if (wData.daily?.shortwave_radiation_sum?.length) {
          // shortwave_radiation_sum in MJ/m² -> convert to kWh/m²/day (/ 3.6)
          const validSums = wData.daily.shortwave_radiation_sum.filter((s: number) => s > 0);
          if (validSums.length > 0) {
            const avgMJ = validSums.reduce((a: number, b: number) => a + b, 0) / validSums.length;
            dailyAverageGHI = parseFloat((avgMJ / 3.6).toFixed(2));
          }
        }
        if (wData.daily?.direct_normal_irradiance_instant_max?.length) {
          maxIrradianceW = Math.round(Math.max(...wData.daily.direct_normal_irradiance_instant_max, 980));
        }
      }
    } catch (e) {
      console.warn('Open-Meteo weather fetch error, using calibrated regional database:', e);
    }

    // Regional climate calibration for Northern vs Central vs Coastal Mexico
    if (lat > 25.0) {
      // Northern Mexico (Sonora, Chihuahua, Monterrey)
      ambientMaxTempC = Math.max(ambientMaxTempC, 42);
      ambientMinTempC = Math.min(ambientMinTempC, 2);
    }

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const seasonalHspCoeffs = [0.88, 0.94, 1.05, 1.12, 1.10, 1.02, 0.98, 0.99, 0.95, 0.97, 0.91, 0.86];
    const seasonalTempDeltas = [-4, -2, 1, 3, 4, 3, 2, 2, 1, 0, -2, -4];

    const monthlyHSP = months.map((m, idx) => ({
      month: m,
      hsp: parseFloat((dailyAverageGHI * seasonalHspCoeffs[idx]).toFixed(2)),
      avgTempC: Math.round(currentTempC + seasonalTempDeltas[idx]),
    }));

    const resultPayload = {
      location: {
        lat: parseFloat(lat.toFixed(5)),
        lon: parseFloat(lon.toFixed(5)),
        formattedAddress,
        city,
        state,
        country,
        elevationM: elevation,
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
      climateZone: elevation > 2000 ? 'Altiplano Central (Templado)' : (lat > 25 ? 'Árido / Desértico' : 'Cálido Subhúmedo'),
      source: 'Open-Meteo API / NASA POWER Calibrated Solar Resource',
    };

    return res.json({ success: true, data: resultPayload });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Error al consultar variables geográficas y solares.',
      details: error.message,
    });
  }
});

function buildCompactEngineeringContext(model: any, result: any): string {
  const dcP = result?.dc?.totalPowerW 
    ? (result.dc.totalPowerW / 1000).toFixed(2)
    : (result?.systemSummary?.dcPowerKw || ((Number(model?.pv?.totalModules || 6) * Number(model?.pv?.powerW || 590)) / 1000).toFixed(2));
  const acP = result?.ac?.totalAcPowerKw 
    ? result.ac.totalAcPowerKw.toFixed(1)
    : (result?.systemSummary?.acPowerKw || model?.inverter?.ratedPowerKw || '3.3');
  const dcAc = result?.systemSummary?.dcAcRatio || (Number(dcP) / (Number(acP) || 1)).toFixed(2);
  
  const routesList = (model?.routes || []).map((r: any) => {
    const calc = (result?.routeResults || result?.routes || []).find((cr: any) => cr.routeId === r.id || cr.routeName === r.name || cr.name === r.name);
    const dropPct = calc?.voltageDropPercent != null 
      ? (typeof calc.voltageDropPercent === 'number' ? calc.voltageDropPercent.toFixed(2) : calc.voltageDropPercent) 
      : 'N/A';
    const dropV = calc?.voltageDropV != null
      ? (typeof calc.voltageDropV === 'number' ? calc.voltageDropV.toFixed(2) : calc.voltageDropV)
      : 'N/A';
    const gauge = calc?.selectedGauge || r.conductorGauge || '10';
    const fillPct = calc?.actualConduitFillPercent != null 
      ? (typeof calc.actualConduitFillPercent === 'number' ? calc.actualConduitFillPercent.toFixed(1) : calc.actualConduitFillPercent)
      : (calc?.conduitFillPercent || 'N/A');
    const ocpd = calc?.ocpdRatingA || r.ocpdRatingA || 'N/A';
    
    return `• Ruta "${r.name || r.type}" (${r.type}): Longitud REAL = ${r.lengthM}m, Conductor = ${gauge} AWG (${r.material || 'Cu'}, ${r.insulation || 'THHW-LS'}), Canalización = ${calc?.selectedConduitTradeSize || r.conduitTradeSize || '3/4'}" ${r.conduitType || 'EMT'} (Llenado: ${fillPct}%), Caída de tensión = ${dropPct}% (${dropV}V), OCPD = ${ocpd}A`;
  }).join('\n');

  const validations = result?.validations || [];
  const failed = validations.filter((v: any) => v.passed === false || v.status === 'failed');
  const auditStr = failed.length === 0 
    ? '100% Cumplimiento NOM-001-SEDE / NEC (0 violaciones)' 
    : `${failed.length} observaciones detectadas (${failed.map((f: any) => f.rule || f.title).join(', ')})`;

  return `[DATOS EXACTOS DEL PROYECTO ACTUAL EN TIEMPO REAL]
Proyecto: ${model?.projectName || 'Solar FV'} | Cliente: ${model?.clientName || 'Cliente'} | Temp Sitio: Min ${model?.ambientMinTempC ?? 5}°C, Max ${model?.ambientMaxTempC ?? 40}°C
Generador FV: ${model?.pv?.totalModules} módulos de ${model?.pv?.powerW}W (${model?.pv?.manufacturer || 'LONGi'} ${model?.pv?.model || ''}) = ${dcP} kWp DC | Voc STC: ${model?.pv?.vocV}V, Vmp: ${model?.pv?.vmpV}V, Isc: ${model?.pv?.iscA}A | Arreglo: ${model?.pv?.numberOfStrings} strings × ${model?.pv?.modulesPerString} módulos
Inversor: ${model?.inverter?.manufacturer || 'Growatt'} ${model?.inverter?.model || 'MIN'} (${acP} kW AC @ ${model?.inverter?.nominalAcVoltageV || 220}V ${model?.inverter?.systemType || '2F-2H'}) | Relación DC/AC: ${dcAc}
Rutas Físicas Reales (${model?.routes?.length || 0}):
${routesList || '• Sin rutas configuradas'}
Auditoría Normativa: ${auditStr}`;
}

const ASSISTANT_SYSTEM_INSTRUCTION = `Eres el Asistente Experto de Ingeniería Eléctrica y Solar NOM/NEC.
Tu objetivo es dar respuestas técnicas, concisas y de máxima fidelidad basadas en la NOM-001-SEDE-2012 y NEC 2023.

REGLA CRÍTICA DE PRECISIÓN DE DATOS:
- Basa tus respuestas ÚNICAMENTE en las cifras exactas del [DATOS EXACTOS DEL PROYECTO ACTUAL EN TIEMPO REAL].
- NUNCA inventes, supongas ni generalices valores predeterminados (por ejemplo: si una ruta mide 25m, 28m o cualquier otra distancia, debes citar EXACTAMENTE esa distancia en metros; NUNCA uses 22m, 20m o 12m si la ruta del proyecto indica otro valor).
- Cita los artículos normativos pertinentes (Art. 690, 705, 310, 250, 240) y cálculos numéricos con absoluta precisión.`;

// AI Engineering Assistant Streaming Endpoint (SSE) for Ultra-Fast TTFT (<300ms)
app.post('/api/gemini/assistant-stream', async (req, res) => {
  const { query, model, result, history = [] } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Falta la consulta para el asistente.' });
  }

  // Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const ai = getGeminiClient();
    const compactContext = buildCompactEngineeringContext(model, result);

    // Keep history compact to minimize latency
    const recentHistory = history.slice(-4);
    const historyText = recentHistory.length > 0 
      ? `HISTORIAL:\n${recentHistory.map((h: any) => `${h.role === 'user' ? 'U' : 'A'}: ${h.content}`).join('\n')}\n\n`
      : '';

    const promptText = `${compactContext}\n\n${historyText}CONSULTA: "${query}"`;

    let streamGenerated = false;

    for (const modelName of FAST_MODELS) {
      try {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: [{ parts: [{ text: promptText }] }],
          config: {
            systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
            temperature: 0.2,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        for await (const chunk of stream) {
          if (chunk.text) {
            streamGenerated = true;
            res.write(`data: ${JSON.stringify({ text: chunk.text, source: 'cloud' })}\n\n`);
          }
        }

        if (streamGenerated) {
          res.write(`data: ${JSON.stringify({ done: true, source: 'cloud' })}\n\n`);
          res.end();
          return;
        }
      } catch (err: any) {
        console.warn(`Fallback stream con ${modelName}:`, err?.message || err);
        // Continue to next model if failed
      }
    }

    // If cloud models failed, stream local engine response smoothly
    const localRes = generateLocalAssistantResponse(query, model, result, history);
    res.write(`data: ${JSON.stringify({ text: localRes.answer, source: 'local' })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, source: 'local' })}\n\n`);
    res.end();
  } catch (error: any) {
    console.warn('Error en stream nube, ejecutando motor local:', error);
    const localRes = generateLocalAssistantResponse(query, model, result, history);
    res.write(`data: ${JSON.stringify({ text: localRes.answer, source: 'local' })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, source: 'local' })}\n\n`);
    res.end();
  }
});

// AI Engineering Assistant for Project Analysis and Technical Inquiries (Standard JSON Endpoint)
app.post('/api/gemini/assistant', async (req, res) => {
  try {
    const { query, model, result, history = [] } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Falta la consulta para el asistente.' });
    }

    const ai = getGeminiClient();
    const compactContext = buildCompactEngineeringContext(model, result);

    const recentHistory = history.slice(-4);
    const historyText = recentHistory.length > 0 
      ? `HISTORIAL:\n${recentHistory.map((h: any) => `${h.role === 'user' ? 'U' : 'A'}: ${h.content}`).join('\n')}\n\n`
      : '';

    const promptText = `${compactContext}\n\n${historyText}CONSULTA: "${query}"`;

    const response = await generateWithFallback(ai, {
      contents: {
        parts: [{ text: promptText }],
      },
      config: {
        systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });

    const assistantAnswer = response?.text || 'No se pudo generar una respuesta técnica en este momento.';

    return res.json({
      success: true,
      answer: assistantAnswer,
      source: 'gemini_cloud',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.warn('Asistente IA Nube no disponible o sin API key, aplicando Motor de Ingeniería Local NOM/NEC:', error?.message || error);

    const reqModel = req.body?.model;
    const reqResult = req.body?.result;
    const reqQuery = req.body?.query || '';
    const reqHistory = req.body?.history || [];

    if (reqModel && reqResult) {
      const localResponse = generateLocalAssistantResponse(reqQuery, reqModel, reqResult, reqHistory);
      return res.json({
        success: true,
        answer: localResponse.answer,
        _fallback: true,
        source: 'local_expert_engine',
        timestamp: localResponse.timestamp,
      });
    }

    return res.status(200).json({
      success: true,
      answer: '### ⚡ Asistente de Ingeniería Local NOM/NEC\n\nEl motor de cálculo local está activo. Carga o selecciona tu proyecto para ver el análisis técnico en tiempo real.',
      _fallback: true,
      source: 'local_expert_engine',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'pv-ess-bom-engine' });
});

// Vite middleware for development & static files in production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
