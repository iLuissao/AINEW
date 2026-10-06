import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Activity,
  Maximize2,
  Minimize2,
  Trash2,
  FileText,
  AlertTriangle,
  TrendingDown,
  Layers,
  HelpCircle,
  Cloud,
  Cpu,
  Wifi,
  WifiOff,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { InstallationModel, ProjectModelResult } from '../engine/types';
import { generateLocalAssistantResponse } from '../engine/localAssistantEngine';

interface ProjectAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: InstallationModel;
  result: ProjectModelResult;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: 'local' | 'cloud';
}

const QUICK_PROMPTS = [
  {
    icon: Activity,
    label: 'Resumen Ejecutivo & Datos Clave',
    prompt: 'Genera un resumen ejecutivo del proyecto actual con potencias, corrientes de diseño, arquitectura de inversor, rutas y resumen de BOM.',
  },
  {
    icon: ShieldCheck,
    label: 'Auditoría NOM-001-SEDE / NEC',
    prompt: 'Realiza una auditoría normativa exhaustiva del proyecto bajo la NOM-001-SEDE-2012 y NEC 2023. Indica si hay violaciones y cita los artículos aplicables.',
  },
  {
    icon: TrendingDown,
    label: 'Análisis de Caída de Tensión',
    prompt: 'Analiza la caída de tensión en cada ruta física (DC y AC) según sus distancias reales. ¿Cumplen con los límites normativos recomendados?',
  },
  {
    icon: Zap,
    label: 'Verificación Voc en Frío',
    prompt: 'Verifica la tensión máxima de circuito abierto Voc a la temperatura mínima de diseño del proyecto contra el límite de tensión del inversor.',
  },
  {
    icon: Layers,
    label: 'Calibres y Canalizaciones',
    prompt: 'Explica el cálculo de ampacidad corregida por temperatura y agrupamiento en los conductores y el porcentaje de llenado en las canalizaciones de las rutas.',
  },
  {
    icon: AlertTriangle,
    label: 'Protecciones OCPD y Fusibles',
    prompt: '¿Cómo se seleccionan las protecciones contra sobrecorriente (OCPD) en DC y el interruptor termomagnético (ITM) en AC bajo los factores normativos 1.56x y 1.25x para este proyecto?',
  },
  {
    icon: Sparkles,
    label: 'Relación DC/AC y Rendimiento',
    prompt: '¿Cuál es la relación DC/AC del sistema actual y qué recomendaciones tienes para optimizar la curva de generación?',
  },
];

