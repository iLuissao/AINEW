import React from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Layers, 
  Zap, 
  Activity, 
  FileCheck 
} from 'lucide-react';
import { ProjectModelResult } from '../engine/types';

interface ValidationViewProps {
  result: ProjectModelResult;
}

export const ValidationView: React.FC<ValidationViewProps> = ({ result }) => {
  const { validations, missingDataList, errors, routeResults } = result;
  const passedCount = validations.filter((v) => v.passed).length;
  const totalCount = validations.length;
  const percentPassed = Math.round((passedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Auditoría Técnica de Conformidad Normativa (NEC / NOM-001)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verificación exhaustiva de {totalCount} reglas de ingeniería: ampacidades, caídas de tensión (umbral ≤ 3%), tensión Voc en frío (Art. 690-7), factores de relleno, protecciones y coherencia de rutas.
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Conformidad</span>
              <strong className="text-lg font-mono text-emerald-400 font-bold">{passedCount} / {totalCount} ({percentPassed}%)</strong>
            </div>
            <div className="h-10 w-10 rounded-full border-2 border-emerald-500 flex items-center justify-center font-mono text-xs font-bold text-emerald-400">
              {percentPassed}%
            </div>
          </div>
        </div>
      </div>

      {/* Validations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {validations.map((val) => (
          <div
            key={val.id}
            className={`p-5 rounded-2xl border transition shadow-sm flex items-start space-x-4 ${
              val.passed
                ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                : 'bg-rose-950/30 border-rose-800/70 text-rose-200'
            }`}
          >
            <div className="mt-0.5">
              {val.passed ? (
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-500">[{val.id}]</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  val.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {val.passed ? 'APROBADO' : 'FALLO'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">{val.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-mono text-[11px]">{val.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Errors & Missing Data Alert */}
      {(missingDataList.length > 0 || errors.length > 0) && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-5 shadow-lg space-y-2 text-xs text-rose-200">
          <div className="flex items-center space-x-2 text-rose-400 font-bold uppercase text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Datos Faltantes o Acciones de Corrección Requeridas</span>
          </div>
          <ul className="space-y-1 list-disc list-inside font-mono text-[11px] text-rose-300">
            {missingDataList.map((m, i) => (
              <li key={i}>Falta ingresar: <strong>{m}</strong></li>
            ))}
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
