import React, { useState } from 'react';
import { 
  FileText, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  Table, 
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ProjectModelResult } from '../engine/types';
import { generateMasterReportMarkdown } from '../engine/reportGenerator';

interface MasterReportViewProps {
  result: ProjectModelResult;
  onCopyMarkdown: () => void;
}

export const MasterReportView: React.FC<MasterReportViewProps> = ({ result, onCopyMarkdown }) => {
  const { model, dc, ac, routeResults, bom, validations, missingDataList, errors } = result;
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('sec-1');

  const handleCopy = () => {
    const md = generateMasterReportMarkdown(result);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopyMarkdown();
  };

  const sections = [
    { id: 'sec-1', number: '1', title: 'Resumen de la Instalación' },
    { id: 'sec-2', number: '2', title: 'Arquitectura' },
    { id: 'sec-3', number: '3', title: 'Modelo DC' },
    { id: 'sec-4', number: '4', title: 'Modelo AC' },
    { id: 'sec-5', number: '5', title: 'Tabla de Rutas' },
    { id: 'sec-6', number: '6', title: 'Cálculo de Corrientes' },
    { id: 'sec-7', number: '7', title: 'CCC (Conductores Portadores)' },
    { id: 'sec-8', number: '8', title: 'Ampacidad y Factores de Corrección' },
    { id: 'sec-9', number: '9', title: 'Selección de Conductores' },
    { id: 'sec-10', number: '10', title: 'Caída de Tensión (≤ 3.0%)' },
    { id: 'sec-11', number: '11', title: 'Selección de Tubería / Conduit' },
    { id: 'sec-12', number: '12', title: 'Factor de Relleno' },
    { id: 'sec-13', number: '13', title: 'Accesorios Geométricos' },
    { id: 'sec-14', number: '14', title: 'Protecciones (ITM / Fusibles / SPD)' },
    { id: 'sec-15', number: '15', title: 'BOM Final Trazable' },
    { id: 'sec-16', number: '16', title: 'Validación Final' },
    { id: 'sec-17', number: '17', title: 'Errores / Datos Faltantes' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Quick Navigation Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sticky top-20 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" /> Índice de Secciones
            </span>
            <button
              onClick={handleCopy}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado' : 'Copiar MD'}</span>
            </button>
          </div>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={() => setActiveSection(sec.id)}
                className={`block px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeSection === sec.id
                    ? 'bg-amber-500/20 text-amber-300 font-bold border-l-2 border-amber-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span className="text-slate-500 font-mono mr-1.5">{sec.number}.</span>
                {sec.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Full 17-Section Dossier Body */}
      <div className="lg:col-span-3 space-y-8 print:col-span-4">
        {/* Cover / Header Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-500/30">
                Memoria de Cálculo & BOM Oficial
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {model.projectName}
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Cliente: <strong className="text-slate-200">{model.clientName}</strong> • ID: <strong className="text-slate-200">{model.installationId}</strong> • {model.location}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 shadow-sm transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
              <span>{copied ? '¡Informe Copiado!' : 'Copiar Informe Markdown'}</span>
            </button>
          </div>
        </div>

        {/* 1. RESUMEN DE LA INSTALACIÓN */}
        <section id="sec-1" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">1</span>
            Resumen de la Instalación
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-500 uppercase font-mono block">Potencia Fotovoltaica</span>
              <strong className="text-lg font-mono text-amber-400">{(dc.totalPowerW / 1000).toFixed(2)} kWp</strong>
              <span className="text-xs text-slate-400 block mt-0.5">{model.pv.totalModules || model.pv.modulesPerString * model.pv.numberOfStrings} módulos de {model.pv.powerW}W</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-500 uppercase font-mono block">Potencia de Inversión AC</span>
              <strong className="text-lg font-mono text-emerald-400">{ac.totalAcPowerKw.toFixed(1)} kW</strong>
              <span className="text-xs text-slate-400 block mt-0.5">{model.inverter.numberOfUnits || 1}x {model.inverter.ratedPowerKw} kW ({model.inverter.architecture})</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-500 uppercase font-mono block">Sistema Eléctrico</span>
              <strong className="text-lg font-mono text-cyan-400">{ac.systemType}</strong>
              <span className="text-xs text-slate-400 block mt-0.5">Tensión Nominal: {ac.nominalAcVoltageV} V</span>
            </div>
          </div>
        </section>

        {/* 2. ARQUITECTURA */}
        <section id="sec-2" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">2</span>
            Arquitectura de la Instalación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h3 className="font-bold text-amber-400 uppercase text-[11px]">Generación Fotovoltaica</h3>
              <ul className="space-y-1 text-slate-300">
                <li>• Módulo: <strong className="text-white">{model.pv.manufacturer} {model.pv.model}</strong></li>
                <li>• Módulos por string: <strong>{model.pv.modulesPerString}</strong> | N° de strings: <strong>{model.pv.numberOfStrings}</strong></li>
                <li>• Configuración: <strong>{dc.configSeriesParallel}</strong></li>
                <li>• Parámetros STC: Voc={model.pv.vocV}V, Isc={model.pv.iscA}A, Vmp={model.pv.vmpV}V, Imp={model.pv.impA}A</li>
              </ul>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h3 className="font-bold text-cyan-400 uppercase text-[11px]">Inversor y Conversión AC</h3>
              <ul className="space-y-1 text-slate-300">
                <li>• Inversor: <strong className="text-white">{model.inverter.manufacturer} {model.inverter.model}</strong></li>
                <li>• Arquitectura: <strong className="text-cyan-300 uppercase">{model.inverter.architecture}</strong></li>
                <li>• Tensión Salida AC: <strong>{model.inverter.nominalAcVoltageV} V</strong> ({model.inverter.systemType})</li>
                <li>• Corriente Máx AC: <strong>{model.inverter.maxOutputCurrentA} A</strong> (Continuo 1.25x: {ac.maxAcCurrentWithContinuousFactorA.toFixed(1)} A)</li>
              </ul>
            </div>
          </div>

          {/* Cabinets and Protections summary */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h3 className="font-bold text-emerald-400 uppercase text-[11px] mb-2 font-mono">Tableros y Gabinetes Modelados</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {model.cabinets.map((cab) => (
                <div key={cab.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div>
                    <strong className="text-white block">{cab.name}</strong>
                    <span className="text-slate-400 text-[11px]">{cab.type} • {cab.location}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {cab.nemaRating}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. MODELO DC & 4. MODELO AC */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section id="sec-3" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">3</span>
              Modelo DC
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr><td className="py-1.5 text-slate-500">Potencia Total DC:</td><td className="py-1.5 font-bold text-amber-400">{dc.totalPowerW} Wp</td></tr>
                  <tr><td className="py-1.5 text-slate-500">Tensión Voc por String:</td><td className="py-1.5 font-bold text-white">{dc.stringVocV.toFixed(2)} V</td></tr>
                  <tr><td className="py-1.5 text-slate-500">Tensión Vmp por String:</td><td className="py-1.5 font-bold text-white">{dc.stringVmpV.toFixed(2)} V</td></tr>
                  <tr><td className="py-1.5 text-slate-500">Corriente Isc por String:</td><td className="py-1.5 font-bold text-white">{dc.stringIscA.toFixed(2)} A</td></tr>
                  <tr><td className="py-1.5 text-slate-500">Corriente Imp por String:</td><td className="py-1.5 font-bold text-white">{dc.stringImpA.toFixed(2)} A</td></tr>
                  <tr><td className="py-1.5 text-slate-500">Corriente Total Arreglo (Isc):</td><td className="py-1.5 font-bold text-amber-300">{dc.arrayIscA.toFixed(2)} A</td></tr>
                  <tr><td className="py-1.5 text-slate-500">Corriente Diseño (1.56x):</td><td className="py-1.5 font-bold text-emerald-400">{(dc.stringIscA * 1.5625).toFixed(2)} A</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="sec-4" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">4</span>
              Modelo AC
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr><td className="py-1.5 text-slate-500">Potencia Nominal AC:</td><td className="py-1.5 font-bold text-emerald-400">{ac.totalAcPowerKw} kW</td></tr>
                  <tr><td className="py-1.5 text-slate-500">Sistema Eléctrico:</td><td className="py-1.5 font-bold text-white">{ac.systemType}</td></tr>
                  <tr><td className="py-1.5 text-slate-500">Tensión Nominal AC:</td><td className="py-1.5 font-bold text-white">{ac.nominalAcVoltageV} V</td></tr>
                  <tr><td className="py-1.5 text-slate-500">Corriente Nominal AC:</td><td className="py-1.5 font-bold text-white">{ac.totalAcCurrentA.toFixed(2)} A</td></tr>
                  <tr><td className="py-1.5 text-slate-500">Corriente Diseño AC (1.25x):</td><td className="py-1.5 font-bold text-cyan-400">{ac.maxAcCurrentWithContinuousFactorA.toFixed(2)} A</td></tr>
                  <tr><td className="py-1.5 text-slate-500">Factor de Potencia (cos φ):</td><td className="py-1.5 font-bold text-white">0.98</td></tr>
                  <tr><td className="py-1.5 text-slate-500">Protección ITM AC Sugerida:</td><td className="py-1.5 font-bold text-amber-400">{Math.ceil(ac.maxAcCurrentWithContinuousFactorA)} A</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* 5. TABLA DE RUTAS */}
        <section id="sec-5" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">5</span>
            Tabla de Rutas Eléctricas
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Ruta</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Origen / Destino</th>
                  <th className="p-3">Longitud</th>
                  <th className="p-3">I_diseño</th>
                  <th className="p-3">Calibre</th>
                  <th className="p-3">Canalización</th>
                  <th className="p-3 text-right">ΔV%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                {routeResults.map((r) => {
                  const route = model.routes.find((rt) => rt.id === r.routeId)!;
                  return (
                    <tr key={r.routeId} className="hover:bg-slate-800/50 transition">
                      <td className="p-3 font-bold text-white">{r.routeName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${r.type === 'DC' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{route.origin} → {route.destination}</td>
                      <td className="p-3">{route.lengthM.toFixed(1)} m</td>
                      <td className="p-3 font-bold text-amber-400">{r.designCurrentA.toFixed(1)} A</td>
                      <td className="p-3 font-bold text-emerald-400">{r.selectedGauge} {route.material}</td>
                      <td className="p-3 text-purple-300">{r.selectedConduitTradeSize} {route.conduitType}</td>
                      <td className={`p-3 text-right font-bold ${r.voltageDropCompliance ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {r.voltageDropPercent.toFixed(2)} %
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. CÁLCULO DE CORRIENTES & 7. CCC */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section id="sec-6" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">6</span>
              Cálculo de Corrientes
            </h2>
            <div className="space-y-3">
              {routeResults.map((r) => (
                <div key={r.routeId} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-white">{r.routeName}</strong>
                    <span className="font-mono text-amber-400 font-bold">{r.designCurrentA.toFixed(2)} A</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">{r.currentBasis}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="sec-7" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="h-6 w-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-mono font-bold">7</span>
              Conductores y CCC
            </h2>
            <div className="space-y-3">
              {routeResults.map((r) => (
                <div key={r.routeId} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-white">{r.routeName}</strong>
                    <span className="text-cyan-400 font-bold">{r.physicalCount} Físicos / {r.cccCount} CCC</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.physicalConductors.map((c, i) => (
                      <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${c.isCCC ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
                        {c.role} ({c.color}) {c.isCCC ? '[CCC]' : '[No CCC / PE]'}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 8. AMPACIDAD & 9. SELECCIÓN DE CONDUCTORES */}
        <section id="sec-8" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">8 & 9</span>
            Ampacidad, Factores de Corrección & Calibre
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Ruta</th>
                  <th className="p-3">Temp Efectiva</th>
                  <th className="p-3">Ft</th>
                  <th className="p-3">Fa</th>
                  <th className="p-3">Ft × Fa</th>
                  <th className="p-3">I_base Requerida</th>
                  <th className="p-3">Calibre</th>
                  <th className="p-3 text-right">Ampacidad Corregida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {routeResults.map((r) => (
                  <tr key={r.routeId} className="hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-white">{r.routeName}</td>
                    <td className="p-3">{r.effectiveTempC} °C</td>
                    <td className="p-3 text-amber-300">{r.tempCorrectionFactor.toFixed(2)}</td>
                    <td className="p-3 text-cyan-300">{r.groupingCorrectionFactor.toFixed(2)}</td>
                    <td className="p-3 font-bold text-purple-300">{r.totalDeratingFactor.toFixed(2)}</td>
                    <td className="p-3">{r.requiredBaseAmpacityA.toFixed(1)} A</td>
                    <td className="p-3 font-bold text-emerald-400">{r.selectedGauge}</td>
                    <td className="p-3 text-right font-bold text-emerald-400">{r.correctedConductorAmpacityA.toFixed(1)} A</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 10. CAÍDA DE TENSIÓN */}
        <section id="sec-10" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">10</span>
            Caída de Tensión (Objetivo: ≤ 3.00%)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Ruta</th>
                  <th className="p-3">Longitud</th>
                  <th className="p-3">Resistencia (R)</th>
                  <th className="p-3">Tensión Nominal</th>
                  <th className="p-3">Caída (V)</th>
                  <th className="p-3">Caída (%)</th>
                  <th className="p-3">Incrementos Calibre</th>
                  <th className="p-3 text-right">Cumplimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {routeResults.map((r) => {
                  const route = model.routes.find((rt) => rt.id === r.routeId)!;
                  return (
                    <tr key={r.routeId} className="hover:bg-slate-800/50">
                      <td className="p-3 font-bold text-white">{r.routeName}</td>
                      <td className="p-3">{route.lengthM.toFixed(1)} m</td>
                      <td className="p-3 text-slate-400">{r.resistanceOhmsPerKm} Ω/km</td>
                      <td className="p-3">{route.voltageV} V</td>
                      <td className="p-3">{r.voltageDropV.toFixed(2)} V</td>
                      <td className={`p-3 font-bold ${r.voltageDropCompliance ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {r.voltageDropPercent.toFixed(2)} %
                      </td>
                      <td className="p-3 text-amber-400">+{r.voltageDropRecalculatedSteps} calibre(s)</td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.voltageDropCompliance ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {r.voltageDropCompliance ? '✅ CUMPLE ≤ 3%' : '❌ SUPERA 3%'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 11. TUBERÍA & 12. FACTOR DE RELLENO */}
        <section id="sec-11" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="h-6 w-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-mono font-bold">11 & 12</span>
            Selección de Tubería / Conduit y Factor de Relleno
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Ruta</th>
                  <th className="p-3">Canalización</th>
                  <th className="p-3">Diámetro Comercial</th>
                  <th className="p-3">Área Conductores</th>
                  <th className="p-3">Área Tubería</th>
                  <th className="p-3">% Relleno Real</th>
                  <th className="p-3">Límite Permitido</th>
                  <th className="p-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {routeResults.map((r) => {
                  const route = model.routes.find((rt) => rt.id === r.routeId)!;
                  return (
                    <tr key={r.routeId} className="hover:bg-slate-800/50">
                      <td className="p-3 font-bold text-white">{r.routeName}</td>
                      <td className="p-3">{route.conduitType}</td>
                      <td className="p-3 font-bold text-purple-300">{r.selectedConduitTradeSize} ({r.selectedConduitMetricMm} mm)</td>
                      <td className="p-3">{r.totalConductorsAreaMm2.toFixed(1)} mm²</td>
                      <td className="p-3">{r.conduitTotalAreaMm2} mm²</td>
                      <td className={`p-3 font-bold ${r.conduitFillCompliance ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {r.actualConduitFillPercent.toFixed(1)} %
                      </td>
                      <td className="p-3 text-slate-400">{r.maxFillPercentAllowed} %</td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.conduitFillCompliance ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {r.conduitFillCompliance ? '✅ CONFORME' : '❌ EXCEDIDO'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 13. ACCESORIOS & 14. PROTECCIONES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section id="sec-13" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">13</span>
              Accesorios Geométricos
            </h2>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {routeResults.flatMap((r) => r.derivedAccessories).map((acc) => (
                <div key={acc.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-white block">{acc.item}</strong>
                      <span className="text-slate-400 text-[11px]">{acc.spec}</span>
                    </div>
                    <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {acc.qty} {acc.unit}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">{acc.reason}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="sec-14" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="h-6 w-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-mono font-bold">14</span>
              Protecciones Eléctricas
            </h2>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {model.inverter.architecture === 'microinverter' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                  ⚡ <strong>Regla Microinversores:</strong> ITM DC = 0. Protecciones en lado AC.
                </div>
              )}
              {routeResults.flatMap((r) => r.derivedProtections).map((prot) => (
                <div key={prot.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-white block">{prot.item}</strong>
                      <span className="text-slate-400 text-[11px]">{prot.spec}</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {prot.qty} {prot.unit}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">{prot.reason}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 15. BOM FINAL */}
        <section id="sec-15" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">15</span>
              Lista de Materiales (BOM) Trazable ({bom.length} Partidas)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Elemento</th>
                  <th className="p-3">Especificación</th>
                  <th className="p-3 text-right">Cantidad</th>
                  <th className="p-3">Unidad</th>
                  <th className="p-3">Ubicación</th>
                  <th className="p-3">Trazabilidad Técnica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {bom.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50">
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white">{item.element}</td>
                    <td className="p-3 text-slate-400">{item.specification}</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-400">{item.quantity}</td>
                    <td className="p-3 font-mono">{item.unit}</td>
                    <td className="p-3 text-slate-400">{item.location}</td>
                    <td className="p-3 text-[11px] text-slate-400 font-mono">{item.traceability.engineeringJustification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 16. VALIDACIÓN FINAL & 17. ERRORES */}
        <section id="sec-16" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">16 & 17</span>
            Validación Final & Auditoría Técnica
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {validations.map((val) => (
              <div key={val.id} className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs ${
                val.passed 
                  ? 'bg-slate-950 border-slate-800 text-slate-300' 
                  : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
              }`}>
                {val.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="font-mono text-slate-500">[{val.id}]</span>
                    <span className="text-white">{val.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{val.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div id="sec-17" className="mt-4 pt-4 border-t border-slate-800">
            {missingDataList.length === 0 && errors.length === 0 ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <strong className="block text-emerald-200">Modelo 100% Validado</strong>
                  <span>No se detectaron errores ni datos faltantes. Toda la BOM y dimensionamiento se derivan matemáticamente del modelo.</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300 space-y-2">
                <strong className="block text-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Atención: Datos Faltantes / Inconsistencias
                </strong>
                {missingDataList.map((m, i) => (
                  <div key={i}>• [DATO FALTANTE]: Se requiere especificar <strong>{m}</strong></div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
