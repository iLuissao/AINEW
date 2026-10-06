import React, { useState } from 'react';
import { Sun, Zap, BatteryCharging, Shield, Grid, ArrowRight, Info, CheckCircle2, AlertCircle, Layers, FileText, Cpu } from 'lucide-react';
import { ProjectModelResult, RouteCalculations } from '../engine/types';
import { AnsiExecutiveBlueprint } from './AnsiExecutiveBlueprint';
import { EdlStudio } from './EdlStudio';

interface UnifilarDiagramProps {
  result: ProjectModelResult;
  onSelectRoute?: (routeId: string) => void;
}

export const UnifilarDiagram: React.FC<UnifilarDiagramProps> = ({ result, onSelectRoute }) => {
  const { model, dc, ac, routeResults } = result;
  const [diagramMode, setDiagramMode] = useState<'ansi_executive' | 'edl_studio' | 'interactive'>('ansi_executive');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(
    routeResults.length > 0 ? routeResults[0].routeId : null
  );

  const selectedRoute = routeResults.find((r) => r.routeId === selectedRouteId) || routeResults[0];

  const dcRoutes = routeResults.filter((r) => r.type === 'DC');
  const acRoutes = routeResults.filter((r) => r.type === 'AC');

  const getRouteLength = (routeId: string) => {
    return model.routes.find((r) => r.id === routeId)?.lengthM || 0;
  };

  return (
    <div className="space-y-6">
      {/* View Mode Switcher Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Diagrama Unifilar Eléctrico (ANSI / IEEE & NOM-001)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visualización técnica en plano ejecutivo, compilador EDL (DSL determinista) o diagrama interactivo dinámico.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto gap-1">
          <button
            onClick={() => setDiagramMode('ansi_executive')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              diagramMode === 'ansi_executive'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Plano ANSI / IEEE (CFE)</span>
          </button>
          <button
            onClick={() => setDiagramMode('edl_studio')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              diagramMode === 'edl_studio'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Compilador EDL / DSL</span>
          </button>
          <button
            onClick={() => setDiagramMode('interactive')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              diagramMode === 'interactive'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Diagrama Interactivo</span>
          </button>
        </div>
      </div>

      {/* Render Mode 1: ANSI Executive Blueprint */}
      {diagramMode === 'ansi_executive' && (
        <AnsiExecutiveBlueprint result={result} onSelectRoute={onSelectRoute} />
      )}

      {/* Render Mode 2: EDL Studio Compilador */}
      {diagramMode === 'edl_studio' && (
        <EdlStudio
          initialServiceOrder={{
            clientName: model.clientName || 'ABARROTES CASCA',
            projectName: model.projectName,
            location: model.location,
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
            dcRouteLengthM: model.routes.find((r) => r.type === 'DC')?.lengthM || 25,
            acRouteLengthM: model.routes.find((r) => r.type === 'AC')?.lengthM || 3,
            hasBattery: model.battery?.enabled,
            batteryCapacityKwh: model.battery?.capacityKwh,
          }}
        />
      )}

      {/* Render Mode 2: Interactive Cards Topology */}
      {diagramMode === 'interactive' && (
        <>
          {/* Top Banner / Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Topología Paramétrica de Bloques Interactivos
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Haz clic en cualquier bloque o ruta para auditar los conductores, caídas de tensión y relleno de tubería en tiempo real.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <div className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-slate-300">
                  <span className="text-slate-500">P_DC:</span> <strong className="text-amber-400">{(dc.totalPowerW / 1000).toFixed(2)} kWp</strong>
                </div>
                <div className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-slate-300">
                  <span className="text-slate-500">P_AC:</span> <strong className="text-emerald-400">{ac.totalAcPowerKw.toFixed(1)} kW</strong>
                </div>
                <div className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-slate-300">
                  <span className="text-slate-500">V_AC:</span> <strong className="text-blue-400">{ac.nominalAcVoltageV} V</strong> ({ac.systemType})
                </div>
              </div>
            </div>
          </div>

      {/* Main Visual Schema Canvas */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 overflow-x-auto shadow-inner">
        <div className="min-w-[960px] flex items-center justify-between gap-4 relative py-6">
          {/* Node 1: PV Array */}
          <div className="w-56 bg-slate-900 border-2 border-amber-500/40 rounded-xl p-4 shadow-lg relative group hover:border-amber-400 transition">
            <div className="absolute -top-3 left-4 bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shadow">
              Generador FV
            </div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white truncate">{model.pv.manufacturer}</h4>
                <p className="text-[11px] text-slate-400 truncate">{model.pv.model}</p>
              </div>
            </div>
            <div className="space-y-1 text-[11px] font-mono border-t border-slate-800 pt-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Módulos:</span>
                <strong>{model.pv.totalModules || model.pv.modulesPerString * model.pv.numberOfStrings}x {model.pv.powerW}W</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Config:</span>
                <strong className="text-amber-300">{model.pv.numberOfStrings}S × {model.pv.modulesPerString}M</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Voc String:</span>
                <strong>{dc.stringVocV.toFixed(1)} V</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Isc String:</span>
                <strong>{dc.stringIscA.toFixed(2)} A</strong>
              </div>
            </div>
          </div>

          {/* Connection Line & Route Badge (DC) */}
          <div className="flex-1 flex flex-col items-center justify-center relative px-2">
            {dcRoutes.length > 0 && (
              <button
                onClick={() => {
                  setSelectedRouteId(dcRoutes[0].routeId);
                  if (onSelectRoute) onSelectRoute(dcRoutes[0].routeId);
                }}
                className={`w-full max-w-[190px] text-center p-2.5 rounded-xl border transition shadow-sm ${
                  selectedRouteId === dcRoutes[0].routeId
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3" /> Ruta DC ({getRouteLength(dcRoutes[0].routeId)}m)
                </div>
                <div className="text-xs font-mono font-bold mt-0.5">
                  {dcRoutes[0].selectedGauge} Cu
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 mt-0.5">
                  <span>Tub. {dcRoutes[0].selectedConduitTradeSize}</span>
                  <span>•</span>
                  <span className={dcRoutes[0].voltageDropCompliance ? 'text-emerald-400' : 'text-rose-400'}>
                    ΔV {dcRoutes[0].voltageDropPercent.toFixed(2)}%
                  </span>
                </div>
              </button>
            )}
            <div className="w-full h-0.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 my-2 relative">
              <ArrowRight className="w-4 h-4 text-amber-400 absolute -top-2 right-0" />
            </div>
            <span className="text-[9px] font-mono text-slate-500">
              {model.inverter.architecture === 'microinverter' ? 'DC-2W a Microinv.' : 'Fusibles gPV + SPD DC'}
            </span>
          </div>

          {/* Node 2: Inverters / Power Conversion */}
          <div className="w-60 bg-slate-900 border-2 border-cyan-500/40 rounded-xl p-4 shadow-lg relative group hover:border-cyan-400 transition">
            <div className="absolute -top-3 left-4 bg-cyan-500 text-slate-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shadow">
              Inversor(es) AC
            </div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white truncate">{model.inverter.manufacturer}</h4>
                <p className="text-[11px] text-slate-400 truncate">{model.inverter.model}</p>
              </div>
            </div>
            <div className="space-y-1 text-[11px] font-mono border-t border-slate-800 pt-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo:</span>
                <strong className="text-cyan-300 uppercase">{model.inverter.architecture}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Capacidad:</span>
                <strong>{model.inverter.numberOfUnits || 1}x {model.inverter.ratedPowerKw} kW</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Salida AC:</span>
                <strong>{model.inverter.nominalAcVoltageV} V ({ac.systemType})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">I_max AC:</span>
                <strong className="text-emerald-400">{model.inverter.maxOutputCurrentA} A</strong>
              </div>
            </div>
          </div>

          {/* Node 2.5: Battery ESS (If enabled) */}
          {model.battery.enabled && (
            <div className="flex-1 flex flex-col items-center justify-center relative px-2">
              <div className="w-48 bg-slate-900 border border-purple-500/40 rounded-xl p-3 shadow-lg mb-2">
                <div className="flex items-center space-x-2 mb-1">
                  <BatteryCharging className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-300">ESS Batería</span>
                </div>
                <div className="text-[10px] font-mono text-slate-300 space-y-0.5">
                  <div>Cap: <strong>{model.battery.capacityKwh} kWh</strong> ({model.battery.nominalVoltageV}V)</div>
                  <div>I_desc: <strong>{model.battery.maxContinuousDischargeCurrentA} A</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Connection Line & Route Badge (AC) */}
          <div className="flex-1 flex flex-col items-center justify-center relative px-2">
            {acRoutes.length > 0 && (
              <button
                onClick={() => {
                  setSelectedRouteId(acRoutes[0].routeId);
                  if (onSelectRoute) onSelectRoute(acRoutes[0].routeId);
                }}
                className={`w-full max-w-[190px] text-center p-2.5 rounded-xl border transition shadow-sm ${
                  selectedRouteId === acRoutes[0].routeId
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" /> Ruta AC ({getRouteLength(acRoutes[0].routeId)}m)
                </div>
                <div className="text-xs font-mono font-bold mt-0.5">
                  {acRoutes[0].selectedGauge} Cu
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 mt-0.5">
                  <span>Tub. {acRoutes[0].selectedConduitTradeSize}</span>
                  <span>•</span>
                  <span className={acRoutes[0].voltageDropCompliance ? 'text-emerald-400' : 'text-rose-400'}>
                    ΔV {acRoutes[0].voltageDropPercent.toFixed(2)}%
                  </span>
                </div>
              </button>
            )}
            <div className="w-full h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 my-2 relative">
              <ArrowRight className="w-4 h-4 text-emerald-400 absolute -top-2 right-0" />
            </div>
            <span className="text-[9px] font-mono text-slate-500">
              ITM AC + SPD AC Tipo 2
            </span>
          </div>

          {/* Node 3: AC Main Panel & Grid */}
          <div className="w-56 bg-slate-900 border-2 border-emerald-500/40 rounded-xl p-4 shadow-lg relative group hover:border-emerald-400 transition">
            <div className="absolute -top-3 left-4 bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shadow">
              Tablero AC / Red
            </div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Grid className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white truncate">Centro de Carga</h4>
                <p className="text-[11px] text-slate-400 truncate">Punto de Interconexión</p>
              </div>
            </div>
            <div className="space-y-1 text-[11px] font-mono border-t border-slate-800 pt-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Tensión:</span>
                <strong>{ac.nominalAcVoltageV} V</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sistema:</span>
                <strong className="text-emerald-300">{ac.systemType}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">I_diseño:</span>
                <strong>{ac.maxAcCurrentWithContinuousFactorA.toFixed(1)} A (1.25x)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Protección:</span>
                <strong className="text-amber-300">ITM AC {Math.ceil(ac.maxAcCurrentWithContinuousFactorA)} A</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Route Inspector Card */}
      {selectedRoute && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${selectedRoute.type === 'DC' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Detalle de Ruta Seleccionada: {selectedRoute.routeName}</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                    ID: {selectedRoute.routeId}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedRoute.currentBasis}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                selectedRoute.voltageDropCompliance && selectedRoute.ampacityCompliance
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {selectedRoute.voltageDropCompliance && selectedRoute.ampacityCompliance ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Conforme a Norma</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Ajuste Requerido</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Corriente Diseño</span>
              <span className="text-sm font-bold font-mono text-white">{selectedRoute.designCurrentA.toFixed(2)} A</span>
              <span className="text-[10px] text-slate-500 block">I_base req: {selectedRoute.requiredBaseAmpacityA.toFixed(1)} A</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Conductores & CCC</span>
              <span className="text-sm font-bold font-mono text-cyan-400">{selectedRoute.physicalCount} Físicos / {selectedRoute.cccCount} CCC</span>
              <span className="text-[10px] text-slate-500 block">PE Excluido de CCC</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Factores Ft × Fa</span>
              <span className="text-sm font-bold font-mono text-amber-400">{selectedRoute.totalDeratingFactor.toFixed(2)}</span>
              <span className="text-[10px] text-slate-500 block">Ft: {selectedRoute.tempCorrectionFactor.toFixed(2)} | Fa: {selectedRoute.groupingCorrectionFactor.toFixed(2)}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Calibre Seleccionado</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{selectedRoute.selectedGauge}</span>
              <span className="text-[10px] text-slate-500 block">Amp Corr: {selectedRoute.correctedConductorAmpacityA.toFixed(1)} A</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Caída de Tensión</span>
              <span className={`text-sm font-bold font-mono ${selectedRoute.voltageDropCompliance ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedRoute.voltageDropPercent.toFixed(2)} %
              </span>
              <span className="text-[10px] text-slate-500 block">ΔV = {selectedRoute.voltageDropV.toFixed(2)} V (≤ 3.0%)</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Canalización & Relleno</span>
              <span className="text-sm font-bold font-mono text-purple-400">{selectedRoute.selectedConduitTradeSize}</span>
              <span className="text-[10px] text-slate-500 block">Ocupación: {selectedRoute.actualConduitFillPercent.toFixed(1)}% / {selectedRoute.maxFillPercentAllowed}%</span>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
