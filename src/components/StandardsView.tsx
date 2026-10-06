import React, { useState } from 'react';
import { BookOpen, Layers, ShieldCheck, Thermometer, Zap, Table } from 'lucide-react';
import { 
  CONDUCTOR_DATABASE, 
  CONDUIT_DATABASE, 
  STANDARD_OCPD_SIZES,
  getTemperatureCorrectionFactor,
  getGroupingCorrectionFactor
} from '../engine/standards';

export const StandardsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'conductors' | 'conduit' | 'factors' | 'ocpd'>('conductors');

  const tempRanges = [
    { label: '≤ 10 °C', factor90: getTemperatureCorrectionFactor(10, '90C'), factor75: getTemperatureCorrectionFactor(10, '75C') },
    { label: '11 - 15 °C', factor90: getTemperatureCorrectionFactor(15, '90C'), factor75: getTemperatureCorrectionFactor(15, '75C') },
    { label: '16 - 20 °C', factor90: getTemperatureCorrectionFactor(20, '90C'), factor75: getTemperatureCorrectionFactor(20, '75C') },
    { label: '21 - 25 °C', factor90: getTemperatureCorrectionFactor(25, '90C'), factor75: getTemperatureCorrectionFactor(25, '75C') },
    { label: '26 - 30 °C (Base)', factor90: getTemperatureCorrectionFactor(30, '90C'), factor75: getTemperatureCorrectionFactor(30, '75C') },
    { label: '31 - 35 °C', factor90: getTemperatureCorrectionFactor(35, '90C'), factor75: getTemperatureCorrectionFactor(35, '75C') },
    { label: '36 - 40 °C', factor90: getTemperatureCorrectionFactor(40, '90C'), factor75: getTemperatureCorrectionFactor(40, '75C') },
    { label: '41 - 45 °C', factor90: getTemperatureCorrectionFactor(45, '90C'), factor75: getTemperatureCorrectionFactor(45, '75C') },
    { label: '46 - 50 °C', factor90: getTemperatureCorrectionFactor(50, '90C'), factor75: getTemperatureCorrectionFactor(50, '75C') },
    { label: '51 - 55 °C', factor90: getTemperatureCorrectionFactor(55, '90C'), factor75: getTemperatureCorrectionFactor(55, '75C') },
    { label: '56 - 60 °C', factor90: getTemperatureCorrectionFactor(60, '90C'), factor75: getTemperatureCorrectionFactor(60, '75C') },
  ];

  const groupingRanges = [
    { label: '1 a 3 conductores', ccc: 3, factor: getGroupingCorrectionFactor(3) },
    { label: '4 a 6 conductores', ccc: 6, factor: getGroupingCorrectionFactor(6) },
    { label: '7 a 9 conductores', ccc: 9, factor: getGroupingCorrectionFactor(9) },
    { label: '10 a 20 conductores', ccc: 20, factor: getGroupingCorrectionFactor(20) },
    { label: '21 a 30 conductores', ccc: 30, factor: getGroupingCorrectionFactor(30) },
    { label: '31 a 40 conductores', ccc: 40, factor: getGroupingCorrectionFactor(40) },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Tablas Normativas de Referencia (NEC / NOM-001-SEDE)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Valores estandarizados de ampacidades a 75°C/90°C, dimensiones de canalizaciones y factores de ajuste térmico y por agrupamiento.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab('conductors')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'conductors' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              Conductores Cu/Al
            </button>
            <button
              onClick={() => setActiveTab('conduit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'conduit' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              Tuberías & Conduit
            </button>
            <button
              onClick={() => setActiveTab('factors')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'factors' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              Factores Ft / Fa
            </button>
            <button
              onClick={() => setActiveTab('ocpd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'ocpd' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              Protecciones OCPD
            </button>
          </div>
        </div>
      </div>

      {/* Conductors Table */}
      {activeTab === 'conductors' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                Conductores de Cobre y Aluminio — Ampacidades & Propiedades Físicas (NEC 310.16)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Base: 30°C / No más de 3 CCC</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Calibre</th>
                    <th className="p-3">Sección (mm²)</th>
                    <th className="p-3">D. Ext THHW (mm)</th>
                    <th className="p-3">Cu 60°C (A)</th>
                    <th className="p-3 text-cyan-300">Cu 75°C (A)</th>
                    <th className="p-3 text-emerald-400">Cu 90°C (A)</th>
                    <th className="p-3 text-purple-300">Al 90°C (A)</th>
                    <th className="p-3 text-right">R Cu PVC (Ω/km)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {CONDUCTOR_DATABASE.map((c) => (
                    <tr key={c.gauge} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{c.gauge}</td>
                      <td className="p-3">{c.areaMm2}</td>
                      <td className="p-3 text-slate-400">{c.outerDiameterMm['THHW-LS']} mm</td>
                      <td className="p-3 text-slate-500">{c.ampacityCu['60C']} A</td>
                      <td className="p-3 text-cyan-300 font-bold">{c.ampacityCu['75C']} A</td>
                      <td className="p-3 font-bold text-emerald-400">{c.ampacityCu['90C']} A</td>
                      <td className="p-3 text-purple-300">{c.ampacityAl['90C']} A</td>
                      <td className="p-3 text-right text-amber-400">{c.resistanceCuPVC}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conduit Table */}
      {activeTab === 'conduit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono">
              Dimensiones de Tubería / Conduit (NEC Chapter 9, Tables 4 & 5)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Comercial (Pulg.)</th>
                  <th className="p-3">Métrico (mm)</th>
                  <th className="p-3">Área Total EMT (mm²)</th>
                  <th className="p-3">Área Total PVC-40 (mm²)</th>
                  <th className="p-3 text-cyan-300">Capacidad 40% EMT (mm²)</th>
                  <th className="p-3 text-amber-300">Capacidad 31% EMT (mm²)</th>
                  <th className="p-3 text-emerald-300">Capacidad 53% EMT (mm²)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {CONDUIT_DATABASE.map((con, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white">{con.tradeSizeInch}</td>
                    <td className="p-3 text-purple-300 font-bold">{con.metricSizeMm}</td>
                    <td className="p-3">{con.totalAreaMm2.EMT}</td>
                    <td className="p-3 text-slate-400">{con.totalAreaMm2['PVC-40']}</td>
                    <td className="p-3 text-cyan-300 font-bold">{Math.round(con.totalAreaMm2.EMT * 0.40)}</td>
                    <td className="p-3 text-amber-300">{Math.round(con.totalAreaMm2.EMT * 0.31)}</td>
                    <td className="p-3 text-emerald-300">{Math.round(con.totalAreaMm2.EMT * 0.53)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Factors Table */}
      {activeTab === 'factors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          {/* Temperature Factors */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/80 border-b border-slate-800">
              <h3 className="font-bold text-amber-400 uppercase text-xs">
                Factor Corrección Temperatura (Ft) — Aislamiento 75°C / 90°C
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Rango Temp (°C)</th>
                    <th className="p-3 text-cyan-300">Ft 75°C</th>
                    <th className="p-3 text-right text-emerald-400">Ft 90°C</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {tempRanges.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="p-3">{f.label}</td>
                      <td className="p-3 text-cyan-300">{f.factor75.toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-amber-400">{f.factor90.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grouping Factors */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/80 border-b border-slate-800">
              <h3 className="font-bold text-cyan-400 uppercase text-xs">
                Factor de Agrupamiento (Fa) — Número de CCC
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">N° Conductores Portadores (CCC)</th>
                    <th className="p-3 text-right">Factor Fa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {groupingRanges.map((g, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="p-3">{g.label}</td>
                      <td className="p-3 text-right font-bold text-cyan-400">{g.factor.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* OCPD Standard Sizes */}
      {activeTab === 'ocpd' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
            Calibres Comerciales Normalizados de Protecciones OCPD (Art. 240.6)
          </h3>
          <p className="text-xs text-slate-400">
            Valores estándar en Amperes para interruptores termomagnéticos (ITM) y fusibles de potencia en baja tensión:
          </p>
          <div className="flex flex-wrap gap-2 font-mono">
            {STANDARD_OCPD_SIZES.map((amp) => (
              <span key={amp} className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white hover:border-amber-500 transition">
                {amp} A
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
