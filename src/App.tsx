import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header, ActiveTabType } from './components/Header';
import { UnifilarDashboardWorkspace } from './components/UnifilarDashboardWorkspace';
import { MemoriaBOMWorkspace } from './components/MemoriaBOMWorkspace';
import { ParametricEditor } from './components/ParametricEditor';
import { ServiceOrderOCRModal } from './components/ServiceOrderOCRModal';
import { CalendarScheduleModal } from './components/CalendarScheduleModal';
import { ProjectAIAssistantModal } from './components/ProjectAIAssistantModal';
import { SatelliteLocationModal } from './components/SatelliteLocationModal';
import { AppTutorialModal } from './components/AppTutorialModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PRESET_INSTALLATIONS } from './engine/presets';
import { solveInstallationModel } from './engine/calculator';
import { generateMasterReportMarkdown } from './engine/reportGenerator';
import { InstallationModel } from './engine/types';

export function App() {
  const [model, setModel] = useState<InstallationModel>(PRESET_INSTALLATIONS[0]);
  const [activeTab, setActiveTab] = useState<ActiveTabType>('unifilar');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isOCRModalOpen, setIsOCRModalOpen] = useState<boolean>(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState<boolean>(false);
  const [isSatelliteModalOpen, setIsSatelliteModalOpen] = useState<boolean>(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Show tutorial on first visit if not marked seen
    const seen = localStorage.getItem('pv_tutorial_seen');
    if (!seen) {
      setIsTutorialModalOpen(true);
      localStorage.setItem('pv_tutorial_seen', 'true');
    }
  }, []);

  // Deterministic calculation result derived from the model
  const result = useMemo(() => solveInstallationModel(model), [model]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportMarkdown = () => {
    const md = generateMasterReportMarkdown(result);
    navigator.clipboard.writeText(md);
    showToast('¡Informe de 17 Secciones copiado al portapapeles!');
  };

  const handleExportCSV = () => {
    const headers = ['Categoría', 'Elemento', 'Especificación', 'Cantidad', 'Unidad', 'Ubicación', 'Trazabilidad'];
    const rows = result.bom.map((b) => [
      `"${(b.category || '').replace(/"/g, '""')}"`,
      `"${(b.element || '').replace(/"/g, '""')}"`,
      `"${(b.specification || '').replace(/"/g, '""')}"`,
      b.quantity,
      `"${(b.unit || '').replace(/"/g, '""')}"`,
      `"${(b.location || '').replace(/"/g, '""')}"`,
      `"${(b.traceability?.engineeringJustification || '').replace(/"/g, '""')}"`,
    ]);

    const csvText = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BOM_${model.installationId || 'PV_Model'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('¡Archivo CSV de BOM descargado exitosamente!');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUpdateRouteLength = (routeId: string, newLength: number) => {
    const updatedRoutes = model.routes.map((r) => (r.id === routeId ? { ...r, lengthM: newLength } : r));
    setModel({ ...model, routes: updatedRoutes });
  };

  const handleApplyExtractedModel = (
    newModelUpdates: Partial<InstallationModel>,
    metadata: { serviceOrderId?: string; clientName?: string; scheduledDate?: string }
  ) => {
    setModel((prev) => ({
      ...prev,
      ...newModelUpdates,
      installationId: metadata.serviceOrderId || prev.installationId,
      pv: {
        ...prev.pv,
        ...(newModelUpdates.pv || {}),
      },
      inverter: {
        ...prev.inverter,
        ...(newModelUpdates.inverter || {}),
      },
      battery: {
        ...prev.battery,
        ...(newModelUpdates.battery || {}),
      },
      routes: newModelUpdates.routes || prev.routes,
    }));

    setActiveTab('unifilar');
    showToast('¡Modelo y BOM actualizados automáticamente desde la Orden de Servicio!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans antialiased">
      {/* Offline Status */}
      <OfflineIndicator />

      {/* Main Clean Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        model={model}
        result={result}
        onSelectPreset={(preset) => {
          setModel(preset);
          showToast(`Cargada hoja de servicio de referencia: ${preset.projectName}`);
        }}
        onExportMarkdown={handleExportMarkdown}
        onExportCSV={handleExportCSV}
        onPrint={handlePrint}
        onOpenOCR={() => setIsOCRModalOpen(true)}
        onOpenTutorial={() => setIsTutorialModalOpen(true)}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'unifilar' && (
            <motion.div
              key="unifilar"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <UnifilarDashboardWorkspace
                result={result}
                model={model}
                onUpdateRouteLength={handleUpdateRouteLength}
                onNavigateToMemoria={() => setActiveTab('memoria')}
                onNavigateToEditor={() => setActiveTab('editor')}
                onOpenOCR={() => setIsOCRModalOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === 'memoria' && (
            <motion.div
              key="memoria"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <MemoriaBOMWorkspace
                result={result}
                model={model}
                onExportMarkdown={handleExportMarkdown}
                onExportCSV={handleExportCSV}
                onPrint={handlePrint}
                onUpdateRouteLength={handleUpdateRouteLength}
              />
            </motion.div>
          )}

          {activeTab === 'editor' && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ParametricEditor
                model={model}
                onChangeModel={(updated) => setModel(updated)}
                onResetToPreset={() => setModel(PRESET_INSTALLATIONS[0])}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* OCR Service Order Scanner Modal */}
      {isOCRModalOpen && (
        <ServiceOrderOCRModal
          isOpen={isOCRModalOpen}
          onClose={() => setIsOCRModalOpen(false)}
          onApplyExtractedModel={handleApplyExtractedModel}
          currentActiveProjectName={model.projectName}
        />
      )}

      {/* Calendar Modal */}
      {isCalendarModalOpen && (
        <CalendarScheduleModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          result={result}
          serviceOrderMeta={{
            serviceOrderId: model.installationId,
            clientName: model.clientName,
            scheduledDate: new Date().toISOString().split('T')[0],
          }}
        />
      )}

      {/* AI Assistant Modal */}
      {isAssistantModalOpen && (
        <ProjectAIAssistantModal
          isOpen={isAssistantModalOpen}
          onClose={() => setIsAssistantModalOpen(false)}
          model={model}
          result={result}
        />
      )}

      {/* Satellite Location Modal */}
      {isSatelliteModalOpen && (
        <SatelliteLocationModal
          isOpen={isSatelliteModalOpen}
          onClose={() => setIsSatelliteModalOpen(false)}
          model={model}
          onApplyClimateData={(updates) => {
            setModel((prev) => ({
              ...prev,
              location: updates.location,
              ambientMaxTempC: updates.ambientMaxTempC,
              ambientMinTempC: updates.ambientMinTempC,
            }));
            showToast('Datos geoclimáticos aplicados al modelo');
          }}
        />
      )}

      {/* App Tutorial Modal */}
      <AppTutorialModal
        isOpen={isTutorialModalOpen}
        onClose={() => setIsTutorialModalOpen(false)}
        onOpenOCR={() => setIsOCRModalOpen(true)}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-amber-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-medium"
          >
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
