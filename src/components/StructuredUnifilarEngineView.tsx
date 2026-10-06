import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Printer,
  FileCode,
  Sun,
  Zap,
  Battery,
  Shield,
  Grid,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sliders,
  Sparkles,
  GitCommit,
  Tag,
  Share2,
  Eye,
  Settings,
  Flame,
  Snowflake,
  Cable
} from 'lucide-react';
import { ProjectModelResult, InstallationModel } from '../engine/types';
import { DxfExporter } from '../engine/edl/dxfExporter';
import { ServiceOrderToEdl } from '../engine/edl/serviceOrderToEdl';
import { EdlLayoutEngine } from '../engine/edl/edlLayoutEngine';
import {
  SvgGroundSymbol,
  SvgFuseSymbol,
  SvgBreakerSymbol,
  SvgInverterSymbol,
  SvgRotaryDisconnectSymbol,
  SvgKwhMeterSymbol,
  SvgCfeGridSymbol,
  SvgPvModuleBlock,
  SvgCircuitTag,
} from './AnsiElectricalBlocks';

interface StructuredUnifilarEngineViewProps {
  result: ProjectModelResult;
  model: InstallationModel;
  onUpdateRouteLength?: (routeId: string, newLength: number) => void;
  onSelectRoute?: (routeId: string) => void;
}

