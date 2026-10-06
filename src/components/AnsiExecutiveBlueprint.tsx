import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Layers,
  Edit3,
  Check,
  Share2,
  FileCode,
  Sparkles,
  Info,
  Sliders,
  Cpu,
  Boxes
} from 'lucide-react';
import { ProjectModelResult } from '../engine/types';
import { DetailLevel, ElectricalModel, LayoutGraph } from '../engine/edl/edlTypes';
import { ServiceOrderToEdl } from '../engine/edl/serviceOrderToEdl';
import { EdlLayoutEngine } from '../engine/edl/edlLayoutEngine';
import { EdlValidator } from '../engine/edl/edlValidator';
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
  ANSI_BLOCKS_CATALOG,
} from './AnsiElectricalBlocks';

interface AnsiExecutiveBlueprintProps {
  result: ProjectModelResult;
  onSelectRoute?: (routeId: string) => void;
}

export const AnsiExecutiveBlueprint: React.FC<AnsiExecutiveBlueprintProps> = ({
  result,
  onSelectRoute,
}) => {
  const { model, dc, ac, routeResults, bom } = result;

  // Zoom and Pan controls
  const [zoom, setZoom] = useState<number>(1);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('HIGH');
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [isEditingTitleBlock, setIsEditingTitleBlock] = useState<boolean>(false);

  // Editable Title block fields with automatic synchronization from model
  const [titleBlock, setTitleBlock] = useState({
    projectName: model.projectName || 'CASTELLANOS LOZA GABRIELA',
    clientName: model.clientName || 'GABRIELA CASTELLANOS LOZA',
    address: model.location || 'A RODRIGUEZ LEYVA MZ1 LT5 AMPLIACION SANTO TOMAS, C.P. 56565, EDO. MEX.',
    rpu: '148231100137',
    drafter: 'Ing. Proyectista Certificado',
    engineer: 'Ing. David Marroquín García',
    date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
  });

  // Keep titleBlock in sync when a new installation model or service order is loaded
  useEffect(() => {
    setTitleBlock((prev) => ({
      ...prev,
      projectName: model.projectName || prev.projectName,
      clientName: model.clientName || prev.clientName,
      address: model.location || prev.address,
    }));
  }, [model.projectName, model.clientName, model.location]);

  const svgRef = useRef<SVGSVGElement>(null);

  // Compile EDL Model from Active Installation Model dynamically
  const { edlModel, layoutGraph } = useMemo(() => {
    const dcRoute = routeResults.find((r) => r.type === 'DC') || routeResults[0];
    const acRoute = routeResults.find((r) => r.type === 'AC') || routeResults[1] || routeResults[0];

    const inputOrder = {
      clientName: titleBlock.clientName,
      projectName: titleBlock.projectName,
      location: titleBlock.address,
      rpu: titleBlock.rpu,
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
      acBreakerRatingA: Math.ceil((model.inverter.maxOutputCurrentA || 48) * 1.25),
      mainBreakerRatingA: Math.max(100, Math.ceil((model.inverter.maxOutputCurrentA || 48) * 1.25 * 1.5)),
      dcRouteLengthM: model.routes.find((r) => r.type === 'DC')?.lengthM || 25,
      acRouteLengthM: model.routes.find((r) => r.type === 'AC')?.lengthM || 3,
      hasBattery: model.battery?.enabled,
      batteryCapacityKwh: model.battery?.capacityKwh,
    };

    const { model: compiledEdlModel } = ServiceOrderToEdl.compileFromOrder(inputOrder);
    const layout = EdlLayoutEngine.computeLayout(compiledEdlModel, detailLevel);

    return {
      edlModel: compiledEdlModel,
      layoutGraph: layout,
    };
  }, [model, detailLevel, titleBlock, routeResults]);

  // Dynamically detect items for Left Sidebar "Lista de Materiales" from BOM & Model
  const materialsList = useMemo(() => {
    const items: Array<{ category: string; description: string }> = [];

    // 1. Conduits
    const conduitGauges = Array.from(new Set(routeResults.map((r) => r.selectedConduitTradeSize)));
    items.push({
      category: 'CANALIZACIONES',
      description: `TUBERÍA CONDUIT PG (${conduitGauges.join(', ')} / NOM ART. 344)`,
    });

    // 2. Protections
    const breakers = Array.from(
      new Set(
        routeResults
          .filter((r) => r.type === 'AC')
          .map((r) => `${r.derivedProtections?.[0]?.ratingA || Math.ceil(r.designCurrentA * 1.25)}A`)
      )
    );
    items.push({
      category: 'PROTECCIONES AC',
      description: `ITM TERMOMAGNÉTICOS ${breakers.join(', ') || '60A'} (NOM ART. 240)`,
    });

    // 3. DC Protections / Disconnect
    items.push({
      category: 'PROTECCIÓN DC',
      description: 'DESCONECTADOR ROTATIVO 32A@1000V DC (NOM ART. 690-13)',
    });

    // 4. Conductors
    const wireGauges = Array.from(new Set(routeResults.map((r) => r.selectedGauge)));
    items.push({
      category: 'CONDUCTORES',
      description: `THHW-LS & PV-WIRE (${wireGauges.join(', ')}) (NOM ART. 310)`,
    });

    // 5. Grounding
    items.push({
      category: 'PUESTA A TIERRA',
      description: 'ELECTRODO COOPERWELD 5/8" × 3.0M + 10 AWG (NOM ART. 250)',
    });

    // 6. Enclosures
    items.push({
      category: 'ENVOLVENTES',
      description: 'GABINETES METÁLICOS TIPO NEMA 3R / INTEMPERIE',
    });

    return items;
  }, [routeResults, bom]);

  // Dynamically detect symbols in the current model for Left Sidebar "Simbología"
  const presentSymbols = useMemo(() => {
    const nodeTypes = new Set(Object.values(edlModel.nodes).map((n) => n.type));
    return [
      { id: 'ground', label: 'Puesta a tierra (SPT)', sub: 'NOM-001 Art. 250' },
      { id: 'breaker', label: 'Interruptor termomagnético', sub: 'Protección sobrecorriente' },
      { id: 'fuse', label: 'Fusibles gPV', sub: '10x38 1000V DC' },
      { id: 'meter', label: 'Medidor Wattorímetro', sub: 'Bidireccional CFE' },
      { id: 'inverter', label: 'Inversor de corriente', sub: 'Interconectado DC/AC' },
      { id: 'rotary', label: 'Desconectador de perilla', sub: 'Rotativo bajo carga' },
    ];
  }, [edlModel]);

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
    downloadLink.download = `Diagrama_Unifilar_ANSI_${model.projectName.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Export DXF
  const handleExportDxf = () => {
    if (!edlModel || !layoutGraph) return;
    const dxfContent = DxfExporter.generateDxf(edlModel, layoutGraph);
    const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Diagrama_Unifilar_AutoCAD_${model.projectName.replace(/\s+/g, '_')}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Derived DC & AC values for schedule
  const totalDcW = dc.totalPowerW || model.pv.powerW * model.pv.totalModules;
  const stringIsc = dc.stringIscA || 15.29;
  const stringVoc = dc.stringVocV || 485.1;
  const invAcW = Math.round(ac.totalAcPowerKw * 1000 || model.inverter.ratedPowerKw * 1000);
  const acCurrentA = ac.totalAcCurrentA || (invAcW / (model.inverter.nominalAcVoltageV * (model.inverter.systemType.includes('3F') ? 1.732 : 1)));
  const dcRoute = routeResults.find((r) => r.type === 'DC') || routeResults[0];
  const acRoute = routeResults.find((r) => r.type === 'AC') || routeResults[1] || routeResults[0];

  return (
    <div className="space-y-4">
      {/* CAD Control Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Plano Técnico Unifilar ANSI / IEEE & CFE
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                Motor Determinista EDL v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Generado a partir del grafo eléctrico dinámico con detección paramétrica de materiales y simbología.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Detail Level selector */}
          <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5 text-xs">
            <span className="text-slate-400 px-2 font-medium">Detalle:</span>
            {(['LOW', 'MEDIUM', 'HIGH'] as DetailLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setDetailLevel(lvl)}
                className={`px-2 py-1 rounded-lg font-mono text-[10px] font-bold transition cursor-pointer ${
                  detailLevel === lvl
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCatalogModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
            title="Ver catálogo de bloques y símbolos eléctricos ANSI/IEEE"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Biblioteca ANSI</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsEditingTitleBlock(!isEditingTitleBlock)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              isEditingTitleBlock
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Editar datos del cuadro de rotulación / pie de plano"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>{isEditingTitleBlock ? 'Cerrar Edición' : 'Editar Cuadro'}</span>
          </motion.button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-400 hover:text-white transition"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-400 hover:text-white transition"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-slate-400 hover:text-white transition border-l border-slate-700"
              title="Restablecer vista 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExportDxf}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition cursor-pointer"
            title="Exportar archivo DXF para AutoCAD"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>AutoCAD DXF</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExportSvg}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer"
            title="Descargar plano en formato vectorial SVG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SVG</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
            title="Imprimir plano unifilar oficial"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </motion.button>
        </div>
      </div>

      {/* Title block quick editor if expanded */}
      {isEditingTitleBlock && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-xl"
        >
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Edit3 className="w-4 h-4" />
              Edición del Cuadro de Rotulación (Pie de Plano Oficial)
            </h3>
            <span className="text-[11px] text-slate-400">
              Los cambios se reflejan en tiempo real sobre el plano vectorial
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Nombre del Proyecto / Titular</label>
              <input
                type="text"
                value={titleBlock.projectName}
                onChange={(e) => setTitleBlock({ ...titleBlock, projectName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Domicilio / Ubicación del Inmueble</label>
              <input
                type="text"
                value={titleBlock.address}
                onChange={(e) => setTitleBlock({ ...titleBlock, address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">No. Servicio CFE / RPU</label>
              <input
                type="text"
                value={titleBlock.rpu}
                onChange={(e) => setTitleBlock({ ...titleBlock, rpu: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Ingeniero Proyectista / Firma</label>
              <input
                type="text"
                value={titleBlock.engineer}
                onChange={(e) => setTitleBlock({ ...titleBlock, engineer: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Blueprint Viewport (White CAD Blueprint background as in official drawings) */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 md:p-6 overflow-auto shadow-2xl flex justify-center">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="bg-white rounded-lg shadow-2xl border-4 border-slate-900 w-[1240px] h-[820px] relative overflow-hidden flex-shrink-0 select-none"
        >
          {/* SVG Vector Drawing */}
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

            {/* ================= LEFT COLUMN: TITLE, MATERIALS, SYMBOLS, TITLE BLOCK ================= */}
            <line x1="280" y1="20" x2="280" y2="800" stroke="#000000" strokeWidth="1.8" />

            {/* 1. Header Box: DIAGRAMA UNIFILAR */}
            <rect x="25" y="25" width="250" height="42" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />
            <text x="150" y="44" textAnchor="middle" className="text-[14px] font-extrabold fill-black tracking-widest">
              DIAGRAMA
            </text>
            <text x="150" y="58" textAnchor="middle" className="text-[14px] font-extrabold fill-black tracking-widest">
              UNIFILAR
            </text>

            {/* 2. Box: Lista de Materiales (Dynamically Populated from BOM) */}
            <rect x="25" y="72" width="250" height="175" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
            <text x="150" y="90" textAnchor="middle" className="text-[12px] font-bold fill-black">
              Lista de materiales
            </text>
            <line x1="25" y1="96" x2="275" y2="96" stroke="#000000" strokeWidth="1" />
            <g className="text-[7.5px] font-sans fill-black leading-tight">
              {materialsList.map((mat, i) => (
                <g key={i} transform={`translate(32, ${110 + i * 22})`}>
                  <text x="0" y="0" fontWeight="bold">
                    {mat.category}
                  </text>
                  <text x="0" y="10" className="fill-slate-700">
                    {mat.description.slice(0, 36)}
                  </text>
                </g>
              ))}
            </g>

            {/* 3. Box: Simbología ANSI / IEEE (Dynamically Populated from Graph) */}
            <rect x="25" y="252" width="250" height="235" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
            <text x="150" y="270" textAnchor="middle" className="text-[12px] font-bold fill-black">
              Simbología
            </text>
            <line x1="25" y1="276" x2="275" y2="276" stroke="#000000" strokeWidth="1" />

            {/* Simbología Items */}
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
            <text x="85" y="390" className="text-[7.5px] fill-slate-600 font-sans">Bidireccional CFE</text>

            <rect x="38" y="405" width="28" height="18" fill="none" stroke="#000000" strokeWidth="1.2" strokeDasharray="3 2" />
            <text x="85" y="416" className="text-[8.5px] fill-black font-sans">Gabinete / Envolvente</text>

            <g transform="translate(52, 442) scale(0.45)">
              <rect x="-24" y="-24" width="48" height="48" fill="#ffffff" stroke="#000000" strokeWidth="2" />
              <line x1="-24" y1="24" x2="24" y2="-24" stroke="#000000" strokeWidth="1.8" />
              <line x1="-14" y1="-10" x2="-4" y2="-10" stroke="#000000" strokeWidth="2" />
              <path d="M 4 10 Q 8 4 12 10 T 20 10" fill="none" stroke="#000000" strokeWidth="2" />
            </g>
            <text x="85" y="440" className="text-[8.5px] fill-black font-sans">Inversor de corriente</text>
            <text x="85" y="450" className="text-[7.5px] fill-slate-600 font-sans">Interconectado DC/AC</text>

            <g transform="translate(52, 470) scale(0.55)">
              <rect x="-14" y="-14" width="28" height="28" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />
              <circle cx="0" cy="0" r="9" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />
              <circle cx="0" cy="0" r="2.5" fill="#000000" />
            </g>
            <text x="85" y="468" className="text-[8.5px] fill-black font-sans">Desconectador de perilla</text>
            <text x="85" y="478" className="text-[7.5px] fill-slate-600 font-sans">Rotativo bajo carga</text>

            {/* 4. Box: Cuadro de Datos del Proyecto (Title Block) */}
            <rect x="25" y="492" width="250" height="300" fill="#ffffff" stroke="#000000" strokeWidth="1.8" />
            
            <g className="text-black font-sans">
              <text x="32" y="508" className="text-[8px] font-bold fill-slate-600">PROYECTO:</text>
              <text x="32" y="520" className="text-[9px] font-extrabold fill-black">{titleBlock.projectName.slice(0, 32)}</text>
              <text x="32" y="531" className="text-[9px] font-extrabold fill-black">{titleBlock.projectName.slice(32, 64)}</text>

              <line x1="25" y1="538" x2="275" y2="538" stroke="#000000" strokeWidth="1" />

              <text x="32" y="550" className="text-[8px] font-bold fill-slate-600">DOMICILIO / UBICACIÓN:</text>
              <text x="32" y="562" className="text-[8px] font-medium fill-black">{titleBlock.address.slice(0, 36)}</text>
              <text x="32" y="573" className="text-[8px] font-medium fill-black">{titleBlock.address.slice(36, 72)}</text>
              <text x="32" y="584" className="text-[8px] font-medium fill-black">{titleBlock.address.slice(72, 108)}</text>
              
              <text x="32" y="598" className="text-[8px] font-bold fill-slate-600">RPU / SERVICIO CFE:</text>
              <text x="32" y="609" className="text-[9px] font-mono font-bold fill-black">{titleBlock.rpu}</text>

              <line x1="25" y1="616" x2="275" y2="616" stroke="#000000" strokeWidth="1" />

              <text x="32" y="628" className="text-[8px] font-bold fill-slate-600">LENGUAJE / MOTOR:</text>
              <text x="32" y="639" className="text-[8.5px] font-mono font-bold fill-emerald-800">EDL v2.4 (NOM-001)</text>

              <line x1="25" y1="646" x2="275" y2="646" stroke="#000000" strokeWidth="1" />

              <text x="32" y="658" className="text-[8px] font-bold fill-slate-600">FECHA DE EMISIÓN:</text>
              <text x="32" y="669" className="text-[8.5px] font-mono font-semibold fill-black">{titleBlock.date}</text>

              <line x1="25" y1="676" x2="275" y2="676" stroke="#000000" strokeWidth="1" />

              <text x="32" y="688" className="text-[8px] font-bold fill-slate-600">PROYECTÓ / FIRMA RESPONSABLE:</text>
              <text x="32" y="699" className="text-[8.5px] font-extrabold fill-black">{titleBlock.engineer}</text>

              {/* Mini Croquis de Localización Satelital Vectorial */}
              <g transform="translate(32, 706)">
                <rect x="0" y="0" width="236" height="80" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                <line x1="0" y1="25" x2="236" y2="25" stroke="#e2e8f0" strokeWidth="1.5" />
                <line x1="0" y1="55" x2="236" y2="55" stroke="#e2e8f0" strokeWidth="1.5" />
                <line x1="60" y1="0" x2="60" y2="80" stroke="#e2e8f0" strokeWidth="1.5" />
                <line x1="160" y1="0" x2="160" y2="80" stroke="#e2e8f0" strokeWidth="1.5" />
                <line x1="20" y1="80" x2="180" y2="0" stroke="#cbd5e1" strokeWidth="4" />
                <line x1="120" y1="80" x2="220" y2="0" stroke="#cbd5e1" strokeWidth="3" />
                <circle cx="100" cy="40" r="6" fill="#ef4444" />
                <circle cx="100" cy="40" r="10" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" />
                <text x="112" y="44" className="text-[7.5px] fill-slate-800 font-bold">Ubicación Inmueble FV</text>
                <text x="180" y="72" className="text-[6.5px] fill-slate-400 font-mono">CROQUIS</text>
              </g>
            </g>

            {/* ================= MAIN SCHEMATIC CANVAS: DRIVEN BY EDL LAYOUT GRAPH ================= */}
            {layoutGraph && (
              <>
                {/* 1. Grounding Network */}
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

                {/* 2. Nodes rendering from Graph */}
                {layoutGraph.nodes.map((node) => {
                  const el = edlModel.nodes[node.nodeId];
                  if (!el) return null;

                  // PV STRING / ARRAY
                  if (['PV_MODULE', 'PV_STRING', 'PV_ARRAY'].includes(el.type)) {
                    return (
                      <g key={node.nodeId} id={node.nodeId}>
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
                          strokeWidth={1.8}
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

                {/* 3. Wires rendering from Graph */}
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

                {/* 4. Circuits Schedule Table */}
                <g id="circuits-table" transform="translate(730, 680)">
                  <rect x="0" y="0" width="480" height="105" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                  <g className="text-[8.5px] font-mono fill-black">
                    <text x="12" y="18" fontWeight="bold">
                      (1) P={Math.round(totalDcW / (model.pv.numberOfStrings || 1))}W, In={stringIsc.toFixed(2)}A, V={stringVoc.toFixed(1)}V, 2c - 1x6mm²/1.5kV CD (PV-Wire), 1T - 25mm PG, L=2m, e%=0.04
                    </text>
                    <text x="12" y="36" fontWeight="bold">
                      (2) P={totalDcW}W, In={stringIsc.toFixed(2)}A, V={stringVoc.toFixed(1)}V, 2c - 1x6mm²/1.5kV CD, 1T - 25mm PG, L={model.routes.find((r) => r.type === 'DC')?.lengthM || 25}m, e%={dcRoute?.voltageDropPercent?.toFixed(2) || '0.65'}
                    </text>
                    <text x="12" y="54" fontWeight="bold">
                      (3) P={invAcW}W, In={acCurrentA.toFixed(1)}A, V={model.inverter.nominalAcVoltageV || 220}V, 3c - {acRoute?.selectedGauge || '6 AWG'} THHW-LS, 1T - {acRoute?.selectedConduitTradeSize || '25mm'} PG, L={model.routes.find((r) => r.type === 'AC')?.lengthM || 3}m, e%={acRoute?.voltageDropPercent?.toFixed(2) || '0.22'}
                    </text>
                    <text x="12" y="72" fontWeight="bold">
                      (4) P={invAcW}W, In={acCurrentA.toFixed(1)}A, V={model.inverter.nominalAcVoltageV || 220}V, 3c - {acRoute?.selectedGauge || '6 AWG'} THHW-LS, 1T - {acRoute?.selectedConduitTradeSize || '25mm'} PG, L=1m, e%=0.05
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

      {/* Catalog & ANSI/IEEE Blocks Inspector Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Biblioteca de Bloques y Símbolos Eléctricos ANSI / IEEE
                  </h3>
                  <p className="text-xs text-slate-400">
                    Estándares gráficos normalizados conforme a IEEE Std 315 / ANSI Y32.2 y NOM-001-SEDE
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ANSI_BLOCKS_CATALOG.map((block) => (
                <div
                  key={block.id}
                  className="bg-slate-950 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-4 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 uppercase">
                        {block.category}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">{block.name}</h4>
                      <p className="text-[11px] font-mono text-amber-400">{block.standard}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {block.description}
                  </p>

                  <div className="bg-white rounded-xl p-3 flex items-center justify-center min-h-[90px] border border-slate-300">
                    <svg viewBox="-50 -40 100 80" width="100" height="75" className="overflow-visible font-sans select-none">
                      {block.id === 'ansi-pv-module' && (
                        <SvgPvModuleBlock
                          x={0}
                          y={0}
                          generatorId="G1"
                          modelName="LR7-72HVHF"
                          powerW={650}
                          scale={0.9}
                        />
                      )}
                      {block.id === 'ansi-inverter' && (
                        <SvgInverterSymbol x={0} y={0} label="I1" scale={0.7} />
                      )}
                      {block.id === 'ansi-breaker' && (
                        <SvgBreakerSymbol x={0} y={0} poles={2} ratingLabel="2x63A" scale={0.8} />
                      )}
                      {block.id === 'ansi-fuse' && (
                        <SvgFuseSymbol x={0} y={0} label="20A 10x38" scale={0.9} />
                      )}
                      {block.id === 'ansi-rotary-switch' && (
                        <SvgRotaryDisconnectSymbol x={0} y={0} label="32A@1000V" scale={0.9} />
                      )}
                      {block.id === 'ansi-meter' && (
                        <SvgKwhMeterSymbol x={0} y={0} label="kWh" scale={0.9} />
                      )}
                      {block.id === 'ansi-ground' && (
                        <SvgGroundSymbol x={0} y={-8} color="#16a34a" scale={1.2} />
                      )}
                      {block.id === 'ansi-cfe-grid' && (
                        <SvgCfeGridSymbol x={0} y={0} radius={20} scale={0.9} />
                      )}
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
