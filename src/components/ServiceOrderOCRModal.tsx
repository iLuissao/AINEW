import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  ClipboardPaste,
  FileSpreadsheet,
  MapPin,
  ShieldCheck,
  Wrench,
  User,
  SunMedium,
  ArrowRight,
  Sliders,
  Calendar,
  Phone,
  Mail,
  Compass,
  Layers,
  Activity,
  Check,
  Building,
  Info,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import {
  ServiceOrderExtraction,
  normalizeServiceOrderWithUnits,
  extractInverterPowerFromModel,
} from '../engine/schemas';
import {
  InstallationModel,
  InverterArchitecture,
  RouteConfig,
  ConduitType,
  ConductorMaterial,
  InsulationType,
  TempRating,
} from '../engine/types';

interface ServiceOrderOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtractedModel: (
    modelUpdates: Partial<InstallationModel>,
    meta: { serviceOrderId?: string; clientName?: string; scheduledDate?: string }
  ) => void;
  currentActiveProjectName?: string;
}

/**
 * Image Preprocessing for Clean OCR Text Recognition
 */
async function preprocessImageForOCR(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      let scale = 1.0;
      if (img.width < 1200) {
        scale = Math.min(2.5, 1600 / img.width);
      }
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        gray = (gray - 128) * 1.45 + 128;
        gray = Math.max(0, Math.min(255, gray));
        const finalVal = gray < 135 ? Math.max(0, gray * 0.7) : Math.min(255, gray * 1.15 + 20);
        d[i] = finalVal;
        d[i + 1] = finalVal;
        d[i + 2] = finalVal;
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function compressImageToDataUrl(file: File, maxDimension = 1600, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const ServiceOrderOCRModal: React.FC<ServiceOrderOCRModalProps> = ({
  isOpen,
  onClose,
  onApplyExtractedModel,
  currentActiveProjectName,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [viewFormat, setViewFormat] = useState<'document' | 'material'>('document');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ocrStatusText, setOcrStatusText] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ServiceOrderExtraction | null>(null);
  const [customInvKw, setCustomInvKw] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  /**
   * Deterministic parser for service order tabular format
   * Extracts every variable from the scanned document
   */
  const parseServiceOrderText = (rawText: string): ServiceOrderExtraction => {
    let clean = (rawText || '')
      .replace(/(\d+),(\d+)/g, '$1.$2')
      .replace(/(\d+)\s*[oO]\s*(?:w|watts|wp)/gi, '$10 W');

    const folioMatch = clean.match(/(?:OS\s*SFI-[\w-]+|folio[:\s]+([\w-]+)|OS-[\w-]+)/i);
    const folio = folioMatch ? folioMatch[0].trim() : '';

    const clientMatch = clean.match(/(?:nombre\s*del\s*cliente|cliente)[:\s|]+([^\n\r]+)/i);
    const clientName = clientMatch ? clientMatch[1].trim() : '';

    const dateMatch = clean.match(/(?:fecha\s*de\s*instalaci[oó]n|fecha)[:\s|]+([^\n\r]+)/i);
    const scheduledDate = dateMatch ? dateMatch[1].trim() : '';

    const addressMatch = clean.match(/(?:direcci[oó]n\s*de\s*la\s*instalaci[oó]n|ubicaci[oó]n|direcci[oó]n)[:\s|]+([\s\S]*?)(?:tel[eé]fono|condiciones|tipo\s*de\s*azotea|$)/i);
    let address = addressMatch ? addressMatch[1].trim().replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ') : '';

    const phoneMatch = clean.match(/(?:tel[eé]fono(?:\s*de\s*contacto)?|tel)[:\s|]+([0-9\s-]+)/i);
    const phone = phoneMatch ? phoneMatch[1].trim() : '';

    const emailMatch = clean.match(/(?:e-?mail|correo)[:\s|]+([^\n\r\s]+@[^\n\r\s]+)/i);
    const email = emailMatch ? emailMatch[1].trim() : '';

    const roofMatch = clean.match(/(?:tipo\s*de\s*azotea)[:\s|]+([^\n\r]+)/i);
    const roofType = roofMatch ? roofMatch[1].trim() : 'Concreto Plano';

    const tiltMatch = clean.match(/(?:inclinaci[oó]n)[:\s|]+([^\n\r]+)/i);
    let roofTilt = tiltMatch ? tiltMatch[1].trim() : '0°';
    if (roofTilt.toUpperCase() === 'NO') roofTilt = '0° (Coplanar)';

    const dcMetersMatch = clean.match(/(?:distancia\s*en\s*metros\s*entre\s*(?:los\s*)?paneles\s*y\s*(?:los\s*)?inversores|distancia\s*dc|paneles\s*a\s*inversores)[:\s|]*([0-9/.\s]+)\s*m?/i);
    let dcLength = 0;
    if (dcMetersMatch) {
      const firstNum = dcMetersMatch[1].split('/')[0].trim();
      dcLength = parseFloat(firstNum) || 0;
    }

    const acMetersMatch = clean.match(/(?:distancia\s*en\s*metros\s*entre\s*(?:el\s*)?inversor\s*y\s*(?:el\s*)?centro\s*de\s*carga|distancia\s*ac|inversor\s*a\s*centro\s*de\s*carga)[:\s|]*([0-9/.\s]+)\s*m?/i);
    let acLength = 15;
    if (acMetersMatch) {
      const firstNum = acMetersMatch[1].split('/')[0].trim();
      acLength = parseFloat(firstNum) || 15;
    }

    const projectTypeMatch = clean.match(/(?:tipo\s*de\s*proyecto)[:\s|]+([^\n\r]+)/i);
    const projectType = projectTypeMatch ? projectTypeMatch[1].trim() : 'CONTADO';

    const pvBrandMatch = clean.match(/(?:marca\s*del\s*panel\s*solar|panel\s*solar|m[oó]dulo)[:\s|]+([^\n\r]+)/i);
    const pvBrand = pvBrandMatch ? pvBrandMatch[1].trim() : 'Módulo Solar';

    const numPanelsMatch = clean.match(/(?:n[uú]mero\s*de\s*paneles|total\s*paneles|paneles)[:\s|]*(\d+)/i);
    const totalPanels = numPanelsMatch ? parseInt(numPanelsMatch[1], 10) : 0;

    const panelPowerMatch = clean.match(/(?:potencia\s*del\s*panel\s*\(?watts\)?|potencia\s*unitaria|potencia)[:\s|]*(\d{3,4})\s*(?:w|watts|wp)?/i);
    const panelPowerW = panelPowerMatch ? parseInt(panelPowerMatch[1], 10) : 590;

    const vDcMatch = clean.match(/(?:voltaje\s*de\s*operaci[oó]n\s*en\s*dc|voltaje\s*dc|vmp)[:\s|]*([0-9.]+)\s*v?/i);
    const vDcOper = vDcMatch ? parseFloat(vDcMatch[1]) : 0;

    // Extracción de "Marca y modelo de inversor" (cubre "de" y "del")
    const invModelMatch = clean.match(/(?:marca\s*y\s*modelo\s*(?:del?|de\s*el)?\s*inversor|marca\s*(?:y\s*modelo)?\s*inversor|modelo\s*inversor|inversor)[:\s|]+([^\n\r]+)/i);
    let invModel = invModelMatch ? invModelMatch[1].trim() : '';

    // Extraer la potencia del inversor directamente de la marca y modelo sin suposiciones
    let invKw = extractInverterPowerFromModel(invModel);
    if (invKw === 0) {
      const invPowerMatch = clean.match(/(?:potencia\s*(?:nominal)?\s*(?:del\s*)?inversor|capacidad\s*(?:del\s*)?inversor|potencia\s*ac|capacidad\s*ac)[:\s|]*([0-9.]+)\s*(?:kw|k)?/i);
      if (invPowerMatch) invKw = parseFloat(invPowerMatch[1]);
    }

    const breakerMatch = clean.match(/(?:protecci[oó]n\s*termomagn[eé]tica\s*en\s*ac|protecci[oó]n\s*ac|interruptor\s*ac|breaker)[:\s|]+([^\n\r]+)/i);
    const acBreaker = breakerMatch ? breakerMatch[1].trim() : '';

    const comAMatch = clean.match(/(?:comentarios\s*a|comentarios(?:\s*mec[aá]nicos)?)(?:[:\s|]+)([\s\S]*?)(?:instalaci[oó]n\s*el[eé]ctrica|datos\s*del\s*sistema|$)/i);
    let comentariosA = comAMatch ? comAMatch[1].trim() : '';

    const gridConnMatch = clean.match(/(?:instalaci[oó]n\s*el[eé]ctrica|fases\s*de\s*red|fases)[:\s|]+([^\n\r]+)/i);
    const gridConn = gridConnMatch ? gridConnMatch[1].trim() : 'Bifásica';

    const meterMatch = clean.match(/(?:tipo\s*de\s*medidor|medidor)[:\s|]+([^\n\r]+)/i);
    const meterType = meterMatch ? meterMatch[1].trim() : 'DIGITAL';

    const meterPrepMatch = clean.match(/(?:requiere\s*acondicionar\s*preparaci[oó]n\s*para\s*medidor|acondicionar\s*medidor)[:\s|]+([^\n\r]+)/i);
    const meterPrep = meterPrepMatch ? meterPrepMatch[1].trim() : 'NO';

    const acometidaMatch = clean.match(/(?:acometida)[:\s|]+([^\n\r]+)/i);
    const serviceDrop = acometidaMatch ? acometidaMatch[1].trim() : 'Aérea';

    const comBMatch = clean.match(/(?:comentarios\s*b|comentarios(?:\s*el[eé]ctricos)?)(?:[:\s|]+)([\s\S]*?)(?:soluciones|consideraciones|$)/i);
    let comentariosB = comBMatch ? comBMatch[1].trim() : '';

    const payload = {
      folio_orden_servicio: folio,
      nombre_cliente: clientName,
      fecha_instalacion: scheduledDate,
      direccion_instalacion: address,
      telefono_contacto: phone,
      email,
      tipo_azotea: roofType,
      inclinacion_grados: roofTilt,
      distancia_paneles_inversores_m: dcLength,
      distancia_inversor_centro_carga_m: acLength,
      tipo_proyecto: projectType,
      marca_panel_solar: pvBrand,
      numero_paneles: totalPanels,
      potencia_panel_watts: panelPowerW,
      voltaje_operacion_dc_v: vDcOper,
      marca_modelo_inversor: invModel,
      potencia_inversor_kw: invKw,
      proteccion_termomagnetica_ac: acBreaker,
      comentarios_a_mecanicos: comentariosA,
      instalacion_electrica: gridConn,
      tipo_medidor: meterType,
      requiere_acondicionar_preparacion_medidor: meterPrep,
      acometida: serviceDrop,
      comentarios_b_electricos: comentariosB,
    };

    return normalizeServiceOrderWithUnits(payload);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setError(null);
      try {
        const compressedDataUrl = await compressImageToDataUrl(file, 1600, 0.88);
        setImagePreview(compressedDataUrl);
      } catch {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImageFile(file);
      setError(null);
      try {
        const compressedDataUrl = await compressImageToDataUrl(file, 1600, 0.88);
        setImagePreview(compressedDataUrl);
      } catch {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  /**
   * Run Genuine OCR
   */
  const handleRunOCR = async () => {
    if (!imagePreview) {
      setError('Por favor selecciona o arrastra la imagen de la orden de servicio para escanear.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setOcrProgress(15);
    setOcrStatusText('Enviando documento al analizador multimodal...');

    try {
      const response = await fetch('/api/ocr-service-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: imageFile?.type || 'image/jpeg',
        }),
      });

      if (response.ok) {
        setOcrProgress(80);
        setOcrStatusText('Identificando y unificando variables del documento...');
        const json = await response.json();
        if (json.success && json.data) {
          setExtractedData(json.data);
          setOcrProgress(100);
          setOcrStatusText('¡Variables extraídas exitosamente!');
          setIsLoading(false);
          return;
        }
      }

      setOcrProgress(40);
      setOcrStatusText('Procesando con motor de reconocimiento óptico local (Tesseract)...');
      const preprocessed = await preprocessImageForOCR(imagePreview);
      
      setOcrProgress(60);
      const worker = await Tesseract.createWorker('spa+eng');
      setOcrProgress(75);
      const ret = await worker.recognize(preprocessed);
      await worker.terminate();

      const recognized = ret.data.text;
      setPastedText(recognized);
      setOcrProgress(90);
      setOcrStatusText('Unificando parámetros eléctricos...');

      const structured = parseServiceOrderText(recognized);
      setExtractedData(structured);
      setOcrProgress(100);
      setOcrStatusText('¡Lectura OCR completada!');
    } catch (err: unknown) {
      console.error('OCR Error:', err);
      setError('Ocurrió un error al procesar la imagen. Puedes pegar el texto directamente o intentar con otra foto más legible.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Apply All Unified Variables to the Active Project
   * CRITICAL RULE: AC calculations use strictly the inverter nominal rated power (kW), NEVER DC array power.
   */
  const handleApplyToModel = () => {
    if (!extractedData) return;

    let phases = '2F-3H';
    let nominalAcV = 220;
    const gridConnLower = (extractedData.gridConnectionType || '').toLowerCase();
    if (gridConnLower.includes('monof') || gridConnLower.includes('1f')) {
      phases = '1F-2H';
      nominalAcV = 127;
    } else if (gridConnLower.includes('trif') || gridConnLower.includes('3f')) {
      phases = '3F-4H';
      nominalAcV = 220;
    }

    const dcLength = extractedData.routes?.[0]?.lengthM ?? 2;
    const acLength = extractedData.routes?.[1]?.lengthM ?? 20;

    const totalMods = extractedData.pv.totalModules || 10;
    const powerW = extractedData.pv.powerW || 590;
    const totalDckWp = (totalMods * powerW) / 1000;

    // REGRA CRÍTICA NOM-001: La potencia AC es la potencia nominal del inversor indicada en la orden, NUNCA la potencia DC (módulos x Wp)
    const invRatedKw = (customInvKw !== null && customInvKw > 0)
      ? customInvKw
      : (extractedData.inverter.ratedPowerKw > 0
          ? extractedData.inverter.ratedPowerKw
          : (extractInverterPowerFromModel(extractedData.inverter.model) || 0));

    const is3P = phases.startsWith('3');
    // Corriente nominal de salida AC del inversor:
    // Trifásico: I = P_ac / (sqrt(3) * V_ac)
    // Monofásico / Bifásico: I = P_ac / V_ac
    const invNominalAmps = is3P
      ? parseFloat(((invRatedKw * 1000) / (nominalAcV * Math.sqrt(3))).toFixed(2))
      : parseFloat(((invRatedKw * 1000) / nominalAcV).toFixed(2));

    const invContinuousDesignAmps = parseFloat((invNominalAmps * 1.25).toFixed(2));

    const validRoutes: RouteConfig[] = [
      {
        id: 'route-dc-main',
        name: 'Ruta DC: Arreglo FV a Inversor',
        type: 'DC',
        origin: `Arreglo ${totalMods} Módulos ${extractedData.pv.manufacturer} en Cubierta`,
        destination: `Inversor ${extractedData.inverter.model || 'Interconectado'}`,
        lengthM: dcLength,
        systemType: 'DC-2W',
        voltageV: extractedData.pv.vmpV * (extractedData.pv.modulesPerString || totalMods),
        operatingCurrentA: extractedData.pv.impA || 13.2,
        maxDesignCurrentA: (extractedData.pv.iscA || 14.1) * 1.56,
        currentBasisDescription: 'Isc × 1.56 según NOM-001-SEDE Art. 690-8',
        powerFactor: 1.0,
        material: 'Cu' as ConductorMaterial,
        insulation: 'PV-Wire' as InsulationType,
        tempRating: '90C' as TempRating,
        ambientTempC: extractedData.ambientTempC || 38,
        rooftopAdderC: 17,
        conduitType: 'EMT' as ConduitType,
        isNipple: false,
        geometry: {
          bends90: dcLength > 10 ? 2 : 1,
          bends45: 0,
          cabinetEntries: 1,
          cabinetExits: 1,
          supportSpacingM: 1.5,
          isOutdoor: true,
        },
      },
      {
        id: 'route-ac-main',
        name: 'Ruta AC: Inversor a Centro de Carga / Punto Interconexión',
        type: 'AC',
        origin: `Inversor ${extractedData.inverter.model || 'Interconectado'}`,
        destination: 'Centro de Carga / Interconexión CFE',
        lengthM: acLength,
        systemType: is3P ? '3F-4H-220/127V' : '2F-2H-220V',
        voltageV: nominalAcV,
        operatingCurrentA: invNominalAmps,
        maxDesignCurrentA: invContinuousDesignAmps,
        currentBasisDescription: `Inversor Nominal (${invRatedKw} kW AC @ ${nominalAcV}V ${phases}): I_nom = ${invNominalAmps}A | I_diseño = ${invContinuousDesignAmps}A (1.25x continuo NOM Art. 690-8 / 705)`,
        powerFactor: 0.99,
        material: 'Cu' as ConductorMaterial,
        insulation: 'THHW-LS' as InsulationType,
        tempRating: '90C' as TempRating,
        ambientTempC: extractedData.ambientTempC || 38,
        rooftopAdderC: 0,
        conduitType: 'EMT' as ConduitType,
        isNipple: false,
        geometry: {
          bends90: acLength > 15 ? 3 : 1,
          bends45: 1,
          cabinetEntries: 1,
          cabinetExits: 1,
          supportSpacingM: 1.5,
          isOutdoor: false,
        },
      },
    ];

    const modelUpdates: Partial<InstallationModel> = {
      projectName: extractedData.clientName
        ? `Sistema Fotovoltaico ${totalDckWp > 0 ? `${totalDckWp.toFixed(2)} kWp DC / ` : ''}${invRatedKw} kW AC - ${extractedData.clientName}`
        : `Sistema Fotovoltaico ${invRatedKw} kW AC`,
      clientName: extractedData.clientName || 'Cliente Activo',
      installationId: extractedData.serviceOrderId || `OS-${Date.now().toString().slice(-6)}`,
      location: extractedData.installationAddress || 'Ubicación de Proyecto',
      ambientMaxTempC: extractedData.ambientTempC || 38,
      ambientMinTempC: 5,
      pv: {
        manufacturer: extractedData.pv.manufacturer || 'Solar Tier 1',
        model: extractedData.pv.model || `${extractedData.pv.manufacturer} ${powerW}W`,
        powerW,
        totalModules: totalMods,
        numberOfStrings: extractedData.pv.numberOfStrings || (totalMods >= 10 ? 2 : 1),
        modulesPerString: extractedData.pv.modulesPerString || Math.ceil(totalMods / (totalMods >= 10 ? 2 : 1)),
        vmpV: extractedData.pv.vmpV || 44.6,
        impA: extractedData.pv.impA || 13.23,
        vocV: extractedData.pv.vocV || 53.2,
        iscA: extractedData.pv.iscA || 14.12,
        tempCoeffVocPercentPerC: -0.28,
      },
      inverter: {
        manufacturer: extractedData.inverter.manufacturer || 'Inversor',
        model: extractedData.inverter.model || `Inversor ${invRatedKw} kW`,
        architecture: 'string' as InverterArchitecture,
        numberOfUnits: 1,
        ratedPowerKw: invRatedKw,
        maxOutputCurrentA: invNominalAmps,
        nominalAcVoltageV: nominalAcV,
        systemType: is3P ? '3F-4H-220/127V' : (phases.includes('1F') ? '1F-2H-127V' : '2F-2H-220V'),
        mpptCount: (extractedData.pv.numberOfStrings || 1) >= 2 ? 2 : 1,
        efficiencyPercent: 98.2,
        maxDcVoltageV: 600,
        maxDcCurrentPerMpptA: 16.0,
      },
      routes: validRoutes,
    };

    onApplyExtractedModel(modelUpdates, {
      serviceOrderId: extractedData.serviceOrderId,
      clientName: extractedData.clientName,
      scheduledDate: extractedData.scheduledDate,
    });
    onClose();
  };

  // Pre-calculated variables for Bicolor Table display
  const totalPanels = extractedData?.pv.totalModules || 0;
  const panelPowerW = extractedData?.pv.powerW || 590;
  const totalDckWp = ((totalPanels * panelPowerW) / 1000).toFixed(2);
  const invRatedKw = (customInvKw !== null && customInvKw > 0)
    ? customInvKw
    : (extractedData?.inverter.ratedPowerKw || extractInverterPowerFromModel(extractedData?.inverter.model || '') || 0);

  const is3Phase = (extractedData?.gridConnectionType || '').toLowerCase().includes('trif') || (extractedData?.inverter.gridPhases || '').includes('3');
  const is1Phase = (extractedData?.gridConnectionType || '').toLowerCase().includes('monof') || (extractedData?.inverter.gridPhases || '').includes('1');
  const nominalAcV = extractedData?.inverter.nominalAcVoltageV || (is1Phase ? 127 : 220);

  const invNominalAmps = is3Phase
    ? parseFloat(((invRatedKw * 1000) / (nominalAcV * Math.sqrt(3))).toFixed(2))
    : parseFloat(((invRatedKw * 1000) / nominalAcV).toFixed(2));
  const invDesignAmps = parseFloat((invNominalAmps * 1.25).toFixed(2));

  const stringsCount = extractedData?.pv.numberOfStrings || 1;
  const modsPerString = extractedData?.pv.modulesPerString || totalPanels;
  const stringVmp = (modsPerString * (extractedData?.pv.vmpV || 44.6)).toFixed(1);
  const stringVoc = (modsPerString * (extractedData?.pv.vocV || 52.8)).toFixed(1);
  const stringVocCold = (parseFloat(stringVoc) * 1.056).toFixed(1);

  // AC Circuit engineering sizing strictly derived from nominal inverter power:
  const acLengthM = extractedData?.routes?.[1]?.lengthM ?? 15;
  const dcLengthM = extractedData?.routes?.[0]?.lengthM ?? 0;
  const acRecommendedGauge = invDesignAmps <= 20
    ? '12 AWG Cu THHW-LS 90°C'
    : invDesignAmps <= 25
    ? '10 AWG Cu THHW-LS 90°C'
    : invDesignAmps <= 40
    ? '8 AWG Cu THHW-LS 90°C'
    : invDesignAmps <= 55
    ? '6 AWG Cu THHW-LS 90°C'
    : invDesignAmps <= 70
    ? '4 AWG Cu THHW-LS 90°C'
    : '2 AWG Cu THHW-LS 90°C';

  const acGroundGauge = invDesignAmps <= 60
    ? '10 AWG Cu Desnudo / Verde (CPTG Art. 250-122)'
    : '8 AWG Cu Desnudo / Verde (CPTG Art. 250-122)';

  const acConduitSize = invDesignAmps <= 30
    ? '21 mm (3/4") EMT'
    : invDesignAmps <= 55
    ? '27 mm (1") EMT'
    : '35 mm (1-1/4") EMT';

  const rOhmsPerKm = invDesignAmps <= 25 ? 3.9 : (invDesignAmps <= 40 ? 2.5 : 1.6);
  const acVoltageDropPercent = parseFloat(
    (((2 * acLengthM * invNominalAmps * rOhmsPerKm) / (nominalAcV * 1000)) * 100).toFixed(2)
  );

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Material 3 Surface Modal Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl space-y-6 my-auto max-h-[94vh] overflow-y-auto">
        
        {/* Top App Bar (Material 3 Header) */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Lector OCR de Hoja de Servicio
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300 rounded-full border border-sky-500/30">
                  Proyecto Activo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Carga el documento para identificar y unificar todas las variables eléctricas en el diseño unifilar activo.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-2xl transition cursor-pointer border border-slate-700/60"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Material 3 Segmented Buttons: Source Selection */}
        <div className="flex flex-wrap items-center justify-between bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80 gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Subir Foto o Escaneo</span>
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Pegar Texto de Hoja</span>
            </button>
          </div>

          {extractedData && (
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium px-2">Vista Previa:</span>
              <button
                onClick={() => setViewFormat('document')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  viewFormat === 'document'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Formato Bicolor Oficial
              </button>
              <button
                onClick={() => setViewFormat('material')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  viewFormat === 'material'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fichas Material
              </button>
            </div>
          )}
        </div>

        {/* Mode 1: Upload File / Drag and Drop */}
        {activeTab === 'upload' && (
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                imagePreview
                  ? 'border-amber-500/50 bg-slate-900/60'
                  : 'border-slate-700 hover:border-amber-400 bg-slate-900/30'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <UploadCloud className="w-9 h-9 text-amber-400 mb-2" />
              <p className="text-xs font-bold text-white">
                Arrastra o haz clic para subir la Hoja de Servicio fotovoltaica
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Soporta capturas de cámara, JPG, PNG o documentos escaneados
              </p>
            </div>

            {imagePreview && (
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                <img
                  src={imagePreview}
                  alt="Vista previa de orden de servicio"
                  className="h-20 w-32 object-contain rounded-lg bg-slate-950 border border-slate-800"
                />
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs font-bold text-white">Documento preparado para extracción</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    El motor OCR extraerá todos los campos de la tabla y aislará la potencia nominal del inversor para el cálculo de AC.
                  </p>
                </div>
                <button
                  onClick={handleRunOCR}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 transition"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>{isLoading ? `Analizando (${ocrProgress}%)...` : 'Iniciar Lectura OCR'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Paste Raw Text */}
        {activeTab === 'paste' && (
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-amber-400 flex items-center justify-between">
              <span>Pegar contenido de la Hoja de Servicio</span>
              <span className="text-[11px] text-slate-500">Texto copiado de PDF, Excel o Notas de Campo</span>
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Pega aquí el texto de la orden de servicio fotovoltaico (Cliente, Módulos, Inversor, Protecciones, Rutas)..."
              rows={5}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 font-mono resize-none leading-relaxed"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  if (!pastedText.trim()) return;
                  const parsed = parseServiceOrderText(pastedText);
                  setExtractedData(parsed);
                }}
                disabled={!pastedText.trim()}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Identificar Variables de Texto</span>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* MAIN TOPIC CENTRAL: Extracted Unified Variables Presentation */}
        {extractedData ? (
          <div className="space-y-4">
            {/* Header Banner: Rule Reminder */}
            <div className="bg-sky-950/40 border border-sky-500/30 rounded-2xl p-3 text-xs flex items-center justify-between gap-3 text-sky-200">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  <strong>Cálculo AC Independiente:</strong> La salida AC se calcula con la <strong>Potencia Nominal del Inversor ({invRatedKw} kW)</strong>, separada de la potencia DC ({totalDckWp} kWp).
                </span>
              </div>
              <span className="hidden sm:inline px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold">
                NOM-001 Art. 690-8
              </span>
            </div>

            {/* VIEW 1: COMPLETE 2-COLUMN OFFICIAL BICOLOR TABLE (ALL FIELDS MENTIONED) */}
            {viewFormat === 'document' ? (
              <div className="bg-white rounded-2xl p-4 sm:p-5 text-slate-900 shadow-2xl border border-slate-300 space-y-4 font-sans">
                {/* Table Header */}
                <div className="text-center border-b pb-3 border-slate-200 relative">
                  <span className="absolute left-0 top-0 text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    {extractedData.serviceOrderId || 'FOLIO PENDIENTE'}
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-tight">
                    Orden de Servicio (Sistema Fotovoltaico)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Vista previa completa de todos los campos extraídos antes de vaciado al motor de cálculo
                  </p>
                </div>

                {/* Table Content */}
                <div className="border border-sky-700/40 rounded-xl overflow-hidden text-xs divide-y divide-sky-700/20">
                  
                  {/* SECCIÓN 1: DATOS GENERALES */}
                  <div className="bg-sky-800 text-white font-bold p-1.5 text-[11px] uppercase tracking-wider text-center">
                    1. Datos Generales
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Folio de Orden</div>
                    <div className="col-span-8 bg-white p-2 font-mono font-bold text-slate-900">
                      {extractedData.serviceOrderId || 'No especificado'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Nombre del Cliente</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-bold text-slate-900 text-sm">
                      {extractedData.clientName || 'No indicado en documento'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Fecha de instalación</div>
                    <div className="col-span-8 bg-white p-2 text-slate-800 font-medium">
                      {extractedData.scheduledDate || 'No indicada'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Dirección de la instalación</div>
                    <div className="col-span-8 bg-slate-50 p-2 text-slate-800 leading-snug">
                      {extractedData.installationAddress || 'No indicada'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Coordenadas GPS</div>
                    <div className="col-span-8 bg-white p-2 font-mono text-slate-700">
                      {extractedData.coordinatesGps || 'No extraídas (usando ubicación de dirección)'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Teléfono de contacto</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-mono text-slate-800">
                      {extractedData.contactPhone || 'No indicado'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">E-Mail</div>
                    <div className="col-span-8 bg-white p-2 font-mono text-slate-800">
                      {extractedData.contactEmail || 'No indicado'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Temperatura Ambiente Diseño</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-mono text-slate-800">
                      {extractedData.ambientTempC || 35} °C (Base para factores de corrección por temperatura Ft)
                    </div>
                  </div>

                  {/* SECCIÓN 2: CONDICIONES DEL LUGAR DE INSTALACIÓN */}
                  <div className="bg-sky-800 text-white font-bold p-1.5 text-[11px] uppercase tracking-wider text-center">
                    2. Condiciones del Lugar de Instalación
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Tipo de Azotea</div>
                    <div className="col-span-8 bg-white p-2 font-semibold text-slate-900">
                      {extractedData.roofType || 'Concreto Plano'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Inclinación</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-semibold text-slate-800">
                      {extractedData.roofTilt || '0° (Coplanar)'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Distancia Paneles a Inversores (Ruta DC)</div>
                    <div className="col-span-8 bg-white p-2 font-bold font-mono text-emerald-700">
                      {extractedData.routes?.[0]?.lengthM ?? 0} metros
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Distancia Inversor a Centro de Carga (Ruta AC)</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-bold font-mono text-sky-700">
                      {extractedData.routes?.[1]?.lengthM ?? 15} metros
                    </div>
                  </div>

                  {/* SECCIÓN 3: DATOS DEL SISTEMA FOTOVOLTAICO */}
                  <div className="bg-sky-800 text-white font-bold p-1.5 text-[11px] uppercase tracking-wider text-center">
                    3. Datos del Generador Fotovoltaico (Lado DC)
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Tipo de proyecto</div>
                    <div className="col-span-8 bg-white p-2 font-semibold text-slate-800">
                      {extractedData.projectType || 'CONTADO'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Marca y Modelo del Panel Solar</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-bold text-slate-900">
                      {extractedData.pv.manufacturer} {extractedData.pv.model ? `• ${extractedData.pv.model}` : ''}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Número de paneles</div>
                    <div className="col-span-8 bg-white p-2 font-bold font-mono text-slate-900">
                      {totalPanels} módulos fotovoltaicos
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Potencia del panel (Watts)</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-bold font-mono text-amber-700">
                      {panelPowerW} Wp
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Potencia Total Arreglo DC (kWp)</div>
                    <div className="col-span-8 bg-amber-50 p-2 font-bold font-mono text-amber-900">
                      {totalDckWp} kWp DC <span className="text-[11px] font-sans text-amber-800 font-normal">({totalPanels} módulos × {panelPowerW}W = potencia DC del generador)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Configuración Strings DC</div>
                    <div className="col-span-8 bg-white p-2 font-mono text-slate-800">
                      {stringsCount} string(s) × {modsPerString} módulos en serie
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Tensión de Operación DC (Módulo)</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-mono text-slate-800">
                      Vmp unitario: {extractedData.pv.vmpV || 44.6} V | Voc unitario: {extractedData.pv.vocV || 52.8} V
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Tensión Total String DC</div>
                    <div className="col-span-8 bg-white p-2 font-mono text-slate-800">
                      Vmp String: ~{stringVmp} V | Voc Frío (NOM Art. 690-7): ~{stringVocCold} V
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Corriente DC (Imp / Isc)</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-mono text-slate-800">
                      Imp: {extractedData.pv.impA || 13.23} A | Isc: {extractedData.pv.iscA || 14.12} A | I_diseño DC (1.56x): {((extractedData.pv.iscA || 14.12) * 1.56).toFixed(2)} A
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Comentarios (Comentarios A / Mecánicos)</div>
                    <div className="col-span-8 bg-white p-2 text-slate-700 leading-relaxed text-[11px]">
                      {extractedData.comentariosA || 'Sin comentarios mecánicos adicionales.'}
                    </div>
                  </div>

                  {/* SECCIÓN 4: INVERSOR Y POTENCIA NOMINAL AC */}
                  <div className="bg-sky-800 text-white font-bold p-1.5 text-[11px] uppercase tracking-wider text-center">
                    4. Inversor & Capacidad Nominal AC (Cálculo Oficial NOM-001)
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Marca y modelo del inversor</div>
                    <div className="col-span-8 bg-white p-2 font-bold font-mono text-slate-900">
                      {extractedData.inverter.manufacturer ? `${extractedData.inverter.manufacturer} ` : ''}{extractedData.inverter.model || 'Inversor Solar'}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 bg-sky-100/70 border-y border-sky-300">
                    <div className="col-span-4 bg-[#0369a1] text-white font-bold p-2.5 flex items-center">
                      <span>Potencia Nominal del Inversor (kW AC)</span>
                    </div>
                    <div className="col-span-8 p-2.5 font-extrabold font-mono text-sky-950 text-sm flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="200"
                          value={invRatedKw > 0 ? invRatedKw : ''}
                          onChange={(e) => setCustomInvKw(parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 bg-white border border-sky-400 rounded-lg font-bold font-mono text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                          placeholder="kW AC"
                        />
                        <span className="text-sm font-bold text-sky-900 font-mono">kW AC</span>
                        <span className="text-[11px] text-slate-600 font-sans font-normal">
                          (Leído de: <strong className="font-mono text-slate-800">{extractedData.inverter.model || 'Marca y modelo de inversor'}</strong>)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-200/80 px-2 py-0.5 rounded border border-sky-300 font-sans">
                        Base Oficial de Cálculo AC (NOM-001 Art. 690 / 705)
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Tensión Nominal y Fases AC</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-mono text-slate-800">
                      {nominalAcV} V AC • {extractedData.inverter.gridPhases || (is3Phase ? '3F-4H' : '2F-3H')} ({is3Phase ? 'Trifásico' : is1Phase ? 'Monofásico' : 'Bifásico'})
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Corriente Nominal Salida AC</div>
                    <div className="col-span-8 bg-white p-2 font-bold font-mono text-slate-800">
                      {invNominalAmps} A <span className="text-[10px] font-normal text-slate-500 font-sans">(I_nom = {invRatedKw}kW ÷ {is3Phase ? `(√3 × ${nominalAcV}V)` : `${nominalAcV}V`})</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Corriente Continua Diseño AC (1.25x)</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-bold font-mono text-purple-700">
                      {invDesignAmps} A <span className="text-[10px] font-normal text-purple-600 font-sans">(1.25 × {invNominalAmps}A según NOM-001 Art. 690-8 / 705)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Protección termomagnética en AC (ITM)</div>
                    <div className="col-span-8 bg-white p-2 font-bold font-mono text-purple-800">
                      {extractedData.acBreakerRating || `${is3Phase ? '3P' : '2P'}-${Math.ceil(invDesignAmps / 5) * 5}A`} <span className="text-[10px] font-normal text-slate-500 font-sans">(Icu ≥ 10 kA @ 240V)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Conductor AC Calculado</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-bold font-mono text-sky-800">
                      Fases: {acRecommendedGauge} • Tierra: {acGroundGauge}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Canalización & Caída de Tensión AC</div>
                    <div className="col-span-8 bg-white p-2 font-mono text-slate-800 text-[11px]">
                      Conduit: {acConduitSize} • ΔV estimada: ~{acVoltageDropPercent}% (L={acLengthM}m) ≤ 3.0% NOM
                    </div>
                  </div>

                  {/* SECCIÓN 5: INSTALACIÓN ELÉCTRICA Y ACOMETIDA */}
                  <div className="bg-sky-800 text-white font-bold p-1.5 text-[11px] uppercase tracking-wider text-center">
                    5. Instalación Eléctrica, Acometida & CFE
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Instalación eléctrica</div>
                    <div className="col-span-8 bg-white p-2 font-bold text-slate-900">
                      {extractedData.gridConnectionType} ({nominalAcV} V, {extractedData.inverter.gridPhases})
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Tipo de medidor</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-semibold text-slate-800">
                      {extractedData.meterType} (Bidireccional Telemétrico CFE)
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Requiere acondicionar preparación para medidor</div>
                    <div className="col-span-8 bg-white p-2 font-bold text-amber-700">
                      {extractedData.meterPrepRequired}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Acometida</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-medium text-slate-800">
                      {extractedData.serviceDropType}
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Comentarios (Comentarios B / Eléctricos)</div>
                    <div className="col-span-8 bg-white p-2 text-slate-700 leading-relaxed text-[11px]">
                      {extractedData.comentariosB || 'Sin comentarios eléctricos adicionales.'}
                    </div>
                  </div>

                  {/* SECCIÓN 6: RUTAS Y CANALIZACIONES */}
                  <div className="bg-sky-800 text-white font-bold p-1.5 text-[11px] uppercase tracking-wider text-center">
                    6. Rutas y Canalizaciones Eléctricas
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Ruta DC (Paneles a Inversor)</div>
                    <div className="col-span-8 bg-white p-2 font-mono text-slate-800">
                      {dcLengthM}m • Conductor Cu PV-Wire 90°C • Canalización Conduit EMT
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Ruta AC (Inversor a Tablero/CFE)</div>
                    <div className="col-span-8 bg-slate-50 p-2 font-mono text-slate-800">
                      {acLengthM}m • Conductor Cu THHW-LS 90°C + Neutro + Tierra CPTG • Canalización {acConduitSize}
                    </div>
                  </div>

                  {/* SECCIÓN 7: DIRECTIVAS DETECTADAS */}
                  <div className="bg-sky-800 text-white font-bold p-1.5 text-[11px] uppercase tracking-wider text-center">
                    7. Directivas Especiales Identificadas por OCR
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 bg-[#0284c7] text-white font-medium p-2">Directivas de Campo</div>
                    <div className="col-span-8 bg-white p-2 text-slate-700 space-y-1">
                      {extractedData.specialDirectives && extractedData.specialDirectives.length > 0 ? (
                        extractedData.specialDirectives.map((d, i) => (
                          <div key={i} className="text-[11px] font-medium text-slate-800 flex items-start gap-1">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{d}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400">Sin directivas especiales detectadas</span>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              /* VIEW 2: Material Design Cards */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Arreglo FV */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <SunMedium className="w-4 h-4" />
                      <span>Variables Generador Fotovoltaico (DC)</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      NOM-001 Art. 690
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Módulos & Marca</span>
                      <span className="font-bold text-white">{extractedData.pv.manufacturer}</span>
                      <span className="text-[11px] text-amber-400 block font-mono mt-0.5">
                        {totalPanels} paneles ({panelPowerW} W)
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Potencia Total DC</span>
                      <span className="font-bold text-amber-300 font-mono text-sm">{totalDckWp} kWp</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Arreglo Fotovoltaico</span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Strings / Cadenas</span>
                      <span className="font-bold text-white font-mono">
                        {stringsCount} Strings × {modsPerString} mod
                      </span>
                      <span className="text-[11px] text-slate-400 block font-mono mt-0.5">
                        Vmp ~{stringVmp} V | Voc ~{stringVoc} V
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Longitud Ruta DC</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {extractedData.routes?.[0]?.lengthM ?? 0} m
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Paneles a Inversor
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Inversor & Circuito AC */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                      <Zap className="w-4 h-4" />
                      <span>Variables Inversor & Circuito de Salida AC</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      NOM-001 Art. 705
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Modelo Inversor</span>
                      <span className="font-bold text-white font-mono">{extractedData.inverter.model || 'Inversor'}</span>
                      <span className="text-[11px] text-cyan-400 block font-mono mt-0.5">
                        {extractedData.inverter.gridPhases} @ {nominalAcV}V
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-sky-500/40 bg-sky-950/30">
                      <span className="text-[10px] text-sky-400 block font-bold uppercase">Potencia Nominal Inversor</span>
                      <span className="font-extrabold text-cyan-300 font-mono text-sm">{invRatedKw} kW AC</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Base exclusiva de cálculo AC</span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Corrientes Calculadas</span>
                      <span className="font-bold text-white font-mono">I_nom: {invNominalAmps} A</span>
                      <span className="text-[11px] text-purple-400 block font-mono mt-0.5">
                        I_diseño (1.25x): {invDesignAmps} A
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Protección Termomagnética</span>
                      <span className="font-bold text-purple-400 font-mono">
                        {extractedData.acBreakerRating || `${is3Phase ? '3P' : '2P'}-${Math.ceil(invDesignAmps / 5) * 5}A`}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Ruta AC: {extractedData.routes?.[1]?.lengthM ?? 15} m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Medición y Acometida */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Variables Medición CFE & Acometida</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      CFE G-0100
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-slate-400">Tipo de Medidor:</span>
                      <span className="font-bold text-white">{extractedData.meterType} (Bidireccional)</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-slate-400">Acondicionamiento requerido:</span>
                      <span className="font-bold text-amber-400">{extractedData.meterPrepRequired}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-slate-400">Acometida:</span>
                      <span className="font-bold text-white">{extractedData.serviceDropType}</span>
                    </div>
                  </div>
                </div>

                {/* Card 4: Consideraciones y Directivas */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <Wrench className="w-4 h-4" />
                      <span>Directivas Extraídas de la Orden</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
                      Identificado
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {extractedData.specialDirectives && extractedData.specialDirectives.length > 0 ? (
                      extractedData.specialDirectives.map((dir, idx) => (
                        <div key={idx} className="p-2 bg-slate-900/80 rounded-xl border border-slate-800/60 text-slate-300 text-[11px] leading-relaxed">
                          {dir}
                        </div>
                      ))
                    ) : (
                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800/60 text-slate-400 text-[11px]">
                        {extractedData.notes || 'Sin directivas adicionales de obra registradas en la hoja.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty State when no document loaded yet */
          <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <Sliders className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">
              Ninguna hoja de servicio escaneada en esta sesión
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Sube una fotografía de la hoja de servicio o pega su texto para extraer automáticamente todas las variables eléctricas hacia el proyecto activo.
            </p>
          </div>
        )}

        {/* Primary Action Button */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              La potencia nominal del inversor ({invRatedKw} kW) gobernará todos los cálculos de AC.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Cerrar
            </button>

            {extractedData && (
              <button
                onClick={handleApplyToModel}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Vaciar Variables al Motor Unifilar</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
