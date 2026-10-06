import React from 'react';
import { motion } from 'motion/react';
import {
  Sun,
  Zap,
  Layers,
  Table,
  ShieldCheck,
  FileText,
  Settings,
  Sparkles,
  Calendar,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Gauge,
  Activity,
  Cable,
  Boxes,
  Compass,
  Cpu,
  Bot,
  Workflow,
  Globe,
  MapPin
} from 'lucide-react';
import { ProjectModelResult, InstallationModel } from '../engine/types';
import { ActiveTabType } from './Header';

interface DashboardOverviewProps {
  result: ProjectModelResult;
  model: InstallationModel;
  onNavigate: (tab: any) => void;
  onOpenOCR: () => void;
  onOpenCalendar: () => void;
  onOpenAssistant?: () => void;
  onOpenSatellite?: () => void;
  onExportMarkdown: () => void;
  onExportCSV: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  result,
  model,
  onNavigate,
  onOpenOCR,
  onOpenCalendar,
  onOpenAssistant,
  onOpenSatellite,
  onExportMarkdown,
  onExportCSV,
}) => {
  const { dc, ac, routeResults, bom, validations } = result;

  const totalDcKwp = (dc.totalPowerW / 1000).toFixed(2);
  const totalAcKw = ac.totalAcPowerKw.toFixed(1);
  const dcAcRatio = (dc.totalPowerW / (ac.totalAcPowerKw * 1000 || 1)).toFixed(2);
  
  // Calculate max voltage drop across routes
  const maxVoltageDrop = routeResults.length > 0 
    ? Math.max(...routeResults.map(r => r.voltageDropPercent)) 
    : 0;

  // Calculate max conduit fill across routes
  const maxFillPct = routeResults.length > 0
    ? Math.max(...routeResults.map(r => r.actualConduitFillPercent))
    : 0;

  const passedCount = validations.filter(v => v.passed).length;
  const totalValidations = validations.length;
  const allPassed = passedCount === totalValidations;

  // Total lengths
  const totalConduitMeters = model.routes.reduce((sum, r) => sum + r.lengthM, 0);
  const totalConductorsMeters = routeResults.reduce((sum, r) => {
    const routeConfig = model.routes.find(rc => rc.id === r.routeId);
    const length = routeConfig ? routeConfig.lengthM : 10;
    return sum + (length * r.physicalCount);
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Hero Project Banner */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 md:p-8 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Centro de Mando & Cálculo Fotovoltaico
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                {model.installationId || 'ID: PV-DEFAULT'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                NOM-001-SEDE-2012 / NEC 690 & 705
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              {model.projectName}
            </h1>

            <p className="text-sm text-slate-400 flex flex-wrap items-center gap-2 font-mono">
              <span>Cliente: <strong className="text-slate-200">{model.clientName}</strong></span>
              <span className="text-slate-600">•</span>
              <span 
                onClick={onOpenSatellite}
                className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 cursor-pointer underline decoration-amber-500/40 underline-offset-4"
                title="Abrir visor satelital de azotea y extraer coordenadas meteorológicas"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Ubicación: <strong className="text-white">{model.location}</strong></span>
              </span>
              <span className="text-slate-600">•</span>
              <span>Temp. Diseño: <strong className="text-amber-400">{model.ambientMaxTempC}°C</strong> (Min: <strong className="text-blue-400">{model.ambientMinTempC ?? 5}°C</strong>)</span>
            </p>
          </div>

          {/* Quick Action Pills */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch lg:self-center">
            {onOpenSatellite && (
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={onOpenSatellite}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 border border-purple-400/30 flex items-center justify-center gap-2 transition cursor-pointer"
                title="Abrir visor satelital de azotea y consultar irradiancia solar / temperatura de diseño"
              >
                <Globe className="w-4 h-4 text-purple-200" />
                <span>Visor Satelital & Solar</span>
              </motion.button>
            )}

            {onOpenAssistant && (
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={onOpenAssistant}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 border border-emerald-400/30 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Bot className="w-4 h-4 text-emerald-200" />
                <span>Asistente IA</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenOCR}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Escanear Orden (IA)</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenCalendar}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 border border-blue-400/30 flex items-center justify-center gap-2 transition"
            >
              <Calendar className="w-4 h-4 text-blue-200" />
              <span>Programar Salidas BOM</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate('editor')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Ajustar Parámetros</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Stat 1: DC Power */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 transition shadow-md relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('report')}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider">Potencia DC</span>
            <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
          </div>
          <div className="text-xl font-mono font-extrabold text-amber-400">{totalDcKwp} <span className="text-xs font-sans text-slate-400 font-normal">kWp</span></div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">{model.pv.numberOfStrings} strings ({model.pv.powerW}W)</p>
        </motion.div>

        {/* Stat 2: AC Power */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-4 transition shadow-md relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('diagram')}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider">Potencia AC</span>
            <Zap className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-mono font-extrabold text-emerald-400">{totalAcKw} <span className="text-xs font-sans text-slate-400 font-normal">kW</span></div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">{ac.nominalAcVoltageV}V • {ac.systemType}</p>
        </motion.div>

        {/* Stat 3: Overload Ratio DC/AC */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-4 transition shadow-md relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('report')}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider">Ratio DC / AC</span>
            <Activity className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-mono font-extrabold text-cyan-400">{dcAcRatio} <span className="text-xs font-sans text-slate-400 font-normal">x</span></div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">Sobredimensionamiento</p>
        </motion.div>

        {/* Stat 4: Max Voltage Drop */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 transition shadow-md relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('routes')}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider">Caída Máxima</span>
            <TrendingDown className="w-4 h-4 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
          </div>
          <div className={`text-xl font-mono font-extrabold ${maxVoltageDrop <= 3.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {maxVoltageDrop.toFixed(2)}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">Límite: ≤ 3.0% (NOM)</p>
        </motion.div>

        {/* Stat 5: Max Conduit Fill */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 rounded-xl p-4 transition shadow-md relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('routes')}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider">Relleno Tubería</span>
            <Gauge className="w-4 h-4 text-blue-400 group-hover:rotate-45 transition-transform" />
          </div>
          <div className={`text-xl font-mono font-extrabold ${maxFillPct <= 40 ? 'text-blue-400' : 'text-rose-400'}`}>
            {maxFillPct.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">Límite: ≤ 40% (Cap. 9)</p>
        </motion.div>

        {/* Stat 6: BOM Items */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-4 transition shadow-md relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('bom')}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider">Materiales BOM</span>
            <Boxes className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-mono font-extrabold text-emerald-400">{bom.length} <span className="text-xs font-sans text-slate-400 font-normal">items</span></div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">{passedCount}/{totalValidations} Reglas OK</p>
        </motion.div>
      </div>

      {/* Main Interactive Grid: Flow & Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visual Electrical Topology & Circuit Health (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Dynamic Electrical Flow Preview Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Layers className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Flujo de Arquitectura Eléctrica</h3>
                  <p className="text-xs text-slate-400">Interconexión punto a punto y niveles de tensión calculados</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('traceability')}
                  className="px-3 py-1 bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Workflow className="w-3.5 h-3.5" />
                  <span>Traceability Debug</span>
                </button>
                <button
                  onClick={() => onNavigate('diagram')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 hover:underline ml-1"
                >
                  <span>Ver Diagrama Unifilar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Topology Nodes with Motion */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Node 1: PV Generator */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => onNavigate('routes')}
                className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 relative cursor-pointer hover:border-amber-400 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <Sun className="w-5 h-5 text-amber-400" />
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">DC</span>
                </div>
                <h4 className="text-xs font-bold text-white uppercase">Generador PV</h4>
                <p className="text-[11px] font-mono text-slate-300 mt-1">{totalDcKwp} kWp Total</p>
                <div className="mt-2 text-[10px] text-slate-400 space-y-0.5 font-mono">
                  <div>Voc String: <strong className="text-amber-300">{dc.stringVocV.toFixed(1)}V</strong></div>
                  <div>Isc String: <strong className="text-amber-300">{dc.stringIscA.toFixed(1)}A</strong></div>
                </div>
              </motion.div>

              {/* Node 2: DC Protection & Box */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => onNavigate('routes')}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative cursor-pointer hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <Cable className="w-5 h-5 text-cyan-400" />
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">Conduit</span>
                </div>
                <h4 className="text-xs font-bold text-white uppercase">Canalización</h4>
                <p className="text-[11px] font-mono text-slate-300 mt-1">{routeResults.filter(r => r.type === 'DC').length} Rutas DC</p>
                <div className="mt-2 text-[10px] text-slate-400 space-y-0.5 font-mono">
                  <div>Tubería: <strong className="text-cyan-300">EMT / PVC</strong></div>
                  <div>Conductor: <strong className="text-cyan-300">THHW / PV</strong></div>
                </div>
              </motion.div>

              {/* Node 3: Inverter / ESS */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => onNavigate('report')}
                className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 relative cursor-pointer hover:border-emerald-400 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <Cpu className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">DC/AC</span>
                </div>
                <h4 className="text-xs font-bold text-white uppercase">Inversor / ESS</h4>
                <p className="text-[11px] font-mono text-slate-300 mt-1">{totalAcKw} kW Nominal</p>
                <div className="mt-2 text-[10px] text-slate-400 space-y-0.5 font-mono">
                  <div>I nominal AC: <strong className="text-emerald-300">{ac.totalAcCurrentA.toFixed(1)}A</strong></div>
                  <div>I con 1.25x: <strong className="text-emerald-300">{ac.maxAcCurrentWithContinuousFactorA.toFixed(1)}A</strong></div>
                </div>
              </motion.div>

              {/* Node 4: Grid Interconnection */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => onNavigate('routes')}
                className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 relative cursor-pointer hover:border-blue-400 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <Zap className="w-5 h-5 text-blue-400" />
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">AC</span>
                </div>
                <h4 className="text-xs font-bold text-white uppercase">Interconexión Red</h4>
                <p className="text-[11px] font-mono text-slate-300 mt-1">{ac.nominalAcVoltageV}V {ac.systemType}</p>
                <div className="mt-2 text-[10px] text-slate-400 space-y-0.5 font-mono">
                  <div>Tensión: <strong className="text-blue-300">{ac.nominalAcVoltageV} V</strong></div>
                  <div>Sistema: <strong className="text-blue-300">{ac.systemType}</strong></div>
                </div>
              </motion.div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Longitud Conduit</span>
                <strong className="text-slate-200">{totalConduitMeters.toFixed(1)} metros</strong>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Cable Unipolar Total</span>
                <strong className="text-slate-200">{totalConductorsMeters.toFixed(1)} metros</strong>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Batería / Almacenamiento</span>
                <strong className="text-slate-200">{model.battery?.enabled ? `${model.battery.capacityKwh} kWh` : 'No incluida'}</strong>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Trazabilidad BOM</span>
                <strong className="text-emerald-400">100% Justificado</strong>
              </div>
            </div>
          </div>

          {/* Quick Module Navigation Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Tile 1: Master Report */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('report')}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl shadow-lg cursor-pointer transition flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 transition">
                  <FileText className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
              </div>
              <div className="mt-4">
                <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition">Memoria Técnica (17 Secciones)</h4>
                <p className="text-xs text-slate-400 mt-1">Dossier de ingeniería completo listo para firma, aprobación y entrega al cliente.</p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>17 Capítulos normativos</span>
                <span className="text-amber-400 font-semibold">Abrir Documento →</span>
              </div>
            </motion.div>

            {/* Tile 2: Interactive Single-Line Diagram */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('diagram')}
              className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 p-5 rounded-2xl shadow-lg cursor-pointer transition flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition">
                  <Layers className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition" />
              </div>
              <div className="mt-4">
                <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition">Diagrama Unifilar Interactivo</h4>
                <p className="text-xs text-slate-400 mt-1">Esquema eléctrico interactivo con inspección de barras, interruptores y conductores.</p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Visualización SVG Dinámica</span>
                <span className="text-cyan-400 font-semibold">Explorar Diagrama →</span>
              </div>
            </motion.div>

            {/* Tile 3: Electrical Routes & Conduit Detail */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('routes')}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl shadow-lg cursor-pointer transition flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition">
                  <Zap className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
              </div>
              <div className="mt-4">
                <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition">Rutas Eléctricas & Conduit</h4>
                <p className="text-xs text-slate-400 mt-1">Cálculo de ampacidad, factores de agrupamiento, caída de tensión y relleno de tubería.</p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{routeResults.length} circuitos calculados</span>
                <span className="text-emerald-400 font-semibold">Ver Rutas →</span>
              </div>
            </motion.div>

            {/* Tile 4: Traceable BOM */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('bom')}
              className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-5 rounded-2xl shadow-lg cursor-pointer transition flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition">
                  <Table className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
              </div>
              <div className="mt-4">
                <h4 className="text-base font-bold text-white group-hover:text-blue-300 transition">BOM & Lista de Materiales</h4>
                <p className="text-xs text-slate-400 mt-1">Desglose de compras con cuantificación exacta, accesorios de tubería y justificación.</p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{bom.length} partidas clasificadas</span>
                <span className="text-blue-400 font-semibold">Consultar BOM →</span>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Right Column: Validation Audit & Real-time Gauges (1 Col on lg) */}
        <div className="space-y-6">
          
          {/* Regulatory Audit Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-5 h-5 ${allPassed ? 'text-emerald-400' : 'text-rose-400'}`} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Auditoría Normativa</h3>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono ${
                allPassed ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
              }`}>
                {passedCount}/{totalValidations} Pasadas
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Verificación automatizada contra estándares NOM-001-SEDE-2012 (Artículos 690, 705, 310, 250) y NEC 2023.
            </p>

            {/* Validation items checklist preview */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {validations.map((v) => (
                <div
                  key={v.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    v.passed
                      ? 'bg-slate-950/80 border-slate-800/80 text-slate-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {v.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{v.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{v.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('validations')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <span>Ver Checklist y Justificaciones Completas</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>

          {/* Quick Export & Actions Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-amber-400" />
              Exportación y Reportes
            </h3>

            <div className="space-y-2">
              <button
                onClick={onExportMarkdown}
                className="w-full py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copiar Informe en Markdown</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono group-hover:text-amber-300">17 Secciones</span>
              </button>

              <button
                onClick={onExportCSV}
                className="w-full py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Descargar BOM en CSV</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono group-hover:text-emerald-300">{bom.length} items</span>
              </button>
            </div>
          </div>

          {/* Quick Tip / Standards Reference */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Compass className="w-3.5 h-3.5" />
              <span>Criterio de Cálculo NOM/NEC</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Todos los cálculos de conductores consideran el factor 1.25x continuo, factores por temperatura ambiente y agrupamiento en ducto.
            </p>
          </div>

        </div>

      </div>
    </motion.div>
  );
};
