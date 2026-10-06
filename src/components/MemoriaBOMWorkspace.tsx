import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Table, 
  Zap, 
  Download, 
  Printer, 
  Search, 
  CheckCircle2, 
  ShieldCheck, 
  Copy,
  Layers,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Workflow,
  Sparkles,
  GitCommit,
  Cpu
} from 'lucide-react';
import { ProjectModelResult, InstallationModel } from '../engine/types';
import { MasterReportView } from './MasterReportView';
import { BOMView } from './BOMView';
import { RoutesDetailView } from './RoutesDetailView';
import { TraceabilityDebugView } from './TraceabilityDebugView';

interface MemoriaBOMWorkspaceProps {
  result: ProjectModelResult;
  model: InstallationModel;
  onExportMarkdown: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onUpdateRouteLength?: (routeId: string, newLength: number) => void;
}

export const MemoriaBOMWorkspace: React.FC<MemoriaBOMWorkspaceProps> = ({
  result,
  model,
  onExportMarkdown,
  onExportCSV,
  onPrint,
  onUpdateRouteLength,
}) => {
  const [subTab, setSubTab] = useState<'report' | 'bom' | 'routes'>('report');
  const [isTraceabilityOpen, setIsTraceabilityOpen] = useState<boolean>(false);

  return (
    <div className="space-y-6">
      {/* Workspace Sub-Header & Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Documentación Técnica & Lista de Materiales
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Memoria técnica de cálculo oficial, cuantificación de materiales (BOM) y dimensionamiento de canalizaciones.
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 self-start sm:self-auto">
          <button
            onClick={() => setSubTab('report')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'report'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Memoria (17 Sec.)</span>
          </button>
          <button
            onClick={() => setSubTab('bom')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'bom'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>2. BOM Trazable ({result.bom.length})</span>
          </button>
          <button
            onClick={() => setSubTab('routes')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'routes'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>3. Rutas & Tuberías</span>
          </button>
        </div>
      </div>

      {/* Render selected view */}
      {subTab === 'report' && (
        <MasterReportView 
          result={result} 
          onCopyMarkdown={onExportMarkdown} 
        />
      )}

      {subTab === 'bom' && (
        <BOMView 
          result={result} 
          onExportCSV={onExportCSV} 
          onPrint={onPrint} 
        />
      )}

      {subTab === 'routes' && (
        <RoutesDetailView 
          result={result} 
          model={model} 
          onUpdateRouteLength={onUpdateRouteLength} 
        />
      )}

      {/* Desplegable de Depuración de Trazabilidad Técnica */}
      <div className="border border-slate-800 bg-slate-900/90 rounded-2xl overflow-hidden shadow-xl transition">
        <button
          onClick={() => setIsTraceabilityOpen(!isTraceabilityOpen)}
          className="w-full px-5 py-4 flex items-center justify-between bg-slate-900 hover:bg-slate-850 transition cursor-pointer text-left"
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl transition ${
              isTraceabilityOpen 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <Workflow className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Depuración de Trazabilidad Técnica & Auditoría de Fórmulas
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  NOM-001 / NEC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isTraceabilityOpen
                  ? 'Ocultar panel de auditoría de paso a paso, ecuaciones de desclasificación y variables de cálculo.'
                  : 'Desplegar panel para auditar la cadena de cálculo matemática, factores Ft/Fa y trazabilidad por tramo.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold">
            <span className={isTraceabilityOpen ? 'text-cyan-400' : 'text-slate-400'}>
              {isTraceabilityOpen ? 'Ocultar' : 'Desplegar Trazabilidad'}
            </span>
            <div className={`p-1 rounded-lg ${isTraceabilityOpen ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
              {isTraceabilityOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {/* Expandable Content Panel */}
        <AnimatePresence>
          {isTraceabilityOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="border-t border-slate-800 p-5 bg-slate-950/60"
            >
              <TraceabilityDebugView
                model={model}
                result={result}
                onUpdateRouteLength={onUpdateRouteLength}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
