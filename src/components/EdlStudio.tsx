import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Code,
  Layers,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCode,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Sliders,
  Play,
  Share2,
  FileText,
  Boxes,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Check,
  RefreshCw,
} from 'lucide-react';
import { ElectricalModel, LayoutGraph, DetailLevel, ValidationReport } from '../engine/edl/edlTypes';
import { EdlParser } from '../engine/edl/edlParser';
import { EdlValidator } from '../engine/edl/edlValidator';
import { EdlLayoutEngine } from '../engine/edl/edlLayoutEngine';
import { ServiceOrderToEdl, ServiceOrderInput } from '../engine/edl/serviceOrderToEdl';
import { DxfExporter } from '../engine/edl/dxfExporter';
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

interface EdlStudioProps {
  initialServiceOrder?: ServiceOrderInput;
}

export const EdlStudio: React.FC<EdlStudioProps> = ({ initialServiceOrder }) => {
  // Tabs: 'blueprint' | 'edl_editor' | 'semantic_input' | 'validation_graph'
  const [activeTab, setActiveTab] = useState<'blueprint' | 'edl_editor' | 'semantic_input' | 'validation_graph'>('blueprint');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('HIGH');
  const [zoom, setZoom] = useState<number>(1);

  // Raw EDL Code & Parsed Electrical Model State
  const [edlCode, setEdlCode] = useState<string>('');
  const [model, setModel] = useState<ElectricalModel | null>(null);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [layoutGraph, setLayoutGraph] = useState<LayoutGraph | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  // Semantic Input Form State
  const [orderInput, setOrderInput] = useState<ServiceOrderInput>(
    initialServiceOrder || {
      clientName: 'ABARROTES CASCA',
      projectName: 'Sistema Fotovoltaico Comercial 11.4 kWp - Abarrotes Casca',
      location: 'A RODRIGUEZ LEYVA MZ1 LT5 AMPLIACION SANTO TOMAS ACOZAC, C.P. 56565, EDO. MEX.',
      rpu: '148231100137',
      modulePowerW: 650,
      totalModules: 18,
      numberOfStrings: 2,
      modulesPerString: 9,
      modulesBrand: 'LONGI',
      moduleModel: 'Hi-MO X6 Explorer LR7-72HVHF 650M',
      inverterManufacturer: 'Growatt',
      inverterModel: 'MIN 11400TL-XH-US',
      inverterPowerKw: 11.4,
      acVoltageV: 220,
      phasesCount: 2,
      acBreakerRatingA: 60,
      mainBreakerRatingA: 100,
      dcRouteLengthM: 25,
      acRouteLengthM: 3,
    }
  );

  const svgRef = useRef<SVGSVGElement>(null);

  // Initial Compile on mount
  useEffect(() => {
    compileFromSemanticInput(orderInput);
  }, []);

  // Compile from Semantic Form
  const compileFromSemanticInput = (input: ServiceOrderInput) => {
    try {
      setCompileError(null);
      const { model: compiledModel, edlCode: code } = ServiceOrderToEdl.compileFromOrder(input);
      setEdlCode(code);
      setModel(compiledModel);

      // Validate
      const valReport = EdlValidator.validate(compiledModel);
      setValidation(valReport);

      // Layout
      const layout = EdlLayoutEngine.computeLayout(compiledModel, detailLevel);
      setLayoutGraph(layout);
    } catch (err: any) {
      setCompileError(err?.message || 'Error al compilar orden de servicio');
    }
  };

  // Compile from Raw EDL text
  const compileFromEdlCode = (codeToCompile: string) => {
    try {
      setCompileError(null);
      const parsedModel = EdlParser.parse(codeToCompile);
      setModel(parsedModel);

      // Validate
      const valReport = EdlValidator.validate(parsedModel);
      setValidation(valReport);

      // Layout
      const layout = EdlLayoutEngine.computeLayout(parsedModel, detailLevel);
      setLayoutGraph(layout);
    } catch (err: any) {
      setCompileError(err?.message || 'Error de sintaxis en el código EDL');
    }
  };

  // Handle Detail Level Switch
  const handleDetailLevelChange = (lvl: DetailLevel) => {
    setDetailLevel(lvl);
    if (model) {
      const layout = EdlLayoutEngine.computeLayout(model, lvl);
      setLayoutGraph(layout);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 2.2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.5));
  const handleResetZoom = () => setZoom(1);

  // Export SVG
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `Diagrama_Unifilar_Compilado_${(model?.systemId || 'PV').replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Export DXF
  const handleExportDxf = () => {
    if (!model || !layoutGraph) return;
    const dxfContent = DxfExporter.generateDxf(model, layoutGraph);
    const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Diagrama_Unifilar_AutoCAD_${(model?.systemId || 'PV').replace(/\s+/g, '_')}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export EDL
  const handleExportEdl = () => {
    const blob = new Blob([edlCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(model?.systemId || 'SISTEMA_FV')}.edl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Synchronize exclusively with the active project service order
  const syncWithActiveProject = () => {
    if (initialServiceOrder) {
      setOrderInput(initialServiceOrder);
      compileFromSemanticInput(initialServiceOrder);
    }
  };

  return (
    <div className="space-y-4">
      {/* Studio Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Compilador de Instalaciones Eléctricas (EDL Engine)
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                Determinista NOM-001 / IEEE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Transformación semántica: Orden de Servicio → EDL DSL → Grafo Eléctrico → Layout CAD ANSI.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('blueprint')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'blueprint'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Plano CAD ANSI</span>
          </button>

          <button
            onClick={() => setActiveTab('edl_editor')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'edl_editor'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Editor EDL</span>
          </button>

          <button
            onClick={() => setActiveTab('semantic_input')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'semantic_input'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Orden de Servicio</span>
          </button>

          <button
            onClick={() => setActiveTab('validation_graph')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'validation_graph'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Auditoría & Grafo</span>
            {validation && validation.warningsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[9px] rounded-full bg-amber-400 text-slate-950 font-black">
                {validation.warningsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Compile Error Alert if any */}
      {compileError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{compileError}</span>
        </div>
      )}

      {/* ========================================================
          TAB 1: BLUEPRINT VIEWPORT & CAD CONTROLS
          ======================================================== */}
      {activeTab === 'blueprint' && (
        <div className="space-y-3">
          {/* Top Blueprint Control Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Nivel de Detalle:</span>
              {(['LOW', 'MEDIUM', 'HIGH'] as DetailLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => handleDetailLevelChange(lvl)}
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold transition cursor-pointer ${
                    detailLevel === lvl
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Active Project synchronization */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={syncWithActiveProject}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold border border-amber-500/40 transition flex items-center gap-1"
                title="Sincronizar DSL con los datos actuales del proyecto activo"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sincronizar con Proyecto Activo</span>
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                <button onClick={handleZoomOut} className="p-1 text-slate-400 hover:text-white" title="Alejar">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 text-[10px] font-mono text-slate-300">{Math.round(zoom * 100)}%</span>
                <button onClick={handleZoomIn} className="p-1 text-slate-400 hover:text-white" title="Acercar">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleResetZoom} className="p-1 text-slate-400 hover:text-white border-l border-slate-700">
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={handleExportDxf}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition cursor-pointer shadow-md shadow-amber-500/20"
                title="Exportar archivo DXF para AutoCAD / BricsCAD"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>AutoCAD DXF</span>
              </button>

              <button
                onClick={handleExportSvg}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition cursor-pointer"
                title="Exportar archivo vectorial SVG"
              >
                <Download className="w-3.5 h-3.5" />
                <span>SVG</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition cursor-pointer"
                title="Imprimir plano unifilar"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          {/* Canvas Blueprint Container */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 md:p-6 overflow-auto shadow-2xl flex justify-center">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="bg-white rounded-lg shadow-2xl border-4 border-slate-900 w-[1240px] h-[820px] relative overflow-hidden flex-shrink-0 select-none"
            >
              <svg
                ref={svgRef}
                viewBox="0 0 1240 820"
                width="1240"
                height="820"
                className="w-full h-full font-sans"
              >
                {/* Outer Drawing Border */}
                <rect x="15" y="15" width="1210" height="790" fill="#ffffff" stroke="#000000" strokeWidth="2.5" />
                <rect x="20" y="20" width="1200" height="780" fill="#ffffff" stroke="#000000" strokeWidth="1" />

                {/* ================= LEFT COLUMN ================= */}
                <line x1="280" y1="20" x2="280" y2="800" stroke="#000000" strokeWidth="1.8" />

                {/* Header: DIAGRAMA UNIFILAR */}
                <rect x="25" y="25" width="250" height="42" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />
                <text x="150" y="44" textAnchor="middle" className="text-[14px] font-extrabold fill-black tracking-widest">
                  DIAGRAMA
                </text>
                <text x="150" y="58" textAnchor="middle" className="text-[14px] font-extrabold fill-black tracking-widest">
                  UNIFILAR
                </text>

                {/* Lista de Materiales */}
                <rect x="25" y="72" width="250" height="175" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                <text x="150" y="90" textAnchor="middle" className="text-[12px] font-bold fill-black">
                  Lista de materiales
                </text>
                <line x1="25" y1="96" x2="275" y2="96" stroke="#000000" strokeWidth="1" />
                <g className="text-[7.5px] font-sans fill-black leading-tight">
                  <text x="32" y="110" fontWeight="bold">TUBERÍA CONDUIT PARED GRUESA (PG)</text>
                  <text x="32" y="125" fontWeight="bold">INTERRUPTORES TERMOMAGNÉTICOS</text>
                  <text x="32" y="135" className="fill-slate-700">INDICADOS EN DIAGRAMA UNIFILAR</text>
                  <text x="32" y="150" fontWeight="bold">MEDIOS DE DESCONEXIÓN CON</text>
                  <text x="32" y="160" className="fill-slate-700">PROTECCIÓN DE SOBRECORRIENTE</text>
                  <text x="32" y="175" fontWeight="bold">CONDUCTORES THHW Y DESNUDOS DE</text>
                  <text x="32" y="185" className="fill-slate-700">SPT INDICADOS EN DU (NOM ART. 310/690)</text>
                  <text x="32" y="200" fontWeight="bold">VARILLA COOPERWELD 5/8" × 3.0M</text>
                  <text x="32" y="215" fontWeight="bold">CAJAS Y ENVOLVENTES METÁLICAS NEMA 3R</text>
                </g>

                {/* Simbología */}
                <rect x="25" y="252" width="250" height="235" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                <text x="150" y="270" textAnchor="middle" className="text-[12px] font-bold fill-black">
                  Simbología
                </text>
                <line x1="25" y1="276" x2="275" y2="276" stroke="#000000" strokeWidth="1" />

                <SvgGroundSymbol x={52} y={288} scale={0.8} />
                <text x="85" y="296" className="text-[8.5px] fill-black font-sans">Puesta a tierra (SPT)</text>

                <g transform="translate(52, 324) scale(0.65)">
                  <rect x="-14" y="-12" width="28" height="24" fill="#ffffff" stroke="#000000" strokeWidth="1.5" strokeDasharray="3 2" />
                  <line x1="-18" y1="0" x2="-8" y2="0" stroke="#000000" strokeWidth="1.8" />
                  <circle cx="-6" cy="0" r="2" fill="#000000" />
                  <line x1="-6" y1="0" x2="6" y2="-5" stroke="#000000" strokeWidth="1.8" />
                  <path d="M 6 -5 Q 9 -8 12 -5" fill="none" stroke="#000000" strokeWidth="1.5" />
                  <circle cx="12" cy="0" r="2" fill="#000000" />
                  <line x1="12" y1="0" x2="18" y2="0" stroke="#000000" strokeWidth="1.8" />
                </g>
                <text x="85" y="326" className="text-[8.5px] fill-black font-sans">Interruptor termomagnético</text>

                <SvgFuseSymbol x={52} y={352} scale={0.65} />
                <text x="85" y="355" className="text-[8.5px] fill-black font-sans">Fusibles gPV</text>

                <g transform="translate(52, 380) scale(0.6)">
                  <rect x="-18" y="-14" width="36" height="28" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />
                  <text x="0" y="3" textAnchor="middle" className="text-[10px] font-mono font-bold">kWh</text>
                </g>
                <text x="85" y="380" className="text-[8.5px] fill-black font-sans">Medidor Wattorímetro</text>

                <g transform="translate(52, 442) scale(0.45)">
                  <rect x="-24" y="-24" width="48" height="48" fill="#ffffff" stroke="#000000" strokeWidth="2" />
                  <line x1="-24" y1="24" x2="24" y2="-24" stroke="#000000" strokeWidth="1.8" />
                  <line x1="-14" y1="-10" x2="-4" y2="-10" stroke="#000000" strokeWidth="2" />
                  <path d="M 4 10 Q 8 4 12 10 T 20 10" fill="none" stroke="#000000" strokeWidth="2" />
                </g>
                <text x="85" y="440" className="text-[8.5px] fill-black font-sans">Inversor de corriente</text>

                <g transform="translate(52, 470) scale(0.55)">
                  <rect x="-14" y="-14" width="28" height="28" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />
                  <circle cx="0" cy="0" r="9" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />
                  <circle cx="0" cy="0" r="2.5" fill="#000000" />
                </g>
                <text x="85" y="468" className="text-[8.5px] fill-black font-sans">Desconectador rotativo</text>

                {/* Title Block */}
                <rect x="25" y="492" width="250" height="300" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />
                <g className="text-black font-sans">
                  <text x="32" y="508" className="text-[8px] font-bold fill-slate-600">PROYECTO:</text>
                  <text x="32" y="520" className="text-[9px] font-extrabold fill-black">
                    {(model?.metadata.clientName || model?.systemName || 'ABARROTES CASCA').slice(0, 32)}
                  </text>

                  <line x1="25" y1="538" x2="275" y2="538" stroke="#000000" strokeWidth="1" />

                  <text x="32" y="550" className="text-[8px] font-bold fill-slate-600">DOMICILIO / UBICACIÓN:</text>
                  <text x="32" y="562" className="text-[8px] font-medium fill-black">
                    {(model?.metadata.projectAddress || 'LOCAL').slice(0, 36)}
                  </text>
                  <text x="32" y="573" className="text-[8px] font-medium fill-black">
                    {(model?.metadata.projectAddress || '').slice(36, 72)}
                  </text>

                  <text x="32" y="598" className="text-[8px] font-bold fill-slate-600">RPU / SERVICIO CFE:</text>
                  <text x="32" y="609" className="text-[9px] font-mono font-bold fill-black">
                    {model?.metadata.rpu || '148231100137'}
                  </text>

                  <line x1="25" y1="616" x2="275" y2="616" stroke="#000000" strokeWidth="1" />

                  <text x="32" y="628" className="text-[8px] font-bold fill-slate-600">LENGUAJE EDL:</text>
                  <text x="32" y="639" className="text-[8.5px] font-mono font-semibold fill-emerald-800">
                    EDL v2.4 (Compilado)
                  </text>

                  <line x1="25" y1="646" x2="275" y2="646" stroke="#000000" strokeWidth="1" />

                  <text x="32" y="658" className="text-[8px] font-bold fill-slate-600">FECHA DE EMISIÓN:</text>
                  <text x="32" y="669" className="text-[8.5px] font-mono font-semibold fill-black">
                    {model?.metadata.date || new Date().toLocaleDateString('es-MX')}
                  </text>

                  <line x1="25" y1="676" x2="275" y2="676" stroke="#000000" strokeWidth="1" />

                  <text x="32" y="688" className="text-[8px] font-bold fill-slate-600">NORMA APLICABLE:</text>
                  <text x="32" y="699" className="text-[8.5px] font-mono font-bold fill-blue-900">
                    {model?.standard || 'NOM-001-SEDE-2012'}
                  </text>
                </g>

                {/* ================= MAIN SCHEMATIC (RENDERED VIA COMPILED LAYOUT) ================= */}
                {layoutGraph && (
                  <>
                    {/* Grounding network */}
                    <g id="grounding-network">
                      <line
                        x1={layoutGraph.groundingNetwork.busLine.x1}
                        y1={layoutGraph.groundingNetwork.busLine.y1}
                        x2={layoutGraph.groundingNetwork.busLine.x2}
                        y2={layoutGraph.groundingNetwork.busLine.y2}
                        stroke="#16a34a"
                        strokeWidth="2"
                      />
                      <SvgGroundSymbol
                        x={layoutGraph.groundingNetwork.electrode.x}
                        y={layoutGraph.groundingNetwork.electrode.y}
                        color="#16a34a"
                        scale={0.9}
                      />
                      <text x="290" y="118" textAnchor="end" className="text-[8.5px] fill-green-800 font-mono font-bold">
                        1d-10AWG
                      </text>
                    </g>

                    {/* Nodes rendering */}
                    {layoutGraph.nodes.map((node) => {
                      const el = model?.nodes[node.nodeId];
                      if (!el) return null;

                      // PV STRING / ARRAY
                      if (['PV_MODULE', 'PV_STRING', 'PV_ARRAY'].includes(el.type)) {
                        return (
                          <g key={node.nodeId} id={node.nodeId}>
                            {/* Tap line to grounding */}
                            <line x1={node.x} y1={65} x2={node.x} y2={node.y - 10} stroke="#16a34a" strokeWidth="1.5" />
                            {node.subElements && node.subElements.length > 0 ? (
                              node.subElements.map((sub) => (
                                <SvgPvModuleBlock
                                  key={sub.id}
                                  x={sub.x}
                                  y={sub.y}
                                  width={sub.width}
                                  height={sub.height}
                                  generatorId={sub.label}
                                  modelName={el.model || '650M'}
                                  powerW={el.powerW ? Math.round(el.powerW / (el.subComponentsCount || 1)) : 650}
                                  scale={0.9}
                                />
                              ))
                            ) : (
                              <g transform={`translate(${node.x}, ${node.y})`}>
                                <rect
                                  x={0}
                                  y={0}
                                  width={node.width}
                                  height={node.height}
                                  fill="#f8fafc"
                                  stroke="#000000"
                                  strokeWidth="1.5"
                                />
                                <text x={node.width / 2} y={25} textAnchor="middle" className="text-[9px] font-bold fill-black">
                                  {el.name}
                                </text>
                                <text x={node.width / 2} y={45} textAnchor="middle" className="text-[8px] font-mono fill-slate-600">
                                  {el.powerW}W ({el.voltageV}V)
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      }

                      // FUSE
                      if (el.type === 'FUSE') {
                        return (
                          <SvgFuseSymbol
                            key={node.nodeId}
                            x={node.x + node.width / 2}
                            y={node.y + node.height / 2}
                            label={`Fusible de ${el.currentA || 20}A 10x38`}
                            scale={0.8}
                          />
                        );
                      }

                      // DC DISCONNECT
                      if (el.type === 'DC_DISCONNECT') {
                        return (
                          <SvgRotaryDisconnectSymbol
                            key={node.nodeId}
                            x={node.x}
                            y={node.y}
                            label={`${el.currentA || 32}A@${el.voltageV || 1000}V`}
                            size={32}
                            scale={1}
                          />
                        );
                      }

                      // INVERTER
                      if (el.type === 'INVERTER') {
                        return (
                          <g key={node.nodeId} transform={`translate(${node.x}, ${node.y})`}>
                            <SvgInverterSymbol
                              x={0}
                              y={0}
                              width={node.width}
                              height={node.height}
                              label={node.nodeId}
                              manufacturerModel={`${el.manufacturer || 'Inversor'}\n${el.model || ''}`}
                              scale={1}
                            />
                            {/* Grounding tap */}
                            <line x1={node.width / 2} y1={30} x2={node.width / 2 + 18} y2={30} stroke="#16a34a" strokeWidth="2" />
                            <SvgGroundSymbol x={node.width / 2 + 18} y={30} color="#16a34a" scale={0.8} />
                          </g>
                        );
                      }

                      // AC BREAKER
                      if (el.type === 'AC_BREAKER') {
                        return (
                          <g key={node.nodeId}>
                            <SvgBreakerSymbol
                              x={node.x}
                              y={node.y}
                              poles={el.poles || 2}
                              ratingLabel={`Termomagnético de ${el.poles || 2}x${el.currentA || 60}A`}
                              scale={1.1}
                            />
                            <line x1={node.x + 32} y1={node.y + 10} x2={node.x + 32} y2={node.y + 45} stroke="#16a34a" strokeWidth="1.5" />
                            <SvgGroundSymbol x={node.x + 32} y={node.y + 45} color="#16a34a" scale={0.7} />
                          </g>
                        );
                      }

                      // MAIN BREAKER
                      if (el.type === 'MAIN_BREAKER') {
                        return (
                          <g key={node.nodeId}>
                            <SvgBreakerSymbol
                              x={node.x}
                              y={node.y}
                              poles={el.poles || 3}
                              ratingLabel={`Interruptor general\nTermomagnético de ${el.poles || 3}x${el.currentA || 100}A`}
                              scale={1.1}
                            />
                            <line x1={node.x - 30} y1={node.y + 20} x2={node.x - 30} y2={node.y + 55} stroke="#16a34a" strokeWidth="1.5" />
                            <SvgGroundSymbol x={node.x - 30} y={node.y + 55} color="#16a34a" scale={0.7} />
                          </g>
                        );
                      }

                      // LOAD
                      if (el.type === 'LOAD') {
                        return (
                          <g key={node.nodeId} transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}>
                            <rect
                              x={0}
                              y={0}
                              width={node.width}
                              height={node.height}
                              fill="#ffffff"
                              stroke="#d946ef"
                              strokeWidth="1.8"
                              strokeDasharray="5 3"
                            />
                            <text x={node.width / 2} y={35} textAnchor="middle" className="text-[9.5px] font-bold fill-black">
                              Carga del
                            </text>
                            <text x={node.width / 2} y={50} textAnchor="middle" className="text-[9.5px] font-bold fill-black">
                              domicilio
                            </text>
                          </g>
                        );
                      }

                      // METER
                      if (el.type === 'METER') {
                        return (
                          <g key={node.nodeId}>
                            <SvgKwhMeterSymbol x={node.x} y={node.y} label="kWh" scale={1.1} />
                            <line x1={node.x + 30} y1={node.y} x2={node.x + 30} y2={node.y + 45} stroke="#16a34a" strokeWidth="1.5" />
                            <SvgGroundSymbol x={node.x + 30} y={node.y + 45} color="#16a34a" scale={0.7} />
                            <text x={node.x} y={node.y - 50} textAnchor="middle" className="text-[8.5px] font-bold fill-black">
                              Acometida Trifásica / Bifásica
                            </text>
                            <text x={node.x} y={node.y - 38} textAnchor="middle" className="text-[8px] font-mono fill-slate-700">
                              Tensión {el.voltageV || 220}/127V, 60 Hz
                            </text>
                          </g>
                        );
                      }

                      // GRID
                      if (el.type === 'GRID') {
                        return <SvgCfeGridSymbol key={node.nodeId} x={node.x} y={node.y} radius={22} scale={1.1} />;
                      }

                      return null;
                    })}

                    {/* Wires rendering */}
                    {layoutGraph.wires.map((wire) => {
                      const pathD = wire.points
                        .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
                        .join(' ');

                      return (
                        <g key={wire.connectionId}>
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#000000"
                            strokeWidth={wire.domain === 'AC' ? '2.2' : '1.8'}
                          />
                          {wire.tagPosition && (
                            <SvgCircuitTag
                              x={wire.tagPosition.x}
                              y={wire.tagPosition.y}
                              tagNumber={String(wire.tagPosition.tag)}
                            />
                          )}
                        </g>
                      );
                    })}

                    {/* Red Interconnection Point Callout */}
                    <g transform="translate(660, 480)">
                      <circle cx={0} cy={30} r={4} fill="#ef4444" />
                      <line x1={0} y1={30} x2={25} y2={0} stroke="#ef4444" strokeWidth="1.8" />
                      <text x="28" y="-4" className="text-[10px] font-extrabold fill-red-600 font-sans">
                        Punto de
                      </text>
                      <text x="28" y="7" className="text-[10px] font-extrabold fill-red-600 font-sans">
                        interconexión
                      </text>
                    </g>

                    {/* Circuits & Callouts Schedule Table */}
                    <g id="circuits-table" transform="translate(730, 680)">
                      <rect x="0" y="0" width="480" height="105" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                      <g className="text-[8.5px] font-mono fill-black">
                        <text x="12" y="18" fontWeight="bold">
                          (1) P=5850W, In=15.29A, V=485.1V, 2c - 1x6mm²/1.5kV CD (PV-Wire), 1T - 25mm PG, L=2m, e%=0.04
                        </text>
                        <text x="12" y="36" fontWeight="bold">
                          (2) P=11700W, In=15.29A, V=485.1V, 2c - 1x6mm²/1.5kV CD, 1T - 25mm PG, L={orderInput.dcRouteLengthM || 25}m, e%=0.65
                        </text>
                        <text x="12" y="54" fontWeight="bold">
                          (3) P={Math.round((orderInput.inverterPowerKw || 11.4) * 1000)}W, In=48.0A, V=220V, 3c - 6 AWG THHW-LS, 1T - 25mm PG, L={orderInput.acRouteLengthM || 3}m, e%=0.22
                        </text>
                        <text x="12" y="72" fontWeight="bold">
                          (4) P={Math.round((orderInput.inverterPowerKw || 11.4) * 1000)}W, In=48.0A, V=220V, 3c - 6 AWG THHW-LS, 1T - 25mm PG, L=1m, e%=0.05
                        </text>
                        <text x="12" y="90" fontWeight="bold">
                          (5) Desconectador de perilla de 3 polos - 32A@1000V DC (NOM Art. 690-13 / 690-15)
                        </text>
                      </g>
                    </g>
                  </>
                )}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: EDL LIVE CODE EDITOR
          ======================================================== */}
      {activeTab === 'edl_editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Código Fuente EDL (Electrical Diagram Language)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportEdl}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  Descargar .edl
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => compileFromEdlCode(edlCode)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Compilar EDL</span>
                </motion.button>
              </div>
            </div>

            <textarea
              value={edlCode}
              onChange={(e) => setEdlCode(e.target.value)}
              rows={24}
              className="w-full bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:border-amber-500/50 outline-none leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Quick Syntax Reference Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 text-xs">
            <div className="flex items-center space-x-2 text-white font-bold border-b border-slate-800 pb-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span>Manual de Sintaxis EDL</span>
            </div>

            <div className="space-y-3 text-slate-300">
              <div>
                <p className="font-mono text-amber-300 font-bold">1. Declaración del Sistema:</p>
                <code className="block bg-slate-950 p-2 rounded text-[11px] font-mono text-slate-400 mt-1">
                  SYSTEM CASCA_11K &#123;<br />
                  &nbsp;&nbsp;TYPE GRID_TIED;<br />
                  &#125;
                </code>
              </div>

              <div>
                <p className="font-mono text-amber-300 font-bold">2. Declaración de Nodos:</p>
                <code className="block bg-slate-950 p-2 rounded text-[11px] font-mono text-slate-400 mt-1">
                  PV_STRING STR01 &#123;<br />
                  &nbsp;&nbsp;POWER 5850W;<br />
                  &nbsp;&nbsp;VOLTAGE 485.1V;<br />
                  &#125;
                </code>
              </div>

              <div>
                <p className="font-mono text-amber-300 font-bold">3. Conexión de Puertos:</p>
                <code className="block bg-slate-950 p-2 rounded text-[11px] font-mono text-slate-400 mt-1">
                  CONNECT STR01.DC+ -&gt; FUSE01.IN [GAUGE="10 AWG", LENGTH=2m];
                </code>
              </div>

              <div>
                <p className="font-mono text-amber-300 font-bold">4. Tipos Soportados:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['PV_STRING', 'FUSE', 'DC_DISCONNECT', 'INVERTER', 'AC_BREAKER', 'METER', 'GRID', 'BATTERY', 'LOAD'].map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: SEMANTIC SERVICE ORDER INPUT
          ======================================================== */}
      {activeTab === 'semantic_input' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Intérprete Semántico de Orden de Servicio
              </h3>
              <p className="text-xs text-slate-400">
                Alimentación paramétrica inversa: ingresa datos técnicos de la orden física para generar el EDL automáticamente.
              </p>
            </div>
            <button
              onClick={() => compileFromSemanticInput(orderInput)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generar EDL & Diagrama</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* General */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-amber-400 uppercase tracking-wider">1. Datos Generales</h4>
              <div>
                <label className="text-slate-400 block mb-1">Nombre del Cliente / Razón Social</label>
                <input
                  type="text"
                  value={orderInput.clientName}
                  onChange={(e) => setOrderInput({ ...orderInput, clientName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Dirección de la Instalación</label>
                <input
                  type="text"
                  value={orderInput.location}
                  onChange={(e) => setOrderInput({ ...orderInput, location: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">No. Servicio CFE (RPU)</label>
                <input
                  type="text"
                  value={orderInput.rpu}
                  onChange={(e) => setOrderInput({ ...orderInput, rpu: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>

            {/* PV Array */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-amber-400 uppercase tracking-wider">2. Generación Fotovoltaica</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Total Módulos</label>
                  <input
                    type="number"
                    value={orderInput.totalModules}
                    onChange={(e) => setOrderInput({ ...orderInput, totalModules: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Potencia (Watts)</label>
                  <input
                    type="number"
                    value={orderInput.modulePowerW}
                    onChange={(e) => setOrderInput({ ...orderInput, modulePowerW: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">No. Strings</label>
                  <input
                    type="number"
                    value={orderInput.numberOfStrings}
                    onChange={(e) => setOrderInput({ ...orderInput, numberOfStrings: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Módulos x String</label>
                  <input
                    type="number"
                    value={orderInput.modulesPerString}
                    onChange={(e) => setOrderInput({ ...orderInput, modulesPerString: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Marca / Modelo de Panel</label>
                <input
                  type="text"
                  value={orderInput.moduleModel}
                  onChange={(e) => setOrderInput({ ...orderInput, moduleModel: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            {/* Inverter & Protections */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-amber-400 uppercase tracking-wider">3. Inversor & Protecciones</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Inversor (kW)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={orderInput.inverterPowerKw}
                    onChange={(e) => setOrderInput({ ...orderInput, inverterPowerKw: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tensión AC (V)</label>
                  <input
                    type="number"
                    value={orderInput.acVoltageV}
                    onChange={(e) => setOrderInput({ ...orderInput, acVoltageV: parseInt(e.target.value) || 220 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Modelo Inversor</label>
                <input
                  type="text"
                  value={orderInput.inverterModel}
                  onChange={(e) => setOrderInput({ ...orderInput, inverterModel: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Breaker FV (A)</label>
                  <input
                    type="number"
                    value={orderInput.acBreakerRatingA}
                    onChange={(e) => setOrderInput({ ...orderInput, acBreakerRatingA: parseInt(e.target.value) || 60 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Distancia DC (m)</label>
                  <input
                    type="number"
                    value={orderInput.dcRouteLengthM}
                    onChange={(e) => setOrderInput({ ...orderInput, dcRouteLengthM: parseInt(e.target.value) || 25 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: VALIDATION & ELECTRICAL GRAPH INSPECTOR
          ======================================================== */}
      {activeTab === 'validation_graph' && (
        <div className="space-y-4">
          {/* Validation Banner */}
          {validation && (
            <div className={`p-4 rounded-2xl border ${validation.isValid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {validation.isValid ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {validation.isValid ? 'Modelo Eléctrico Validado y Coherente' : 'Inconsistencias Detectadas'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {validation.errorsCount} errores críticos • {validation.warningsCount} advertencias normativas NOM-001/NEC
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800 text-amber-300">
                    P_DC: {(validation.metrics.totalDcPowerW / 1000).toFixed(2)} kWp
                  </span>
                  <span className="px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800 text-blue-300">
                    P_AC: {validation.metrics.totalAcPowerKw.toFixed(1)} kW
                  </span>
                </div>
              </div>

              {validation.issues.length > 0 && (
                <div className="mt-4 space-y-2">
                  {validation.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                        issue.severity === 'ERROR'
                          ? 'bg-red-950/50 border border-red-500/30 text-red-200'
                          : issue.severity === 'WARNING'
                          ? 'bg-amber-950/50 border border-amber-500/30 text-amber-200'
                          : 'bg-blue-950/50 border border-blue-500/30 text-blue-200'
                      }`}
                    >
                      {issue.severity === 'ERROR' ? (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <strong className="block font-semibold">[{issue.code}] {issue.message}</strong>
                        {issue.recommendation && (
                          <span className="text-slate-400 block mt-0.5">↳ Recomendación: {issue.recommendation}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Nodes & Connections Table */}
          {model && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-blue-400" />
                  Nodos y Componentes del Sistema ({Object.keys(model.nodes).length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] font-mono text-slate-300">
                    <thead className="bg-slate-950 text-slate-500 border-b border-slate-800">
                      <tr>
                        <th className="p-2">ID</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Dominio</th>
                        <th className="p-2">Nivel</th>
                        <th className="p-2">Parámetros</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {Object.values(model.nodes).map((n) => (
                        <tr key={n.id} className="hover:bg-slate-800/50">
                          <td className="p-2 font-bold text-amber-400">{n.id}</td>
                          <td className="p-2">{n.type}</td>
                          <td className="p-2">{n.domain}</td>
                          <td className="p-2">L{n.level}</td>
                          <td className="p-2 text-slate-400">
                            {n.powerW ? `${n.powerW}W ` : ''}
                            {n.voltageV ? `${n.voltageV}V ` : ''}
                            {n.currentA ? `${n.currentA}A` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                  Conexiones Puerto a Puerto ({model.connections.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] font-mono text-slate-300">
                    <thead className="bg-slate-950 text-slate-500 border-b border-slate-800">
                      <tr>
                        <th className="p-2">Origen</th>
                        <th className="p-2">Destino</th>
                        <th className="p-2">Conductor</th>
                        <th className="p-2">Canalización</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {model.connections.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/50">
                          <td className="p-2 text-emerald-400">{c.fromNodeId}.{c.fromPortId}</td>
                          <td className="p-2 text-sky-400">{c.toNodeId}.{c.toPortId}</td>
                          <td className="p-2 text-slate-300">{c.conductor?.gauge || 'N/A'}</td>
                          <td className="p-2 text-slate-400">{c.conductor?.conduitTradeSize || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
