import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Camera,
  Layers,
  FileText,
  MapPin,
  Calendar,
  Smartphone,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Zap,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

interface AppTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOCR?: () => void;
}

interface TutorialStep {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  description: string;
  features: string[];
  actionLabel?: string;
  onAction?: () => void;
}

export const AppTutorialModal: React.FC<AppTutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenOCR,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const steps: TutorialStep[] = [
    {
      title: 'Bienvenido a PV Model & BOM Engine',
      subtitle: 'Plataforma Profesional de Ingeniería Solar y Almacenamiento (ESS)',
      icon: <Sparkles className="w-8 h-8 text-amber-400" />,
      accentColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
      description:
        'Esta aplicación está diseñada para ingenieros electricistas, instaladores fotovoltaicos y diseñadores solares. Automatiza el cálculo eléctrico bajo NOM-001-SEDE, genera diagramas unifilares y produce listas de materiales (BOM) exactas.',
      features: [
        'Cálculo eléctrico automatizado (Caída de tensión, ampacidad y protecciones)',
        'Cumplimiento estricto con NOM-001-SEDE e IEEE',
        'Optimizado para uso en campo (Web y APK Android nativa con Capacitor)',
      ],
    },
    {
      title: '1. Escaneo OCR de Órdenes de Servicio',
      subtitle: 'Extracción Inteligente de Datos desde Fotos o Documentos',
      icon: <Camera className="w-8 h-8 text-cyan-400" />,
      accentColor: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400',
      description:
        '¿Tienes una orden de servicio en foto o PDF? Súbela o usa el escáner OCR integrado. El motor extrae automáticamente el folio, cliente, dirección, potencia de paneles, inversor y rutas.',
      features: [
        'Procesamiento híbrido (Servidor IA + Respaldo OCR local offline)',
        'Carga instantánea de plantillas de ejemplo si no hay conexión',
        'Actualización automática del modelo eléctrico con un solo clic',
      ],
      actionLabel: 'Probar Escáner OCR Ahora',
      onAction: () => {
        onClose();
        if (onOpenOCR) onOpenOCR();
      },
    },
    {
      title: '2. Diagrama Unifilar Dinámico & ANSI',
      subtitle: 'Topología Eléctrica en Tiempo Real',
      icon: <Layers className="w-8 h-8 text-emerald-400" />,
      accentColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
      description:
        'Visualiza el esquema eléctrico completo desde los módulos fotovoltaicos, string box, inversor híbrido ESS, medidor bidireccional hasta el centro de carga general.',
      features: [
        'Simbolos estándar ANSI / IEEE',
        'Cálculo en vivo de corrientes de corto circuito y operación (Isc × 1.56)',
        'Verificación de calibre de conductores de cobre (THHN / PV-Wire)',
      ],
    },
    {
      title: '3. Memoria Técnica y BOM Automático',
      subtitle: 'Listado de Materiales y 17 Secciones de Ingeniería',
      icon: <FileText className="w-8 h-8 text-violet-400" />,
      accentColor: 'from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400',
      description:
        'Genera memorias de cálculo detalladas con justificación normativa, metrados exactos de cableado DC/AC, canalizaciones EMT/PVC y protecciones termomagnéticas.',
      features: [
        'Exportación inmediata a CSV para presupuestos y compras',
        'Copia de memoria completa en formato Markdown',
        'Trazabilidad técnica por cada elemento del sistema',
      ],
    },
    {
      title: '4. Ubicación Satelital & Clima',
      subtitle: 'Geolocalización y Radiación Solar',
      icon: <MapPin className="w-8 h-8 text-rose-400" />,
      accentColor: 'from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-400',
      description:
        'Ubica el proyecto geográficamente, consulta coordenadas exactas, temperatura ambiente de diseño y parámetros de inclinación óptima para la azotea.',
      features: [
        'Cálculo de factor de corrección por temperatura',
        'Ajuste automático de distancia entre inversores y tableros',
      ],
    },
    {
      title: '5. Modo Offline & APK Nativa Android',
      subtitle: 'Trabaja sin Internet en Cualquier Sitio',
      icon: <Smartphone className="w-8 h-8 text-amber-400" />,
      accentColor: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-400',
      description:
        'La aplicación está empaquetada con Capacitor para funcionar como APK nativa en dispositivos Android. Todos los cálculos y motores OCR locales operan sin necesidad de conexión.',
      features: [
        'Indicador de estado de conexión en tiempo real',
        'Almacenamiento local seguro de proyectos y configuraciones',
      ],
    },
  ];

  const current = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
              Tutorial e Introducción • Paso {currentStep + 1} de {steps.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 h-1">
          <div
            className="bg-gradient-to-r from-amber-500 to-orange-500 h-1 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
          <div>
            <div className={`p-4 rounded-2xl border bg-gradient-to-br ${current.accentColor} mb-6 flex items-center space-x-4`}>
              <div className="p-3 bg-slate-900/80 rounded-xl shadow-inner border border-white/10">
                {current.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{current.title}</h2>
                <p className="text-sm text-slate-300">{current.subtitle}</p>
              </div>
            </div>

            <p className="text-slate-300 text-base leading-relaxed mb-6">
              {current.description}
            </p>

            <div className="space-y-3 mb-6 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Características Destacadas
              </h4>
              <ul className="space-y-2">
                {current.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mr-2.5 mt-0.5 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Button if available on step */}
          {current.actionLabel && current.onAction && (
            <div className="mb-6">
              <button
                onClick={current.onAction}
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-900/30 flex items-center justify-center space-x-2 transition-all"
              >
                <Camera className="w-5 h-5" />
                <span>{current.actionLabel}</span>
              </button>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center space-x-2 transition-colors ${
                currentStep === 0
                  ? 'text-slate-600 cursor-not-allowed bg-slate-900'
                  : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <div className="flex space-x-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === currentStep ? 'bg-amber-500 w-6' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all"
            >
              <span>{currentStep === steps.length - 1 ? 'Comenzar a Usar' : 'Siguiente'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
