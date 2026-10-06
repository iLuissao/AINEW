import React, { useState } from 'react';
import { 
  Table, 
  Download, 
  Search, 
  Filter, 
  Info, 
  Layers, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { BOMItem, ProjectModelResult } from '../engine/types';

interface BOMViewProps {
  result: ProjectModelResult;
  onExportCSV: () => void;
  onPrint: () => void;
}

export const BOMView: React.FC<BOMViewProps> = ({ result, onExportCSV, onPrint }) => {
  const { bom, model } = result;
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectedItem, setInspectedItem] = useState<BOMItem | null>(null);

  const categories = ['ALL', ...Array.from(new Set(bom.map((b) => b.category)))];

  const filteredBOM = bom.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesQuery = 
      item.element.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.specification.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.traceability.originRoutes.join(' ').toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.traceability.engineeringJustification.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Table className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Lista de Materiales (BOM) Derivada del Modelo
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Cada partida cuenta con trazabilidad técnica auditada desde la geometría, cálculo de ampacidad y caída de tensión.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportCSV}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={onPrint}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat === 'ALL' ? 'Todos los Materiales' : cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar material, calibre, ruta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* BOM Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Elemento</th>
                <th className="p-3.5">Especificación Técnica</th>
                <th className="p-3.5 text-right">Cantidad</th>
                <th className="p-3.5">Unidad</th>
                <th className="p-3.5">Ubicación</th>
                <th className="p-3.5">Origen / Trazabilidad</th>
                <th className="p-3.5 text-center">Auditoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredBOM.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/50 transition group">
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700/60">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-white group-hover:text-amber-300 transition">
                    {item.element}
                  </td>
                  <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                    {item.specification}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                    {item.quantity}
                  </td>
                  <td className="p-3.5 font-mono text-slate-400">{item.unit}</td>
                  <td className="p-3.5 text-slate-300">{item.location}</td>
                  <td className="p-3.5 text-[11px] text-slate-400 font-mono max-w-xs truncate">
                    {item.traceability.engineeringJustification}
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => setInspectedItem(item)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-[10px] font-bold border border-slate-700 transition"
                    >
                      Ver Traza
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Traceability Audit Modal */}
      {inspectedItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Trazabilidad Técnica del Material
                </h3>
              </div>
              <button
                onClick={() => setInspectedItem(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded bg-slate-800"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Partida</span>
                <strong className="text-white text-sm block mt-0.5">{inspectedItem.element}</strong>
                <span className="text-slate-400 text-xs font-mono">{inspectedItem.specification}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Cantidad Requerida</span>
                  <span className="text-sm font-mono font-bold text-amber-400">{inspectedItem.quantity} {inspectedItem.unit}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Rutas de Origen</span>
                  <span className="text-sm font-bold text-white truncate block">{inspectedItem.traceability.originRoutes.join(', ') || 'General'}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Justificación Normativa & Derivación</span>
                <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                  {inspectedItem.traceability.engineeringJustification}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400">
                  <div>Corriente: <strong className="text-amber-400">{inspectedItem.traceability.currentCalculatedA.toFixed(1)} A</strong></div>
                  <div>Caída de Tensión: <strong className="text-emerald-400">{inspectedItem.traceability.voltageDropPercent.toFixed(2)} %</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