export const ProjectAIAssistantModal: React.FC<ProjectAIAssistantModalProps> = ({
  isOpen,
  onClose,
  model,
  result,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  // Engine Mode: 'local' (offline expert) | 'cloud' (Gemini cloud)
  const [engineMode, setEngineMode] = useState<'local' | 'cloud'>('local');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const totalDcKwp = (result.dc.totalPowerW / 1000).toFixed(2);
  const totalAcKw = result.ac.totalAcPowerKw.toFixed(1);
  const dcAcRatio = (result.dc.totalPowerW / (result.ac.totalAcPowerKw * 1000 || 1)).toFixed(2);
  const allPassed = result.validations.every((v) => v.passed);
  const violationsCount = result.validations.filter((v) => !v.passed).length;

  // Initialize with welcoming message when opened first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const routesSummary = model.routes && model.routes.length > 0
        ? model.routes.map((r) => `${r.name || r.type}: ${r.lengthM}m`).join(' | ')
        : 'Sin rutas definidas';

      const initialGreeting: ChatMessage = {
        id: 'init-1',
        role: 'assistant',
        source: 'local',
        content: `Hola Ingeniero, soy tu **Asistente de Ingeniería Eléctrica y Solar NOM/NEC** para el proyecto **"${model.projectName || 'Instalación FV'}"**.
        
⚡ **Modo de Operación:** Puedes alternar en cualquier momento entre **Motor Local Offline** (100% privado, instantáneo y determinista) o **Modo Nube (Gemini)**.

### 📊 Datos Actuales del Proyecto en Memoria:
- **Generador Fotovoltaico:** ${model.pv.totalModules} módulos de **${model.pv.powerW} Wp** (${model.pv.manufacturer}) = **${totalDcKwp} kWp DC**
- **Inversor Nominal:** **${totalAcKw} kW** @ ${model.inverter.nominalAcVoltageV}V (${model.inverter.systemType})
- **Relación DC/AC:** **${dcAcRatio}** (Rango recomendado: 1.15 a 1.30)
- **Rutas Eléctricas (${model.routes.length}):** ${routesSummary}
- **Estado Normativo:** ${allPassed ? '✅ **100% en Cumplimiento NOM-001-SEDE / NEC**' : `⚠️ **${violationsCount} Observaciones**`}

¿En qué análisis, verificación de cálculos o consulta técnica te puedo apoyar hoy? Puedes seleccionar una de las consultas rápidas abajo o escribir tu propia pregunta.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([initialGreeting]);
    }
  }, [isOpen, model, result, totalDcKwp, totalAcKw, allPassed, violationsCount]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    // If LOCAL MODE: execute deterministic expert engine client-side with 0ms delay!
    if (engineMode === 'local') {
      try {
        // Small artificial micro-delay for natural UI feel
        await new Promise((resolve) => setTimeout(resolve, 80));

        const historyPayload = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const localRes = generateLocalAssistantResponse(textToSend, model, result, historyPayload);

        const assistantMsg: ChatMessage = {
          id: `local-ai-${Date.now()}`,
          role: 'assistant',
          source: 'local',
          content: localRes.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        console.error('Error en motor local:', err);
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          source: 'local',
          content: `⚠️ Error procesando la consulta: ${err.message || 'Error interno del motor local'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // CLOUD MODE: attempt high-speed streaming Gemini endpoint with instant TTFT
    const assistantMsgId = `ai-${Date.now()}`;
    let accumulatedContent = '';
    let messageSource: 'local' | 'cloud' = 'cloud';

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Create initial placeholder for real-time streaming
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          source: 'cloud',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      const res = await fetch('/api/gemini/assistant-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: textToSend,
          model,
          result,
          history: historyPayload,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.source) messageSource = data.source;
              if (data.text) {
                accumulatedContent += data.text;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: accumulatedContent, source: messageSource }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Ignore partial parse errors
            }
          }
        }
      }

      // If nothing was accumulated, fallback to non-stream endpoint
      if (!accumulatedContent) {
        throw new Error('Respuesta de stream vacía');
      }
    } catch (err: any) {
      console.warn('Fallo en conexión nube/stream, aplicando motor local determinista:', err);
      // Seamless local failover
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const fallbackRes = generateLocalAssistantResponse(textToSend, model, result, historyPayload);
      
      setMessages((prev) => {
        const existing = prev.find((m) => m.id === assistantMsgId);
        if (existing) {
          return prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  source: 'local',
                  content: fallbackRes.answer,
                }
              : msg
          );
        }
        return [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            source: 'local',
            content: fallbackRes.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className={`bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col transition-all duration-300 ${
          isExpanded ? 'w-full h-full max-w-6xl max-h-[96vh]' : 'w-full max-w-4xl h-[88vh] max-h-[850px]'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 rounded-t-3xl">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border shadow-inner transition-colors ${
              engineMode === 'local'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
            }`}>
              {engineMode === 'local' ? <Cpu className="w-6 h-6" /> : <Cloud className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                  <span>Asistente de Ingeniería IA</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                    NOM / NEC 2023
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Consultor técnico conectado en tiempo real al modelo y cálculos de {model.projectName || 'tu instalación'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Mode Switcher */}
            <div className="bg-slate-950 p-0.5 rounded-xl border border-slate-800 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setEngineMode('local')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  engineMode === 'local'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Modo Local Experto: 100% Offline, sin consumo de API nube y determinista"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">⚡ Local Offline</span>
                <span className="sm:hidden">Local</span>
              </button>
              <button
                type="button"
                onClick={() => setEngineMode('cloud')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  engineMode === 'cloud'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Modo Nube: Modelo Gemini con razonamiento extendido"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">☁️ Nube Gemini</span>
                <span className="sm:hidden">Nube</span>
              </button>
            </div>

            {messages.length > 1 && (
              <button
                onClick={handleClearHistory}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition text-xs flex items-center gap-1"
                title="Limpiar conversación"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden md:inline text-xs">Limpiar</span>
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition"
              title={isExpanded ? 'Restaurar tamaño' : 'Maximizar'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Project Metrics Ribbon & Engine Status */}
        <div className="bg-slate-950/90 px-4 py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-3 overflow-x-auto py-0.5">
            <span className="text-slate-400 flex items-center gap-1">
              <span className="text-slate-500">Proyecto:</span>
              <strong className="text-slate-200">{model.projectName || 'Solar PV'}</strong>
            </span>
            <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              ⚡ {totalDcKwp} kWp DC
            </span>
            <span className="text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              🔌 {totalAcKw} kW AC ({model.inverter.nominalAcVoltageV}V)
            </span>
            <span className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              DC/AC: {dcAcRatio}
            </span>
            <span className={`px-2 py-0.5 rounded font-bold border ${
              allPassed
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}>
              {allPassed ? '✓ 0 Violaciones' : `⚠ ${violationsCount} Fallas`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {engineMode === 'local' ? (
              <span className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 text-[10px]">
                <Cpu className="w-3 h-3 text-amber-400" />
                <span>Motor Local NOM/NEC (0ms / Offline)</span>
              </span>
            ) : (
              <span className="text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1 text-[10px]">
                <Cloud className="w-3 h-3 text-cyan-400" />
                <span>Gemini Cloud Grounding</span>
              </span>
            )}
          </div>
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                  msg.source === 'local'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                }`}>
                  {msg.source === 'local' ? <Cpu className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-md relative group ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-slate-950/80 border border-slate-800/80 text-slate-200 rounded-tl-none font-sans'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="markdown-body prose prose-invert prose-xs max-w-none space-y-2">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/40 text-[10px] font-mono text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>{msg.timestamp}</span>
                    {msg.role === 'assistant' && (
                      <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                        msg.source === 'local' ? 'text-amber-400/80' : 'text-cyan-400/80'
                      }`}>
                        {msg.source === 'local' ? '⚡ Local NOM/NEC' : '☁️ Gemini Cloud'}
                      </span>
                    )}
                  </div>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopyMessage(msg.content, index)}
                      className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-white bg-slate-900 rounded border border-slate-800 flex items-center gap-1 text-[10px]"
                      title="Copiar respuesta"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0 mt-0.5">
                  <span className="text-xs font-bold font-mono">TÚ</span>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3 justify-start">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 flex items-center space-x-2">
                <span>
                  {engineMode === 'local'
                    ? 'Evaluando parámetros y fórmulas NOM/NEC en motor local...'
                    : 'Consultando modelos de IA en la nube...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-950/50 border-t border-slate-800/80 overflow-x-auto">
          <div className="flex items-center gap-1.5 pb-1">
            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 shrink-0 mr-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Análisis rápidos:</span>
            </span>
            {QUICK_PROMPTS.map((qp, idx) => {
              const Icon = qp.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isLoading}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white rounded-lg text-[11px] font-mono whitespace-nowrap transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Icon className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{qp.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 rounded-b-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Haz una consulta técnica sobre el proyecto actual (ej. '¿Cumple la caída de tensión?', 'Verificar protecciones y calibres')..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition font-sans"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className={`p-3 rounded-xl font-bold transition flex items-center justify-center ${
                isLoading || !inputQuery.trim()
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer'
              }`}
              title="Enviar consulta"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
