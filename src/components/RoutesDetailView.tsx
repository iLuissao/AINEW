import React, { useState } from 'react';
import { 
  Zap, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Percent, 
  Layers, 
  Compass, 
  Maximize2,
  Thermometer,
  Sliders
} from 'lucide-react';
import { InstallationModel, ProjectModelResult, RouteCalculations } from '../engine/types';

interface RoutesDetailViewProps {
  result: ProjectModelResult;
  model: InstallationModel;
  onUpdateRouteLength?: (routeId: string, newLength: number) => void;
}

export const RoutesDetailView: React.FC<RoutesDetailViewProps> = ({
  result,
  model,
  onUpdateRouteLength,
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    result.routeResults.length > 0 ? result.routeResults[0].routeId : ''
  );

  const selectedRoute = result.routeResults.find((r) => r.routeId === selectedRouteId) || result.routeResults[0];
  const routeConfig = model.routes.find((r) => r.id === selectedRoute?.routeId);

  if (!selectedRoute || !routeConfig) {
    return <div className="p-8 text-center text-slate-500">No hay rutas configuradas.</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Route List Selector */}
      <div className="lg:col-span-1 space-y-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Rutas Eléctricas ({result.routeResults.length})</span>
            <span className="text-[10px] font-mono text-amber-400">AC & DC</span>
          </h3>

          <div className="space-y-2">
            {result.routeResults.map((r) => {
              const cfg = model.routes.find((rt) => rt.id === r.routeId)!;
              const isSelected = r.routeId === selectedRoute.routeId;
              return (
                <button
                  key={r.routeId}
                  onClick={() => setSelectedRouteId(r.routeId)}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        r.type === 'DC' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {r.type}
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-[170px]">
                        {r.routeName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
                      <span>{cfg.lengthM}m</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">{r.selectedGauge}</span>
                      <span>•</span>
                      <span className={r.voltageDropCompliance ? 'text-slate-400' : 'text-rose-400 font-bold'}>
                        ΔV {r.voltageDropPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Route Deep-Dive Panel */}
      <div className="lg:col-span-2 space-y-6">
        {/* Top Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                  selectedRoute.type === 'DC' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  Circuito {selectedRoute.type}
                </span>
                <span className="text-xs text-slate-500 font-mono">ID: {selectedRoute.routeId}</span>
              </div>
              <h2 className="text-lg font-bold text-white">{selectedRoute.routeName}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {routeConfig.origin} ──► {routeConfig.destination}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 border ${
                selectedRoute.voltageDropCompliance && selectedRoute.ampacityCompliance
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
              }`}>
                {selectedRoute.voltageDropCompliance && selectedRoute.ampacityCompliance ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Conforme NEC/NOM</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>No Conforme</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Quick interactive length slider */}
          {onUpdateRouteLength && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Simular Longitud de Ruta:</span>
              </div>
              <div className="flex items-center space-x-3 flex-1 max-w-xs">
                <input
                  type="range"
                  min="1"
                  max="120"
                  step="1"
                  className="w-full accent-amber-500 cursor-pointer"
                  value={routeConfig.lengthM}
                  onChange={(e) => onUpdateRouteLength(selectedRoute.routeId, parseFloat(e.target.value))}
                />
                <span className="font-mono text-xs font-bold text-amber-400 w-12 text-right">
                  {routeConfig.lengthM} m
                </span>
              </div>
            </div>
          )}

          {/* Key Electrical Dimensioning Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Corriente Diseño</span>
              <span className="text-base font-bold font-mono text-white">{selectedRoute.designCurrentA.toFixed(2)} A</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{selectedRoute.currentBasis}</span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Factores Ft × Fa</span>
              <span className="text-base font-bold font-mono text-amber-400">{selectedRoute.totalDeratingFactor.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Ft: {selectedRoute.tempCorrectionFactor.toFixed(2)} | Fa: {selectedRoute.groupingCorrectionFactor.toFixed(2)}</span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Calibre Seleccionado</span>
              <span className="text-base font-bold font-mono text-emerald-400">{selectedRoute.selectedGauge}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Amp Corr: {selectedRoute.correctedConductorAmpacityA.toFixed(1)} A</span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Caída de Tensión</span>
              <span className={`text-base font-bold font-mono ${selectedRoute.voltageDropCompliance ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedRoute.voltageDropPercent.toFixed(2)} %
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">ΔV = {selectedRoute.voltageDropV.toFixed(2)} V (≤ 3.0%)</span>
            </div>
          </div>
        </div>

        {/* Physical Conductors and CCC Separation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
            <span>Identificación de Conductores Físicos vs. CCC</span>
            <span className="text-cyan-400 font-mono text-[11px]">
              {selectedRoute.physicalCount} Conductores Físicos • {selectedRoute.cccCount} CCC
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {selectedRoute.physicalConductors.map((cond, idx) => (
              <div key={idx} className={`p-3 rounded-xl border flex items-center space-x-3 ${
                cond.isCCC ? 'bg-slate-950 border-slate-800' : 'bg-emerald-950/20 border-emerald-800/40'
              }`}>
                <div className={`h-4 w-4 rounded-full border ${
                  cond.color.includes('Rojo') ? 'bg-red-600 border-red-400' :
                  cond.color.includes('Negro') ? 'bg-slate-900 border-slate-500' :
                  cond.color.includes('Azul') ? 'bg-blue-600 border-blue-400' :
                  cond.color.includes('Blanco') ? 'bg-slate-100 border-slate-300' :
                  'bg-emerald-500 border-emerald-300'
                }`} />
                <div className="text-xs font-mono">
                  <div className="font-bold text-white">{cond.name}</div>
                  <div className="text-[10px] text-slate-400">
                    Rol: <strong className="text-slate-200">{cond.role}</strong> • {cond.isCCC ? <span className="text-cyan-300 font-bold">CCC (Portador)</span> : <span className="text-emerald-300">PE (No CCC)</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conduit Sizing and Fill Factor Visualizer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Canalización & Factor de Relleno (Art. Chap 9)
            </h3>
            <span className="text-xs font-mono font-bold text-purple-400">
              {routeConfig.conduitType} {selectedRoute.selectedConduitTradeSize} ({selectedRoute.selectedConduitMetricMm} mm)
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-slate-300">
              <span>Ocupación de Conductores: <strong>{selectedRoute.totalConductorsAreaMm2.toFixed(1)} mm²</strong></span>
              <span>Área Total Tubo: <strong>{selectedRoute.conduitTotalAreaMm2} mm²</strong></span>
              <span className={`font-bold ${selectedRoute.conduitFillCompliance ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedRoute.actualConduitFillPercent.toFixed(1)}% / Límite {selectedRoute.maxFillPercentAllowed}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden border border-slate-800 relative">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  selectedRoute.conduitFillCompliance ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, selectedRoute.actualConduitFillPercent)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 border-r-2 border-amber-400 border-dashed"
                style={{ left: `${selectedRoute.maxFillPercentAllowed}%` }}
                title={`Límite normativo: ${selectedRoute.maxFillPercentAllowed}%`}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              * El factor de relleno máximo permitido según la cantidad de conductores ({selectedRoute.physicalCount}) es de <strong>{selectedRoute.maxFillPercentAllowed}%</strong>.
            </p>
          </div>
        </div>

        {/* Derived Accessories List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
            <span>Accesorios Derivados de la Geometría ({selectedRoute.derivedAccessories.length})</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Curvas: {routeConfig.geometry.bends90}x 90°, {routeConfig.geometry.bends45}x 45°
            </span>
          </h3>

          <div className="space-y-2">
            {selectedRoute.derivedAccessories.map((acc) => (
              <div key={acc.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <strong className="text-white block">{acc.item}</strong>
                  <span className="text-slate-400 text-[11px] font-mono">{acc.spec} • {acc.reason}</span>
                </div>
                <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  {acc.qty} {acc.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mathematical Step-by-Step Trace */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            Trazabilidad Matemática del Cálculo
          </h3>
          <div className="space-y-1.5 font-mono text-[11px] text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-60 overflow-y-auto">
            {selectedRoute.trace.steps.map((step, sIdx) => (
              <div key={sIdx} className="text-slate-300">
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