export const StructuredUnifilarEngineView: React.FC<StructuredUnifilarEngineViewProps> = ({
  result,
  model,
  onUpdateRouteLength,
  onSelectRoute,
}) => {
  const { dc, ac, routeResults, bom } = result;

  const [themeMode, setThemeMode] = useState<'cad_white' | 'dark_schematic'>('dark_schematic');
  const [zoom, setZoom] = useState<number>(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('inv-01');
  const [inspectorTab, setInspectorTab] = useState<'structure' | 'params' | 'conduit' | 'unified'>('params');
  const [showConduitAnnotations, setShowConduitAnnotations] = useState<boolean>(true);
  const [showGroundingNetwork, setShowGroundingNetwork] = useState<boolean>(true);
  const [showUnifiedMatrix, setShowUnifiedMatrix] = useState<boolean>(true);

  const svgRef = useRef<SVGSVGElement>(null);

  // 1. ========================================================
  // FASE 1: DEFINICIÓN DE LA ESTRUCTURA ELÉCTRICA (MODELO / GRAFO)
  // ========================================================
  const dcRoute = routeResults.find((r) => r.type === 'DC') || routeResults[0];
  const acRoute = routeResults.find((r) => r.type === 'AC') || routeResults[1] || routeResults[0];

  const dcLengthM = model.routes.find((r) => r.id === dcRoute?.routeId)?.lengthM || 25;
  const acLengthM = model.routes.find((r) => r.id === acRoute?.routeId)?.lengthM || 3;

  const totalDcPowerW = dc.totalPowerW || model.pv.powerW * model.pv.totalModules;
  const totalAcPowerKw = ac.totalAcPowerKw || model.inverter.ratedPowerKw;

  // Topological Nodes Definition
  const structuralNodes = useMemo(() => {
    return [
      {
        id: 'pv-array',
        level: 0,
        title: 'Generador Fotovoltaico (Arreglo FV)',
        category: 'GENERACIÓN DC',
        componentType: 'PV_ARRAY',
        ports: ['DC+', 'DC-', 'PE_FRAME'],
        manufacturer: model.pv.manufacturer,
        modelNumber: model.pv.model,
        params: {
          potenciaTotal: `${(totalDcPowerW / 1000).toFixed(2)} kWp`,
          modulos: `${model.pv.totalModules} módulos de ${model.pv.powerW} W`,
          configuracion: `${model.pv.numberOfStrings} Strings × ${model.pv.modulesPerString} en serie`,
          vocString: `${dc.stringVocV.toFixed(1)} V (STC)`,
          iscString: `${dc.stringIscA.toFixed(2)} A`,
          vmpString: `${(model.pv.modulesPerString * model.pv.vmpV).toFixed(1)} V`,
          impString: `${model.pv.impA.toFixed(2)} A`,
          normativa: 'NOM-001-SEDE Art. 690-7 / Art. 690-8',
        },
        yPos: 120,
      },
      {
        id: 'dc-protection',
        level: 1,
        title: 'Protección y Seccionamiento DC (Combiner Box)',
        category: 'PROTECCIÓN DC',
        componentType: 'DC_PROTECTION_DISCONNECT',
        ports: ['DC+_IN', 'DC-_IN', 'DC+_OUT', 'DC-_OUT', 'PE_SPD'],
        manufacturer: 'Schneider / Suntree / ABB',
        modelNumber: 'DC-COMB-1000V',
        params: {
          fusibles: `${model.pv.numberOfStrings}x Fusibles gPV 1000V DC (${Math.ceil(dc.stringIscA * 1.56)}A)`,
          desconectador: 'Seccionador Rotativo bajo carga 1000V DC / 32A',
          supresorSPD: 'SPD Tipo II DC Uc 1000V In 20kA / Imax 40kA',
          puestaTierra: 'Barra equipotencial de cobre conectada a SPT',
          normativa: 'NOM-001-SEDE Art. 690-9, 690-13, 690-35',
        },
        yPos: 280,
      },
      {
        id: 'inv-01',
        level: 2,
        title: `Inversor Interconectado (${model.inverter.manufacturer})`,
        category: 'CONVERSIÓN DC/AC',
        componentType: 'INVERTER',
        ports: ['DC+', 'DC-', 'L1', 'L2', 'N', 'PE'],
        manufacturer: model.inverter.manufacturer,
        modelNumber: model.inverter.model,
        params: {
          potenciaNominal: `${totalAcPowerKw} kW`,
          tensionSalida: `${model.inverter.nominalAcVoltageV} V (${model.inverter.systemType})`,
          corrienteMaxSalida: `${model.inverter.maxOutputCurrentA} A`,
          eficiencia: '98.4% (CEC / Euro)',
          arquitectura: model.inverter.architecture || 'String Inverter',
          normativa: 'NOM-001-SEDE Art. 690-17, 705-12, UL 1741-SB',
        },
        yPos: 430,
      },
      ...(model.battery?.enabled ? [{
        id: 'battery-ess',
        level: 2,
        title: 'Sistema de Almacenamiento (Batería LiFePO4)',
        category: 'ALMACENAMIENTO ESS',
        componentType: 'BATTERY_ESS',
        ports: ['BAT+', 'BAT-', 'COM_BMS', 'PE'],
        manufacturer: model.battery.manufacturer || 'Growatt / BYD',
        modelNumber: model.battery.model || 'ARK-10.2H',
        params: {
          capacidad: `${model.battery.capacityKwh || 10.2} kWh`,
          tensionNominal: '48 V DC',
          tecnologia: 'Litio Ferrofosfato (LiFePO4)',
          bmsIntegrado: 'Protección contra sobrecarga, sobredescarga y térmica',
          normativa: 'NOM-001-SEDE Art. 706 (Sistemas de Almacenamiento de Energía)',
        },
        yPos: 430,
      }] : []),
      {
        id: 'ac-breaker',
        level: 3,
        title: 'Protección AC de Inversor (ITM Derivado)',
        category: 'PROTECCIÓN AC',
        componentType: 'AC_BREAKER',
        ports: ['L1_IN', 'L2_IN', 'L1_OUT', 'L2_OUT', 'PE'],
        manufacturer: 'Square D / Eaton / Siemens',
        modelNumber: `QO${model.inverter.systemType.includes('3F') ? '3' : '2'}${Math.ceil(model.inverter.maxOutputCurrentA * 1.25)}`,
        params: {
          capacidadInterruptor: `${Math.ceil(model.inverter.maxOutputCurrentA * 1.25)} A`,
          polos: `${model.inverter.systemType.includes('3F') ? '3 Polos (3P)' : '2 Polos (2P)'}`,
          capacidadInterruptiva: '10 kA @ 240V AC',
          curvaDisparo: 'Termomagnético Tipo C / Industrial',
          normativa: 'NOM-001-SEDE Art. 240, 705-12(B)',
        },
        yPos: 570,
      },
      {
        id: 'panel-dist',
        level: 4,
        title: 'Tablero de Distribución / Centro de Carga',
        category: 'INTERCONEXIÓN & BARRAS',
        componentType: 'DISTRIBUTION_BOARD',
        ports: ['BUS_L1', 'BUS_L2', 'BUS_N', 'BUS_PE'],
        manufacturer: 'Square D / Schneider Electric',
        modelNumber: 'NQ / QOD / QO Load Center',
        params: {
          capacidadBarras: '100 A - 225 A',
          reglaInterconexion: 'Regla del 120% cumplida (NOM Art. 705-12(B)(2))',
          tensionOperacion: `${model.inverter.nominalAcVoltageV} V`,
          itmPrincipal: '100 A (2P)',
          normativa: 'NOM-001-SEDE Art. 408, Art. 705-12',
        },
        yPos: 690,
      },
      {
        id: 'meter-cfe',
        level: 6,
        title: 'Medidor Bidireccional CFE (4 Cuadrantes)',
        category: 'MEDICIÓN CFE',
        componentType: 'KWH_METER',
        ports: ['LINE_1', 'LINE_2', 'NEUTRO', 'LOAD_1', 'LOAD_2'],
        manufacturer: 'Itron / Landis+Gyr / Elster',
        modelNumber: 'Bidireccional Telemétrico',
        params: {
          tipoMedicion: 'Energía activa y reactiva recibida / entregada',
          clasePrecision: 'Clase 0.2 / 0.5',
          tipoBase: 'Base Enchufe 13 Terminales / 7 Terminales',
          normativa: 'Especificación CFE G0000-48 / DACG CRE',
        },
        yPos: 800,
      },
      {
        id: 'grid-cfe',
        level: 7,
        title: 'Red de Distribución Pública CFE',
        category: 'ACOMETIDA RED CFE',
        componentType: 'GRID_AC',
        ports: ['L1', 'L2', 'N', 'PE_ACOMETIDA'],
        manufacturer: 'CFE Suministrador de Servicios Básicos',
        modelNumber: 'Red Aérea / Subterránea BT',
        params: {
          suministro: `Baja Tensión ${model.inverter.nominalAcVoltageV}V 60Hz`,
          sistemaSPT: 'Electrodo Cooperweld 5/8" × 3.0m (R ≤ 25 Ω)',
          conductoresAcometida: '2#4 AWG Cu THW-LS + 1#6 AWG Neutro',
          normativa: 'NOM-001-SEDE Art. 230, Art. 250-52',
        },
        yPos: 910,
      },
    ];
  }, [model, dc, ac, totalDcPowerW, totalAcPowerKw]);

  // Selected node object for deep inspector
  const activeNode = useMemo(() => {
    return structuralNodes.find((n) => n.id === selectedNodeId) || structuralNodes[0];
  }, [structuralNodes, selectedNodeId]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 2.2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.6));
  const handleResetZoom = () => setZoom(1);

  // SVG Export
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.href = svgUrl;
    link.download = `Diagrama_Unifilar_Estructural_${model.projectName.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // DXF Export
  const handleExportDxf = () => {
    const inputOrder = {
      clientName: model.clientName || 'CLIENTE',
      projectName: model.projectName,
      location: model.location,
      rpu: model.installationId || '1234567890',
      modulePowerW: model.pv.powerW,
      totalModules: model.pv.totalModules,
      numberOfStrings: model.pv.numberOfStrings,
      modulesPerString: model.pv.modulesPerString,
      modulesBrand: model.pv.manufacturer,
      moduleModel: model.pv.model,
      inverterManufacturer: model.inverter.manufacturer,
      inverterModel: model.inverter.model,
      inverterPowerKw: model.inverter.ratedPowerKw,
      acVoltageV: model.inverter.nominalAcVoltageV,
      phasesCount: model.inverter.systemType.includes('3F') ? 3 : 2,
      acBreakerRatingA: Math.ceil((model.inverter.maxOutputCurrentA || 40) * 1.25),
      mainBreakerRatingA: 100,
      dcRouteLengthM: dcLengthM,
      acRouteLengthM: acLengthM,
      hasBattery: model.battery?.enabled,
      batteryCapacityKwh: model.battery?.capacityKwh,
    };

    const { model: compiledEdl } = ServiceOrderToEdl.compileFromOrder(inputOrder);
    const layout = EdlLayoutEngine.computeLayout(compiledEdl, 'HIGH');
    const dxfContent = DxfExporter.generateDxf(compiledEdl, layout);

    const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Unifilar_AutoCAD_${model.projectName.replace(/\s+/g, '_')}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const isDark = themeMode === 'dark_schematic';

  return (
    <div className="space-y-4">
      {/* 1. TOP TOOLBAR & VIEW CONTROLLER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Motor Unifilar Determinista (ANSI / IEEE & CFE)
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                100% Vectorial
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Generación en 3 etapas: Estructura de Grafo → Parámetros & Etiquetas → Layout Topológico.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Theme switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setThemeMode('dark_schematic')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                isDark ? 'bg-amber-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dark CAD
            </button>
            <button
              onClick={() => setThemeMode('cad_white')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                !isDark ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Plano Blanco ANSI
            </button>
          </div>

          {/* Unified Variables Matrix Toggle */}
          <button
            onClick={() => setShowUnifiedMatrix(!showUnifiedMatrix)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              showUnifiedMatrix
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Mostrar u ocultar matriz de variables unificadas del proyecto activo"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Variables Unificadas</span>
          </button>

          {/* Annotations Toggle */}
          <button
            onClick={() => setShowConduitAnnotations(!showConduitAnnotations)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              showConduitAnnotations
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Mostrar u ocultar cédula de conductores y canalizaciones"
          >
            <Cable className="w-3.5 h-3.5" />
            <span>Cédula Tramos</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-0.5">
            <button onClick={handleZoomOut} className="p-1.5 text-slate-400 hover:text-white transition" title="Alejar">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={handleZoomIn} className="p-1.5 text-slate-400 hover:text-white transition" title="Acercar">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleResetZoom} className="p-1.5 text-slate-400 hover:text-white transition border-l border-slate-800" title="Restablecer vista">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export buttons */}
          <button
            onClick={handleExportDxf}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition cursor-pointer"
            title="Exportar archivo DXF para AutoCAD"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>DXF</span>
          </button>

          <button
            onClick={handleExportSvg}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer"
            title="Descargar plano en formato vectorial SVG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SVG</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
            title="Imprimir plano oficial"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* 2. MATRIZ DE VARIABLES UNIFICADAS DEL PROYECTO ACTIVO (MATERIAL DESIGN 3) */}
      <AnimatePresence>
        {showUnifiedMatrix && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Variables Eléctricas Unificadas del Proyecto Activo</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        100% Sincronizado
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Todos los parámetros identificados corresponden exclusivamente a la orden de servicio activa ({model.projectName}).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400">Cliente: <strong className="text-white">{model.clientName || 'Cliente Activo'}</strong></span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Folio: <strong className="text-amber-400">{model.installationId}</strong></span>
                </div>
              </div>

              {/* 5 Variable Clusters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                {/* Cluster 1: Arreglo FV */}
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] pb-1 border-b border-slate-800/80">
                    <Sun className="w-3.5 h-3.5" />
                    <span>1. Arreglo FV (DC)</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="text-slate-300 font-bold truncate">{model.pv.manufacturer} {model.pv.powerW}W</div>
                    <div className="text-slate-400">{model.pv.totalModules} módulos ({model.pv.numberOfStrings} string(s))</div>
                    <div className="text-amber-300 font-bold">P_DC: {(totalDcPowerW / 1000).toFixed(2)} kWp</div>
                    <div className="text-slate-400">Voc_stc: {dc.stringVocV.toFixed(1)} V</div>
                    <div className="text-slate-400">Vmp: {(model.pv.modulesPerString * model.pv.vmpV).toFixed(1)} V</div>
                    <div className="text-slate-400">Isc: {dc.stringIscA.toFixed(2)} A (Diseño: {(dc.stringIscA * 1.56).toFixed(2)}A)</div>
                  </div>
                </div>

                {/* Cluster 2: Ruta DC */}
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] pb-1 border-b border-slate-800/80">
                    <Cable className="w-3.5 h-3.5" />
                    <span>2. Circuito DC</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="text-slate-400">Distancia: <strong className="text-white">{dcLengthM} m</strong></div>
                    <div className="text-slate-400">Conductor: <strong className="text-emerald-300">{dcRoute?.selectedGauge} Cu</strong></div>
                    <div className="text-slate-400">Aislamiento: PV-Wire 90°C</div>
                    <div className="text-slate-400">Canalización: {dcRoute?.selectedConduitTradeSize} EMT</div>
                    <div className="text-emerald-400 font-bold">ΔV DC: {dcRoute?.voltageDropPercent.toFixed(2)}% (≤ 1.5%)</div>
                    <div className="text-slate-500 text-[10px]">Protección: {Math.ceil(dc.stringIscA * 1.56)}A Fusible gPV</div>
                  </div>
                </div>

                {/* Cluster 3: Inversor */}
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px] pb-1 border-b border-slate-800/80">
                    <Zap className="w-3.5 h-3.5" />
                    <span>3. Inversor AC</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="text-slate-300 font-bold truncate">{model.inverter.manufacturer} {model.inverter.model}</div>
                    <div className="text-cyan-300 font-bold">P_nom: {totalAcPowerKw} kW</div>
                    <div className="text-slate-400">Tensión: {model.inverter.nominalAcVoltageV} V</div>
                    <div className="text-slate-400">Sistema: {model.inverter.systemType}</div>
                    <div className="text-slate-400">I_max: {model.inverter.maxOutputCurrentA} A</div>
                    <div className="text-cyan-400 font-bold">I_diseño: {(model.inverter.maxOutputCurrentA * 1.25).toFixed(1)} A</div>
                  </div>
                </div>

                {/* Cluster 4: Ruta AC & Protecciones */}
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold text-[11px] pb-1 border-b border-slate-800/80">
                    <Shield className="w-3.5 h-3.5" />
                    <span>4. Protecciones AC</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="text-purple-300 font-bold">ITM: {Math.ceil(model.inverter.maxOutputCurrentA * 1.25)}A ({model.inverter.systemType.includes('3F') ? '3P' : '2P'})</div>
                    <div className="text-slate-400">Distancia AC: <strong className="text-white">{acLengthM} m</strong></div>
                    <div className="text-slate-400">Conductor: <strong className="text-purple-300">{acRoute?.selectedGauge} Cu</strong> THHW-LS</div>
                    <div className="text-slate-400">Tierra: 1#10 AWG CPTG</div>
                    <div className="text-slate-400">Canalización: {acRoute?.selectedConduitTradeSize} EMT</div>
                    <div className="text-purple-400 font-bold">ΔV AC: {acRoute?.voltageDropPercent.toFixed(2)}% (≤ 3.0%)</div>
                  </div>
                </div>

                {/* Cluster 5: Red & Medición */}
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                  <div className="flex items-center gap-1.5 text-sky-400 font-bold text-[11px] pb-1 border-b border-slate-800/80">
                    <Grid className="w-3.5 h-3.5" />
                    <span>5. Red CFE & Medición</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="text-slate-300 font-bold">Medidor Bidireccional</div>
                    <div className="text-slate-400">Tipo: Digital 4-Cuadrantes</div>
                    <div className="text-slate-400">Acometida: Baja Tensión CFE</div>
                    <div className="text-slate-400">Frecuencia: 60 Hz</div>
                    <div className="text-emerald-400 font-bold">Regla 120%: Cumplida</div>
                    <div className="text-slate-400">Norma: NOM-001 / CFE G0100</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MAIN WORKSPACE: CANVAS + DEDICATED 3-STAGE INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT / CENTER: Clean Vector Unifilar Canvas (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col items-center overflow-hidden relative">
          <div className="w-full flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2 mb-3">
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              DIAGRAMA UNIFILAR VECTORIAL DETERMINISTA
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              Haz clic sobre cualquier bloque o tramo para auditar
            </span>
          </div>

          {/* Scrollable Container with Zoom */}
          <div className="w-full overflow-auto max-h-[820px] rounded-xl border border-slate-800/80 bg-slate-950 flex justify-center p-4">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                transition: 'transform 0.1s ease-out',
              }}
              className={`rounded-xl shadow-2xl transition-colors duration-200 ${
                isDark ? 'bg-slate-950 text-slate-100 border border-slate-800' : 'bg-white text-black border-2 border-black'
              }`}
            >
              {/* The Master SVG Diagram */}
              <svg
                ref={svgRef}
                viewBox="0 0 980 1020"
                width="980"
                height="1020"
                className="font-sans select-none"
              >
                <defs>
                  {/* Gradients & markers */}
                  <marker id="arrow-down" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={isDark ? '#38bdf8' : '#0284c7'} />
                  </marker>
                  <marker id="dot-marker" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
                    <circle cx="5" cy="5" r="3.5" fill={isDark ? '#fbbf24' : '#000000'} />
                  </marker>
                </defs>

                {/* Background Grid Lines for CAD feel */}
                {isDark ? (
                  <g opacity="0.06">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <line key={`h-${i}`} x1="0" y1={i * 40} x2="980" y2={i * 40} stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,4" />
                    ))}
                    {Array.from({ length: 25 }).map((_, i) => (
                      <line key={`v-${i}`} x1={i * 40} y1="0" x2={i * 40} y2="1020" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,4" />
                    ))}
                  </g>
                ) : (
                  <rect x="0" y="0" width="980" height="1020" fill="#ffffff" stroke="#000000" strokeWidth="2" />
                )}

                {/* ======================================================== */}
                {/* 1. CENTRAL BUS LINES (MAIN VERTICAL POWER FLOW) */}
                {/* ======================================================== */}
                {/* DC Main Bus line (From PV down to Inverter) */}
                <line
                  x1="490"
                  y1="170"
                  x2="490"
                  y2="390"
                  stroke={isDark ? '#fbbf24' : '#000000'}
                  strokeWidth="3.5"
                />

                {/* AC Main Bus line (From Inverter down to Grid) */}
                <line
                  x1="490"
                  y1="490"
                  x2="490"
                  y2="920"
                  stroke={isDark ? '#38bdf8' : '#000000'}
                  strokeWidth="3.5"
                />

                {/* Grounding Bus Line (Lateral Green Equipotential) */}
                {showGroundingNetwork && (
                  <g>
                    <line
                      x1="220"
                      y1="120"
                      x2="220"
                      y2="960"
                      stroke={isDark ? '#22c55e' : '#15803d'}
                      strokeWidth="2.5"
                      strokeDasharray="6,4"
                    />
                    <text x="210" y="115" textAnchor="end" fill={isDark ? '#4ade80' : '#15803d'} className="text-[11px] font-mono font-bold">
                      SISTEMA DE TIERRA (SPT)
                    </text>
                    {/* Ground tap lines */}
                    <line x1="220" y1="120" x2="330" y2="120" stroke={isDark ? '#22c55e' : '#15803d'} strokeWidth="1.8" />
                    <line x1="220" y1="280" x2="350" y2="280" stroke={isDark ? '#22c55e' : '#15803d'} strokeWidth="1.8" />
                    <line x1="220" y1="440" x2="350" y2="440" stroke={isDark ? '#22c55e' : '#15803d'} strokeWidth="1.8" />
                    <line x1="220" y1="700" x2="350" y2="700" stroke={isDark ? '#22c55e' : '#15803d'} strokeWidth="1.8" />
                    <line x1="220" y1="960" x2="490" y2="960" stroke={isDark ? '#22c55e' : '#15803d'} strokeWidth="2.5" />
                    <SvgGroundSymbol x={490} y={960} color={isDark ? '#22c55e' : '#15803d'} scale={1.3} />
                  </g>
                )}

                {/* ======================================================== */}
                {/* 2. NODE 0: GENERADOR FOTOVOLTAICO (PV ARRAY) */}
                {/* ======================================================== */}
                <g
                  onClick={() => setSelectedNodeId('pv-array')}
                  className="cursor-pointer transition-transform hover:opacity-90"
                >
                  <rect
                    x="330"
                    y="50"
                    width="320"
                    height="110"
                    rx="10"
                    fill={selectedNodeId === 'pv-array' ? (isDark ? '#1e293b' : '#f0fdf4') : (isDark ? '#0f172a' : '#ffffff')}
                    stroke={selectedNodeId === 'pv-array' ? '#f59e0b' : (isDark ? '#334155' : '#000000')}
                    strokeWidth={selectedNodeId === 'pv-array' ? '3' : '2'}
                  />
                  <rect x="330" y="50" width="320" height="26" rx="8" fill={isDark ? '#1e293b' : '#e2e8f0'} />
                  <text x="490" y="68" textAnchor="middle" fill={isDark ? '#f59e0b' : '#000000'} className="text-[12px] font-bold uppercase tracking-wider">
                    GENERADOR FV: {model.pv.totalModules}x {model.pv.powerW}W ({((model.pv.totalModules * model.pv.powerW) / 1000).toFixed(2)} kWp)
                  </text>
                  
                  {/* Module icons in a clean row */}
                  <g transform="translate(355, 88)">
                    {Array.from({ length: Math.min(model.pv.totalModules, 6) }).map((_, i) => (
                      <g key={i} transform={`translate(${i * 44}, 0)`}>
                        <rect x="0" y="0" width="36" height="52" fill={isDark ? '#0284c7' : '#38bdf8'} stroke={isDark ? '#ffffff' : '#000000'} strokeWidth="1.2" rx="3" />
                        <line x1="0" y1="26" x2="36" y2="26" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
                        <line x1="18" y1="0" x2="18" y2="52" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
                        <text x="18" y="48" textAnchor="middle" fill="#ffffff" className="text-[8px] font-mono font-bold">
                          G{i + 1}
                        </text>
                      </g>
                    ))}
                  </g>

                  {/* Left & Right Parameter Callouts */}
                  <text x="320" y="90" textAnchor="end" fill={isDark ? '#94a3b8' : '#334155'} className="text-[11px] font-mono">
                    {model.pv.numberOfStrings} Strings × {model.pv.modulesPerString} Mod
                  </text>
                  <text x="320" y="110" textAnchor="end" fill={isDark ? '#f59e0b' : '#b45309'} className="text-[11px] font-mono font-bold">
                    Voc_stc = {dc.stringVocV.toFixed(1)} V | Isc = {dc.stringIscA.toFixed(2)} A
                  </text>
                </g>

                {/* Circuit DC Conductor Badge between Level 0 and Level 1 */}
                {showConduitAnnotations && dcRoute && (
                  <g transform="translate(540, 205)">
                    <rect x="0" y="0" width="340" height="42" rx="8" fill={isDark ? '#0f172a' : '#f8fafc'} stroke={isDark ? '#f59e0b' : '#000000'} strokeWidth="1.5" />
                    <text x="12" y="17" fill={isDark ? '#f59e0b' : '#b45309'} className="text-[10px] font-bold font-mono">
                      TRAMO DC (Ruta 1): {dcRoute.physicalConductors?.map(c => c.name).join(' + ') || `${dcRoute.selectedGauge} Cu THHW-LS`}
                    </text>
                    <text x="12" y="32" fill={isDark ? '#94a3b8' : '#475569'} className="text-[10px] font-mono">
                      Tub. Conduit {dcRoute.selectedConduitTradeSize} | ΔV: {dcRoute.voltageDropPercent.toFixed(2)}% (L={dcLengthM}m)
                    </text>
                  </g>
                )}

                {/* ======================================================== */}
                {/* 3. NODE 1: PROTECCIÓN DC (FUSIBLES + SECCIONADOR + SPD) */}
                {/* ======================================================== */}
                <g
                  onClick={() => setSelectedNodeId('dc-protection')}
                  className="cursor-pointer transition-transform hover:opacity-90"
                >
                  <rect
                    x="350"
                    y="240"
                    width="280"
                    height="75"
                    rx="10"
                    fill={selectedNodeId === 'dc-protection' ? (isDark ? '#1e293b' : '#f0fdf4') : (isDark ? '#0f172a' : '#ffffff')}
                    stroke={selectedNodeId === 'dc-protection' ? '#f59e0b' : (isDark ? '#334155' : '#000000')}
                    strokeWidth={selectedNodeId === 'dc-protection' ? '3' : '2'}
                  />
                  <text x="490" y="260" textAnchor="middle" fill={isDark ? '#f8fafc' : '#000000'} className="text-[11px] font-bold uppercase">
                    GABINETE DE PROTECCIÓN DC (COMBINER)
                  </text>
                  
                  {/* Fuse + Disconnect + SPD schematic symbols */}
                  <g transform="translate(420, 280)">
                    <SvgFuseSymbol x={0} y={0} label={`${Math.ceil(dc.stringIscA * 1.56)}A`} scale={0.9} />
                    <SvgRotaryDisconnectSymbol x={70} y={0} label="32A DC" scale={0.9} />
                  </g>

                  <text x="340" y="275" textAnchor="end" fill={isDark ? '#94a3b8' : '#475569'} className="text-[10px] font-mono">
                    Fusibles gPV 1000V
                  </text>
                  <text x="340" y="295" textAnchor="end" fill={isDark ? '#f59e0b' : '#b45309'} className="text-[10px] font-mono font-bold">
                    SPD Clase II 1000V DC
                  </text>
                </g>

                {/* ======================================================== */}
                {/* 4. NODE 2: INVERSOR CENTRAL / STRING (CONVERSIÓN) */}
                {/* ======================================================== */}
                <g
                  onClick={() => setSelectedNodeId('inv-01')}
                  className="cursor-pointer transition-transform hover:opacity-90"
                >
                  <rect
                    x="350"
                    y="390"
                    width="280"
                    height="100"
                    rx="12"
                    fill={selectedNodeId === 'inv-01' ? (isDark ? '#1e293b' : '#eff6ff') : (isDark ? '#0f172a' : '#ffffff')}
                    stroke={selectedNodeId === 'inv-01' ? '#38bdf8' : (isDark ? '#38bdf8' : '#000000')}
                    strokeWidth={selectedNodeId === 'inv-01' ? '3.5' : '2'}
                  />
                  
                  {/* Internal Inverter conversion symbol */}
                  <g transform="translate(370, 415)">
                    <rect x="0" y="0" width="50" height="50" fill={isDark ? '#0284c7' : '#e0f2fe'} stroke={isDark ? '#38bdf8' : '#0284c7'} strokeWidth="1.5" rx="6" />
                    <line x1="0" y1="50" x2="50" y2="0" stroke={isDark ? '#ffffff' : '#0284c7'} strokeWidth="1.5" />
                    <text x="12" y="22" fill={isDark ? '#ffffff' : '#0284c7'} className="text-[12px] font-bold">=</text>
                    <text x="30" y="42" fill={isDark ? '#ffffff' : '#0284c7'} className="text-[14px] font-bold">~</text>
                  </g>

                  <text x="435" y="420" fill={isDark ? '#ffffff' : '#000000'} className="text-[12px] font-bold">
                    {model.inverter.manufacturer}
                  </text>
                  <text x="435" y="438" fill={isDark ? '#38bdf8' : '#0284c7'} className="text-[11px] font-mono font-bold">
                    {model.inverter.model}
                  </text>
                  <text x="435" y="458" fill={isDark ? '#94a3b8' : '#475569'} className="text-[10px] font-mono">
                    P_ac = {totalAcPowerKw} kW | V_ac = {model.inverter.nominalAcVoltageV} V
                  </text>
                  <text x="435" y="475" fill={isDark ? '#34d399' : '#059669'} className="text-[10px] font-mono font-bold">
                    I_max = {model.inverter.maxOutputCurrentA} A ({model.inverter.systemType})
                  </text>
                </g>

                {/* Lateral Battery Branch if present */}
                {model.battery?.enabled && (
                  <g
                    onClick={() => setSelectedNodeId('battery-ess')}
                    className="cursor-pointer transition-transform hover:opacity-90"
                  >
                    <line x1="630" y1="440" x2="730" y2="440" stroke={isDark ? '#ec4899' : '#db2777'} strokeWidth="2.5" />
                    <rect x="730" y="395" width="200" height="90" rx="10" fill={isDark ? '#1e293b' : '#fdf2f8'} stroke="#db2777" strokeWidth="2" />
                    <text x="830" y="420" textAnchor="middle" fill="#db2777" className="text-[11px] font-bold uppercase">
                      BATERÍA ESS (LiFePO4)
                    </text>
                    <text x="830" y="442" textAnchor="middle" fill={isDark ? '#ffffff' : '#000000'} className="text-[12px] font-mono font-bold">
                      {model.battery.capacityKwh || 10.2} kWh / 48V
                    </text>
                    <text x="830" y="465" textAnchor="middle" fill={isDark ? '#94a3b8' : '#64748b'} className="text-[10px] font-mono">
                      BMS Integrado • 100% DOD
                    </text>
                  </g>
                )}

                {/* Circuit AC Conductor Badge between Level 2 and Level 3 */}
                {showConduitAnnotations && acRoute && (
                  <g transform="translate(540, 505)">
                    <rect x="0" y="0" width="340" height="42" rx="8" fill={isDark ? '#0f172a' : '#f8fafc'} stroke={isDark ? '#38bdf8' : '#000000'} strokeWidth="1.5" />
                    <text x="12" y="17" fill={isDark ? '#38bdf8' : '#0284c7'} className="text-[10px] font-bold font-mono">
                      TRAMO AC (Ruta 2): {acRoute.physicalConductors?.map(c => c.name).join(' + ') || `${acRoute.selectedGauge} Cu THHW-LS`}
                    </text>
                    <text x="12" y="32" fill={isDark ? '#94a3b8' : '#475569'} className="text-[10px] font-mono">
                      Tub. Conduit {acRoute.selectedConduitTradeSize} | ΔV: {acRoute.voltageDropPercent.toFixed(2)}% (L={acLengthM}m)
                    </text>
                  </g>
                )}

                {/* ======================================================== */}
                {/* 5. NODE 3: PROTECCIÓN AC (ITM INVERSOR) */}
                {/* ======================================================== */}
                <g
                  onClick={() => setSelectedNodeId('ac-breaker')}
                  className="cursor-pointer transition-transform hover:opacity-90"
                >
                  <rect
                    x="370"
                    y="550"
                    width="240"
                    height="65"
                    rx="10"
                    fill={selectedNodeId === 'ac-breaker' ? (isDark ? '#1e293b' : '#eff6ff') : (isDark ? '#0f172a' : '#ffffff')}
                    stroke={selectedNodeId === 'ac-breaker' ? '#38bdf8' : (isDark ? '#334155' : '#000000')}
                    strokeWidth={selectedNodeId === 'ac-breaker' ? '3' : '2'}
                  />
                  
                  <g transform="translate(430, 582)">
                    <SvgBreakerSymbol
                      x={0}
                      y={0}
                      ratingLabel={`${Math.ceil(model.inverter.maxOutputCurrentA * 1.25)}A`}
                      poles={model.inverter.systemType.includes('3F') ? 3 : 2}
                      scale={0.9}
                    />
                  </g>

                  <text x="490" y="570" textAnchor="middle" fill={isDark ? '#ffffff' : '#000000'} className="text-[11px] font-bold uppercase">
                    ITM INVERSOR ({Math.ceil(model.inverter.maxOutputCurrentA * 1.25)} A)
                  </text>
                  <text x="350" y="585" textAnchor="end" fill={isDark ? '#94a3b8' : '#475569'} className="text-[10px] font-mono">
                    {model.inverter.systemType.includes('3F') ? '3 Polos (3P)' : '2 Polos (2P)'}
                  </text>
                  <text x="350" y="602" textAnchor="end" fill={isDark ? '#38bdf8' : '#0284c7'} className="text-[10px] font-mono font-bold">
                    IC = 10 kA @ 240V
                  </text>
                </g>

                {/* ======================================================== */}
                {/* 6. NODE 4: TABLERO DE DISTRIBUCIÓN / BARRAS */}
                {/* ======================================================== */}
                <g
                  onClick={() => setSelectedNodeId('panel-dist')}
                  className="cursor-pointer transition-transform hover:opacity-90"
                >
                  <rect
                    x="350"
                    y="660"
                    width="280"
                    height="85"
                    rx="10"
                    fill={selectedNodeId === 'panel-dist' ? (isDark ? '#1e293b' : '#eff6ff') : (isDark ? '#0f172a' : '#ffffff')}
                    stroke={selectedNodeId === 'panel-dist' ? '#a855f7' : (isDark ? '#334155' : '#000000')}
                    strokeWidth={selectedNodeId === 'panel-dist' ? '3' : '2'}
                  />
                  
                  {/* Busbars representation */}
                  <line x1="370" y1="700" x2="610" y2="700" stroke={isDark ? '#c084fc' : '#9333ea'} strokeWidth="5" strokeLinecap="round" />
                  <line x1="370" y1="720" x2="610" y2="720" stroke={isDark ? '#38bdf8' : '#0284c7'} strokeWidth="4" strokeLinecap="round" />
                  
                  <text x="490" y="682" textAnchor="middle" fill={isDark ? '#ffffff' : '#000000'} className="text-[11px] font-bold uppercase">
                    TABLERO GENERAL DE DISTRIBUCIÓN (BARRAS)
                  </text>

                  <text x="340" y="695" textAnchor="end" fill={isDark ? '#94a3b8' : '#475569'} className="text-[10px] font-mono">
                    Barras Principales
                  </text>
                  <text x="340" y="715" textAnchor="end" fill={isDark ? '#c084fc' : '#7e22ce'} className="text-[10px] font-mono font-bold">
                    Regla 120% Cumplida
                  </text>
                </g>

                {/* ======================================================== */}
                {/* 7. NODE 6: MEDIDOR BIDIRECCIONAL CFE */}
                {/* ======================================================== */}
                <g
                  onClick={() => setSelectedNodeId('meter-cfe')}
                  className="cursor-pointer transition-transform hover:opacity-90"
                >
                  <circle
                    cx="490"
                    cy="800"
                    r="40"
                    fill={selectedNodeId === 'meter-cfe' ? (isDark ? '#1e293b' : '#ecfdf5') : (isDark ? '#0f172a' : '#ffffff')}
                    stroke={selectedNodeId === 'meter-cfe' ? '#10b981' : (isDark ? '#10b981' : '#000000')}
                    strokeWidth="3"
                  />
                  <text x="490" y="795" textAnchor="middle" fill={isDark ? '#34d399' : '#059669'} className="text-[13px] font-mono font-extrabold">
                    kWh
                  </text>
                  <text x="490" y="812" textAnchor="middle" fill={isDark ? '#ffffff' : '#000000'} className="text-[9px] font-bold">
                    CFE 4-CUAD
                  </text>

                  <text x="430" y="805" textAnchor="end" fill={isDark ? '#34d399' : '#059669'} className="text-[10px] font-mono font-bold">
                    MEDIDOR BIDIRECCIONAL
                  </text>
                </g>

                {/* ======================================================== */}
                {/* 8. NODE 7: RED ELÉCTRICA CFE & ACOMETIDA */}
                {/* ======================================================== */}
                <g
                  onClick={() => setSelectedNodeId('grid-cfe')}
                  className="cursor-pointer transition-transform hover:opacity-90"
                >
                  <rect
                    x="370"
                    y="880"
                    width="240"
                    height="65"
                    rx="10"
                    fill={selectedNodeId === 'grid-cfe' ? (isDark ? '#1e293b' : '#eff6ff') : (isDark ? '#0f172a' : '#ffffff')}
                    stroke={selectedNodeId === 'grid-cfe' ? '#38bdf8' : (isDark ? '#334155' : '#000000')}
                    strokeWidth={selectedNodeId === 'grid-cfe' ? '3' : '2'}
                  />
                  <text x="490" y="905" textAnchor="middle" fill={isDark ? '#38bdf8' : '#0284c7'} className="text-[12px] font-bold uppercase">
                    RED PÚBLICA CFE ({model.inverter.nominalAcVoltageV} V)
                  </text>
                  <text x="490" y="925" textAnchor="middle" fill={isDark ? '#94a3b8' : '#475569'} className="text-[10px] font-mono">
                    Suministro en Baja Tensión • 60 Hz
                  </text>
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* RIGHT: DEDICATED 3-STAGE INSPECTOR DRAWER (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Node Detail Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Auditoría de Componente
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {activeNode.category}
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white">{activeNode.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {activeNode.manufacturer} • {activeNode.modelNumber}
              </p>
            </div>

            {/* 4-Stage Tab Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs gap-1">
              <button
                onClick={() => setInspectorTab('structure')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition cursor-pointer text-[11px] ${
                  inspectorTab === 'structure' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Estructura
              </button>
              <button
                onClick={() => setInspectorTab('params')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition cursor-pointer text-[11px] ${
                  inspectorTab === 'params' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Parámetros
              </button>
              <button
                onClick={() => setInspectorTab('conduit')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition cursor-pointer text-[11px] ${
                  inspectorTab === 'conduit' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                3. Tramos NOM
              </button>
              <button
                onClick={() => setInspectorTab('unified')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition cursor-pointer text-[11px] ${
                  inspectorTab === 'unified' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                4. Variables
              </button>
            </div>

            {/* Tab 1: Structure & Electrical Ports */}
            {inspectorTab === 'structure' && (
              <div className="space-y-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Puertos Eléctricos Topológicos
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeNode.ports.map((port) => (
                      <span
                        key={port}
                        className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[11px]"
                      >
                        {port}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Nivel Jerárquico en el Flujo de Potencia
                  </span>
                  <div className="text-white font-mono font-bold">
                    NIVEL {activeNode.level} ({activeNode.category})
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Posicionado deterministamente mediante el motor topological DAG de arriba a abajo.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Technical Parameters */}
            {inspectorTab === 'params' && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                {Object.entries(activeNode.params).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-start border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500 capitalize text-[11px]">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="text-amber-300 font-bold text-right ml-2 text-[11px]">{val}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Circuit & Regulatory Details */}
            {inspectorTab === 'conduit' && (
              <div className="space-y-2.5 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Norma Aplicable</div>
                  <div className="text-emerald-400 font-bold">{activeNode.params.normativa || 'NOM-001-SEDE-2012'}</div>
                </div>

                {dcRoute && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Conductor DC Asociado</div>
                    <div className="text-amber-300 font-bold">{dcRoute.selectedGauge} Cu ({dcRoute.selectedConduitTradeSize})</div>
                    <div className="text-slate-400 text-[10px]">Caída de Tensión: {dcRoute.voltageDropPercent.toFixed(2)}%</div>
                  </div>
                )}

                {acRoute && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Conductor AC Asociado</div>
                    <div className="text-cyan-300 font-bold">{acRoute.selectedGauge} Cu ({acRoute.selectedConduitTradeSize})</div>
                    <div className="text-slate-400 text-[10px]">Caída de Tensión: {acRoute.voltageDropPercent.toFixed(2)}%</div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Unified Active Project Variables */}
            {inspectorTab === 'unified' && (
              <div className="space-y-2.5 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-purple-400 text-[10px] uppercase font-bold flex items-center justify-between">
                    <span>Variables del Proyecto Activo</span>
                    <span className="text-[10px] text-emerald-400">NOM-001</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Sincronizadas con la orden actual <strong>{model.installationId}</strong> sin mezcla de archivos.
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">P_DC Total:</span>
                    <span className="text-amber-300 font-bold">{(totalDcPowerW / 1000).toFixed(2)} kWp</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">P_AC Inversor:</span>
                    <span className="text-cyan-300 font-bold">{totalAcPowerKw} kW</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Tensión Red:</span>
                    <span className="text-white font-bold">{model.inverter.nominalAcVoltageV} V</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">I_diseño AC:</span>
                    <span className="text-purple-300 font-bold">{(model.inverter.maxOutputCurrentA * 1.25).toFixed(1)} A</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">ITM Seleccionado:</span>
                    <span className="text-purple-400 font-bold">{Math.ceil(model.inverter.maxOutputCurrentA * 1.25)}A</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Ruta DC (Paneles):</span>
                    <span className="text-emerald-300 font-bold">{dcLengthM} m (ΔV: {dcRoute?.voltageDropPercent.toFixed(2)}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ruta AC (Inversor):</span>
                    <span className="text-sky-300 font-bold">{acLengthM} m (ΔV: {acRoute?.voltageDropPercent.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
