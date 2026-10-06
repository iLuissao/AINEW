import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sun, 
  Zap, 
  Layers, 
  Cpu, 
  FileText, 
  Activity, 
  CheckCircle2, 
  Sliders, 
  TrendingDown, 
  ArrowRight,
  ShieldCheck,
  Download,
  Printer,
  FileCode,
  Table
} from 'lucide-react';
import { ProjectModelResult, InstallationModel } from '../engine/types';
import { StructuredUnifilarEngineView } from './StructuredUnifilarEngineView';
import { AnsiExecutiveBlueprint } from './AnsiExecutiveBlueprint';

interface UnifilarDashboardWorkspaceProps {
  result: ProjectModelResult;
  model: InstallationModel;
  onUpdateRouteLength: (routeId: string, newLength: number) => void;
  onNavigateToMemoria: () => void;
  onNavigateToEditor: () => void;
  onOpenOCR: () => void;
}

export const UnifilarDashboardWorkspace: React.FC<UnifilarDashboardWorkspaceProps> = ({
  result,
  model,
  onUpdateRouteLength,
  onNavigateToMemoria,
  onNavigateToEditor,
  onOpenOCR,
}) => {
  const { dc, ac, routeResults, bom, validations } = result;
  const [diagramMode, setDiagramMode] = useState<'structured' | 'ansi_executive'>('structured');

  const totalDcKwp = (dc.totalPowerW / 1000).toFixed(2);
  const totalAcKw = ac.totalAcPowerKw.toFixed(1);
  const dcAcRatio = (dc.totalPowerW / (ac.totalAcPowerKw * 1000 || 1)).toFixed(2);
  
  const maxVoltageDrop = routeResults.length > 0 
    ? Math.max(...routeResults.map(r => r.voltageDropPercent)) 
    : 0;

  const passedCount = validations.filter(v => v.passed).length;
  const totalValidations = validations.length;

  return (
    <div className="space-y-6">
      {/* 1. Quick Engineering Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Potencia DC */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Potencia DC</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-white font-mono">
              {totalDcKwp} <span className="text-xs text-amber-400">kWp</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {model.pv.totalModules}x {model.pv.powerW}W ({model.pv.numberOfStrings} strings)
            </p>
          </div>
        </div>

        {/* Potencia AC */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Potencia Nominal AC (Inversor)</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-white font-mono">
              {totalAcKw} <span className="text-xs text-cyan-400">kW AC</span>
            </div>
            <p className="text-[11px] text-cyan-400 font-medium mt-0.5">
              {model.inverter.model || 'Inversor'} • {ac.nominalAcVoltageV}V ({model.inverter.systemType})
            </p>
          </div>
        </div>

        {/* Caída de Tensión Máxima */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Caída Máxima</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-white font-mono">
              {maxVoltageDrop.toFixed(2)}%
            </div>
            <p className="text-[11px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Límite ≤ 3.0% NOM
            </p>
          </div>
        </div>

        {/* Sobredimensionamiento DC/AC */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Relación DC/AC</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-white font-mono">
              {dcAcRatio} <span className="text-xs text-purple-400">x</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Factor de carga nominal
            </p>
          </div>
        </div>

        {/* Lista de Materiales / Partidas BOM */}
        <div 
          onClick={onNavigateToMemoria}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 shadow-lg flex flex-col justify-between cursor-pointer transition group col-span-2 sm:col-span-4 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">BOM Cuantificado</span>
            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {bom.length} <span className="text-xs text-slate-400 font-normal">partidas</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ver Memoria y Lista →
            </p>
          </div>
        </div>
      </div>

      {/* 2. Workspace Sub-Header: Diagram Mode Switcher (Material Design 3 Segmented Buttons) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Esquemas Unifilares del Proyecto Activo
            </h3>
            <p className="text-[10px] text-slate-400">
              NOM-001-SEDE-2012 Art. 690 / 705 • Cálculos AC basados en la potencia nominal del inversor
            </p>
          </div>
        </div>

        {/* Material 3 Segmented Pill Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 self-start sm:self-auto">
          <button
            onClick={() => setDiagramMode('structured')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              diagramMode === 'structured'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Unifilar Estructural (Interactivo)</span>
          </button>
          <button
            onClick={() => setDiagramMode('ansi_executive')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              diagramMode === 'ansi_executive'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Plano ANSI / CFE Oficial</span>
          </button>
        </div>
      </div>

      {/* 3. Render Active Mode */}
      {diagramMode === 'structured' && (
        <StructuredUnifilarEngineView
          result={result}
          model={model}
          onUpdateRouteLength={onUpdateRouteLength}
        />
      )}

      {diagramMode === 'ansi_executive' && (
        <AnsiExecutiveBlueprint
          result={result}
        />
      )}
    </div>
  );
};
