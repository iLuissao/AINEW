import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Workflow,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Scale,
  RotateCcw,
  GitCommit,
  Hash,
  Gauge,
  TrendingDown,
  Cpu,
  Flame,
  Snowflake,
  ShieldCheck,
  Target,
  Info
} from 'lucide-react';
import { InstallationModel, ProjectModelResult, RouteConfig } from '../engine/types';
import { calculateRoute } from '../engine/calculator';

interface TraceabilityDebugViewProps {
  model: InstallationModel;
  result: ProjectModelResult;
  onUpdateRouteLength?: (routeId: string, newLength: number) => void;
}

export const TraceabilityDebugView: React.FC<TraceabilityDebugViewProps> = ({
  model,
  result,
  onUpdateRouteLength
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    result.routeResults[0]?.routeId || model.routes[0]?.id || ''
  );
  
  // Interactive Live Variable Inspector (allows real-time mathematical simulation)
  const [simLength, setSimLength] = useState<number | null>(null);
  const [simTemp, setSimTemp] = useState<number | null>(null);
  const [simOperatingCurrent, setSimOperatingCurrent] = useState<number | null>(null);
  const [simVoltage, setSimVoltage] = useState<number | null>(null);

  // Active route configuration from the project
  const activeRoute = useMemo(() => {
    return model.routes.find((r) => r.id === selectedRouteId) || model.routes[0];
  }, [model.routes, selectedRouteId]);

  // Active calculated route result
  const activeCalc = useMemo(() => {
    return result.routeResults.find((r) => r.routeId === selectedRouteId) || result.routeResults[0];
  }, [result.routeResults, selectedRouteId]);

  // Real-time simulated route calculation with user override adjustments
  const simulatedRoute = useMemo(() => {
    if (!activeRoute) return null;
    const currentLength = simLength !== null ? simLength : activeRoute.lengthM;
    const currentTemp = simTemp !== null ? simTemp : activeRoute.ambientTempC;
    const currentOpCurrent = simOperatingCurrent !== null ? simOperatingCurrent : activeRoute.operatingCurrentA;
    const currentVolt = simVoltage !== null ? simVoltage : activeRoute.voltageV;

    const modifiedConfig: RouteConfig = {
      ...activeRoute,
      lengthM: currentLength,
      ambientTempC: currentTemp,
      operatingCurrentA: currentOpCurrent,
      voltageV: currentVolt,
    };

    return calculateRoute(modifiedConfig, model);
  }, [activeRoute, simLength, simTemp, simOperatingCurrent, simVoltage, model]);

  // Threshold distances for dynamic testing
  const threshold3PctM = activeCalc?.thresholdLengthFor3PercentM || 35.0;
  const testOverThresholdM = parseFloat((threshold3PctM * 1.35).toFixed(1));

  // Reset live overrides
  const handleResetSimulation = () => {
    setSimLength(null);
    setSimTemp(null);
    setSimOperatingCurrent(null);
    setSimVoltage(null);
  };

  const isSimulated = simLength !== null || simTemp !== null || simOperatingCurrent !== null || simVoltage !== null;

  // Comparison data for precision loss analysis
  const currentLenValue = simLength !== null ? simLength : (activeRoute?.lengthM || 0);
  const baselineLenValue = activeRoute?.lengthM || 0;
  const isLengthDiff = isSimulated && currentLenValue !== baselineLenValue;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Traceability Debug & Auditoría de Precisión
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                    PIPELINE DETERMINISTA
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Inspección matemática determinista: Corrientes por cadena individual vs troncal en paralelo, factores de corrección y umbral del 3% de caída de tensión.
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic 3% Threshold & Over-Threshold Simulation Tests */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-slate-400 mr-1 hidden sm:flex items-center gap-1 font-medium">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test de Umbral ΔV:</span>
            </div>
            <button
              onClick={() => {
                setSimLength(threshold3PctM);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition border ${
                simLength === threshold3PctM
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md'
                  : 'bg-slate-800/80 text-cyan-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={`Distancia exacta calculada donde la caída de tensión alcanza el 3.00% (${threshold3PctM} m)`}
            >
              Umbral 3.0% ΔV ({threshold3PctM} m)
            </button>
            <button
              onClick={() => {
                setSimLength(testOverThresholdM);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition border ${
                simLength === testOverThresholdM
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                  : 'bg-slate-800/80 text-amber-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={`Distancia que supera el umbral del 3% (${testOverThresholdM} m) para probar el recálculo y subida de calibre automática`}
            >
              Test Sobrepasar Umbral ({testOverThresholdM} m)
            </button>
            {isSimulated && (
              <button
                onClick={handleResetSimulation}
                className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 border border-slate-700 flex items-center gap-1 transition"
                title="Restablecer a la longitud nominal del proyecto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ({activeRoute?.lengthM || 0}m)</span>
              </button>
            )}
          </div>
        </div>

        {/* Route Tabs Selector */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {model.routes.map((r) => {
              const isSelected = r.id === selectedRouteId;
              const routeCalc = result.routeResults.find((res) => res.routeId === r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRouteId(r.id);
                    handleResetSimulation();
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-2 border ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${r.type === 'DC' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                  <span className="font-bold">{r.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({r.lengthM}m • {routeCalc?.selectedGauge || 'AWG'})</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="font-mono text-slate-500">Circuito activo:</span>
            <span className="text-white font-mono font-semibold">{activeRoute?.origin} → {activeRoute?.destination}</span>
          </div>
        </div>
      </div>

      {/* DC Amperage & Physics Integrity Notice */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Física de Amperaje en Corriente Directa (DC)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  NOM ART. 690-8
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                La corriente depende exclusivamente de la irradiación del módulo y las cadenas en paralelo ($I_{'{'}mp{'}'} \times N_{'{'}paralelo{'}'}$), siendo independiente de la distancia en metros.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Isc Módulo:</span>
              <span className="text-white font-bold">{model.pv.iscA || 14.25} A</span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Imp Módulo:</span>
              <span className="text-amber-400 font-bold">{model.pv.impA || 13.23} A</span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">I_diseño (1.56x):</span>
              <span className="text-emerald-400 font-bold">{((model.pv.iscA || 14.25) * 1.5625).toFixed(2)} A</span>
            </div>
          </div>
        </div>

        {/* Cold Temp & DC String Voltage Audit Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Voc Módulo (Unitario)</span>
            <div className="text-base font-mono font-bold text-amber-400 mt-1">{result.dc.unitVocV.toFixed(1)} V</div>
            <span className="text-[10px] text-slate-500 font-mono">Por módulo individual</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Vmp Módulo (Unitario)</span>
            <div className="text-base font-mono font-bold text-amber-400 mt-1">{result.dc.unitVmpV.toFixed(1)} V</div>
            <span className="text-[10px] text-slate-500 font-mono">Tensión óptima de trabajo</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Módulos / String</span>
            <div className="text-base font-mono font-bold text-white mt-1">{model.pv.modulesPerString} mods</div>
            <span className="text-[10px] text-slate-500 font-mono">{model.pv.numberOfStrings} string(s)</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Voc String (STC 25°C)</span>
            <div className="text-base font-mono font-bold text-cyan-300 mt-1">{result.dc.stringVocV.toFixed(1)} V</div>
            <span className="text-[10px] text-slate-500 font-mono">Tensión nominal de cadena</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-blue-500/30">
            <span className="text-[10px] font-mono text-blue-300 uppercase">Voc Frío ({model.ambientMinTempC ?? 5}°C)</span>
            <div className="text-base font-mono font-bold text-blue-300 mt-1">{result.dc.stringVocColdV.toFixed(1)} V</div>
            <span className="text-[10px] text-blue-400/80 font-mono">Factor Ft = {result.dc.coldTempCorrectionFactor}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30">
            <span className="text-[10px] font-mono text-emerald-300 uppercase">Margen Seguridad DC</span>
            <div className="text-base font-mono font-bold text-emerald-300 mt-1">
              +{(result.dc.invMaxDcVoltage - result.dc.stringVocColdV).toFixed(1)} V
            </div>
            <span className="text-[10px] text-emerald-400/80 font-mono">Holgura vs V_max_DC ({result.dc.invMaxDcVoltage}V)</span>
          </div>
        </div>
      </div>

      {/* Live Precision Differential Alert (if simulated or comparing) */}
      {isLengthDiff && activeCalc && simulatedRoute && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 mt-0.5">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                <span>Auditoría de Sensibilidad de Distancia:</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  {baselineLenValue}m → {currentLenValue}m ({currentLenValue > baselineLenValue ? `+${(currentLenValue - baselineLenValue).toFixed(1)}m` : `${(currentLenValue - baselineLenValue).toFixed(1)}m`})
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                La corriente operativa se mantiene constante en <strong className="text-white font-mono">{simulatedRoute.designCurrentA.toFixed(2)} A</strong>. La caída de tensión pasa de <strong className="text-white font-mono">{activeCalc.voltageDropPercent.toFixed(2)}%</strong> a <strong className="text-amber-300 font-mono">{simulatedRoute.voltageDropPercent.toFixed(2)}%</strong>.
                {simulatedRoute.selectedGauge !== activeCalc.selectedGauge ? (
                  <span className="text-amber-200 ml-1 font-bold">
                    ⚠️ El calibre cambia automáticamente de {activeCalc.selectedGauge} a {simulatedRoute.selectedGauge} para cumplir con la NOM-001 (ΔV ≤ 3%).
                  </span>
                ) : (
                  <span className="text-emerald-300 ml-1">
                    ✓ El calibre {activeCalc.selectedGauge} sigue siendo suficiente para mantener la caída por debajo del 3.0%.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onUpdateRouteLength && (
              <button
                onClick={() => onUpdateRouteLength(activeRoute.id, currentLenValue)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow cursor-pointer whitespace-nowrap"
              >
                Aplicar {currentLenValue}m al Proyecto
              </button>
            )}
            <button
              onClick={handleResetSimulation}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Grid: Parameters & Interactive Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Inspector Controls (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span>Simulador de Variables en Vivo</span>
              </h3>
              {isSimulated && (
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  SIMULANDO
                </span>
              )}
            </div>

            {/* Variable 1: Longitud (m) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Longitud de Ruta (L):</span>
                <span className="text-white font-bold">{currentLenValue} m</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="0.5"
                value={currentLenValue}
                onChange={(e) => setSimLength(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>1.0 m</span>
                <span className="text-cyan-400">Umbral 3%: {threshold3PctM} m</span>
                <span>100.0 m</span>
              </div>
            </div>

            {/* Variable 2: Temperatura Ambiente (°C) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Temp. Ambiente (Tamb):</span>
                <span className="text-white font-bold">{simTemp !== null ? simTemp : activeRoute?.ambientTempC}°C</span>
              </div>
              <input
                type="range"
                min="15"
                max="55"
                step="1"
                value={simTemp !== null ? simTemp : (activeRoute?.ambientTempC || 35)}
                onChange={(e) => setSimTemp(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>15 °C</span>
                <span>Base: {activeRoute?.ambientTempC}°C</span>
                <span>55 °C</span>
              </div>
            </div>

            {/* Variable 3: Corriente de Operación (A) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Corriente Operativa (I):</span>
                <span className="text-white font-bold">{simOperatingCurrent !== null ? simOperatingCurrent : activeRoute?.operatingCurrentA} A</span>
              </div>
              <input
                type="range"
                min="2"
                max="80"
                step="0.5"
                value={simOperatingCurrent !== null ? simOperatingCurrent : (activeRoute?.operatingCurrentA || 13.23)}
                onChange={(e) => setSimOperatingCurrent(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>2 A</span>
                <span>Nominal: {activeRoute?.operatingCurrentA} A</span>
                <span>80 A</span>
              </div>
            </div>

            {/* Reset Button */}
            {isSimulated && (
              <button
                onClick={handleResetSimulation}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Parámetros Nominales</span>
              </button>
            )}
          </div>

          {/* Trace Summary Box */}
          {activeCalc && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold uppercase">Resumen Eléctrico</span>
                <span className="text-cyan-400 font-bold">{activeCalc.selectedGauge} {activeRoute?.material}</span>
              </div>
              <div className="space-y-1.5 text-slate-300 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Corriente Diseño:</span>
                  <span className="font-bold text-white">{(simulatedRoute || activeCalc).designCurrentA.toFixed(2)} A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Factor Temp (Ft):</span>
                  <span className="font-bold text-white">{(simulatedRoute || activeCalc).tempCorrectionFactor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Factor Agrup. (Fa):</span>
                  <span className="font-bold text-white">{(simulatedRoute || activeCalc).groupingCorrectionFactor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ampacidad Corregida:</span>
                  <span className="font-bold text-emerald-400">{(simulatedRoute || activeCalc).correctedConductorAmpacityA.toFixed(1)} A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Caída de Tensión:</span>
                  <span className={`font-bold ${(simulatedRoute || activeCalc).voltageDropPercent <= 3.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(simulatedRoute || activeCalc).voltageDropPercent.toFixed(2)}% ({(simulatedRoute || activeCalc).voltageDropV.toFixed(2)} V)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Relleno Tubería:</span>
                  <span className="font-bold text-blue-400">{(simulatedRoute || activeCalc).actualConduitFillPercent.toFixed(1)}% ({(simulatedRoute || activeCalc).selectedConduitTradeSize})</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Step-by-Step Mathematical Calculation Trail (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-cyan-400" />
                  <span>Cadena de Cálculo Determinista (Pass-by-Pass Trace)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Auditoría completa de fórmulas y selección normativa según NOM-001-SEDE-2012 / NEC 2023.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {(simulatedRoute || activeCalc)?.trace.steps.length || 0} Pasos Ejecutados
              </span>
            </div>

            {/* Equations Highlight */}
            {(simulatedRoute || activeCalc) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1">
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Fórmula de Corriente</div>
                  <div className="text-amber-300 font-semibold">{(simulatedRoute || activeCalc)?.trace.currentEquation}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1">
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Fórmula de Desclasificación</div>
                  <div className="text-cyan-300 font-semibold">{(simulatedRoute || activeCalc)?.trace.deratingEquation}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1">
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Fórmula de Caída de Tensión</div>
                  <div className="text-emerald-300 font-semibold">{(simulatedRoute || activeCalc)?.trace.voltageDropEquation}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1">
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Fórmula de Relleno Conduit</div>
                  <div className="text-blue-300 font-semibold">{(simulatedRoute || activeCalc)?.trace.conduitFillEquation}</div>
                </div>
              </div>
            )}

            {/* Step-by-Step Log */}
            <div className="space-y-2 mt-3">
              {(simulatedRoute || activeCalc)?.trace.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-start space-x-3 text-xs font-mono hover:border-slate-700 transition"
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="text-slate-300 leading-relaxed">
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
