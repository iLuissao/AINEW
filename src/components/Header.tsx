import React from 'react';
import { motion } from 'motion/react';
import { 
  Sun, 
  Layers, 
  FileText, 
  Sliders, 
  Printer, 
  Sparkles,
  HelpCircle,
  FolderSync,
  User,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { InstallationModel, ProjectModelResult } from '../engine/types';

export type ActiveTabType = 'unifilar' | 'memoria' | 'editor';

interface HeaderProps {
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  model: InstallationModel;
  result: ProjectModelResult;
  onSelectPreset?: (preset: InstallationModel) => void;
  onExportMarkdown: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onOpenOCR: () => void;
  onOpenTutorial: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  model,
  result,
  onPrint,
  onOpenOCR,
  onOpenTutorial,
}) => {
  const totalKw = (result.dc.totalPowerW / 1000).toFixed(1);
  const totalAcKw = result.ac.totalAcPowerKw.toFixed(1);

  const navItems: Array<{ id: ActiveTabType; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'unifilar', label: 'Diagrama Unifilar & Variables', icon: Layers },
    { id: 'memoria', label: 'Memoria Técnica & BOM', icon: FileText },
    { id: 'editor', label: 'Editor de Variables Activas', icon: Sliders },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3">
          {/* Brand & Active Project Identity */}
          <div 
            onClick={() => setActiveTab('unifilar')} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
              className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0"
            >
              <Sun className="h-6 w-6 text-slate-950 font-bold" />
            </motion.div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-white tracking-tight group-hover:text-amber-300 transition">
                  MOTOR UNIFILAR DETERMINISTA
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  NOM-001-SEDE
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Proyecto Activo
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono truncate max-w-[280px] sm:max-w-md">
                {model.projectName} • {model.clientName || 'Cliente'} ({model.installationId || 'OS-ACTIVA'})
              </p>
            </div>
          </div>

          {/* Active Project Tools & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Active Project Status Pill */}
            <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
              <span className="text-slate-400 mr-1.5 font-medium">Activo:</span>
              <span className="text-white font-bold font-mono">{model.pv.totalModules}x{model.pv.powerW}W</span>
              <span className="text-amber-400 font-mono ml-1.5 font-bold">{totalKw} kWp</span>
            </div>

            {/* Tutorial / Guide Button */}
            <button
              onClick={onOpenTutorial}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-xl text-xs font-semibold border border-cyan-500/30 transition cursor-pointer"
              title="Ver guía y tutorial de introducción"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Tutorial</span>
            </button>

            {/* OCR Service Order Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenOCR}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold transition shadow-md shadow-amber-500/20 cursor-pointer"
              title="Escanear Hoja de Servicio con OCR para el proyecto activo"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Escanear Hoja de Servicio (OCR)</span>
            </motion.button>

            {/* Print / Export */}
            <button
              onClick={onPrint}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
              title="Imprimir plano unifilar o memoria técnica"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Minimal, clean 3-pillar layout */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-1 pb-2">
          <nav className="flex space-x-1">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Compact Electrical KPI Badges */}
          <div className="hidden lg:flex items-center space-x-3 text-xs font-mono">
            <div className="text-slate-400">
              FV: <span className="text-amber-400 font-bold">{totalKw} kWp</span>
            </div>
            <div className="text-slate-400">
              AC: <span className="text-cyan-400 font-bold">{totalAcKw} kW</span>
            </div>
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-sans font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>NOM-001 OK</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
