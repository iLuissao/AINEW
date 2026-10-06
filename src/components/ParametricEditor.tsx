import React, { useState } from 'react';
import { 
  Settings, 
  Sun, 
  Zap, 
  Battery, 
  Layers, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Shield, 
  Compass,
  ArrowRight
} from 'lucide-react';
import { 
  InstallationModel, 
  ElectricalSystemType, 
  InverterArchitecture, 
  ConduitType, 
  ConductorMaterial, 
  InsulationType,
  RouteConfig
} from '../engine/types';

interface ParametricEditorProps {
  model: InstallationModel;
  onChangeModel: (updated: InstallationModel) => void;
  onResetToPreset: () => void;
}

export const ParametricEditor: React.FC<ParametricEditorProps> = ({
  model,
  onChangeModel,
  onResetToPreset,
}) => {
  const [activeSection, setActiveSection] = useState<'project' | 'pv' | 'inverter' | 'battery' | 'cabinets' | 'routes'>('pv');

  const updatePV = (fields: Partial<InstallationModel['pv']>) => {
    const updatedPV = { ...model.pv, ...fields };
    const vmpString = (updatedPV.modulesPerString || 1) * (updatedPV.vmpV || 40);
    const iscA = updatedPV.iscA || 10;
    const impA = updatedPV.impA || 9;
    const designCurrentA = parseFloat((iscA * 1.56).toFixed(2));

    const updatedRoutes = model.routes.map((r) => {
      if (r.type === 'DC') {
        return {
          ...r,
          voltageV: vmpString > 0 ? vmpString : r.voltageV,
          operatingCurrentA: impA > 0 ? impA : r.operatingCurrentA,
          maxDesignCurrentA: designCurrentA > 0 ? designCurrentA : r.maxDesignCurrentA,
          currentBasisDescription: `Isc (${iscA}A) × 1.56 régimen continuo`,
          ambientTempC: model.ambientMaxTempC,
        };
      }
      return r;
    });

    onChangeModel({
      ...model,
      pv: updatedPV,
      routes: updatedRoutes,
    });
  };

  const updateInverter = (fields: Partial<InstallationModel['inverter']>) => {
    const updatedInv = { ...model.inverter, ...fields };
    const units = updatedInv.numberOfUnits || 1;
    let acNominalCurrent = 0;
    if (updatedInv.maxOutputCurrentA > 0) {
      acNominalCurrent = updatedInv.maxOutputCurrentA * units;
    } else if (updatedInv.ratedPowerKw > 0 && updatedInv.nominalAcVoltageV > 0) {
      if (updatedInv.systemType.includes('3F')) {
        acNominalCurrent = ((updatedInv.ratedPowerKw * 1000) / (Math.sqrt(3) * updatedInv.nominalAcVoltageV)) * units;
      } else {
        acNominalCurrent = ((updatedInv.ratedPowerKw * 1000) / updatedInv.nominalAcVoltageV) * units;
      }
    }
    acNominalCurrent = parseFloat(acNominalCurrent.toFixed(2));
    const acDesignCurrent = parseFloat((acNominalCurrent * 1.25).toFixed(2));

    const updatedRoutes = model.routes.map((r) => {
      if (r.type === 'AC') {
        return {
          ...r,
          systemType: updatedInv.systemType,
          voltageV: updatedInv.nominalAcVoltageV > 0 ? updatedInv.nominalAcVoltageV : r.voltageV,
          operatingCurrentA: acNominalCurrent > 0 ? acNominalCurrent : r.operatingCurrentA,
          maxDesignCurrentA: acDesignCurrent > 0 ? acDesignCurrent : r.maxDesignCurrentA,
          currentBasisDescription: `I_max_ac (${acNominalCurrent}A) × 1.25 continuo`,
          ambientTempC: model.ambientMaxTempC,
        };
      }
      return r;
    });

    onChangeModel({
      ...model,
      inverter: updatedInv,
      routes: updatedRoutes,
    });
  };

  const updateProjectClimate = (ambientMax: number, ambientMin?: number) => {
    const updatedRoutes = model.routes.map((r) => ({
      ...r,
      ambientTempC: ambientMax,
    }));
    onChangeModel({
      ...model,
      ambientMaxTempC: ambientMax,
      ambientMinTempC: ambientMin !== undefined ? ambientMin : model.ambientMinTempC,
      routes: updatedRoutes,
    });
  };

  const updateBattery = (fields: Partial<InstallationModel['battery']>) => {
    onChangeModel({
      ...model,
      battery: { ...model.battery, ...fields },
    });
  };

  const updateRoute = (index: number, fields: Partial<RouteConfig>) => {
    const updatedRoutes = [...model.routes];
    updatedRoutes[index] = { ...updatedRoutes[index], ...fields };
    onChangeModel({
      ...model,
      routes: updatedRoutes,
    });
  };

  const addRoute = (type: 'AC' | 'DC') => {
    const newRoute: RouteConfig = {
      id: `R-${type}-${Date.now().toString().slice(-4)}`,
      name: type === 'DC' ? 'Nuevo String FV → Gabinete DC' : 'Nuevo Alimentador AC → Tablero',
      type,
      origin: type === 'DC' ? 'Arreglo Fotovoltaico' : 'Gabinete AC',
      destination: type === 'DC' ? 'Inversor / Combiner' : 'Centro de Carga',
      lengthM: 15.0,
      systemType: type === 'DC' ? 'DC-2W' : model.inverter.systemType,
      voltageV: type === 'DC' ? (model.pv.modulesPerString * model.pv.vmpV || 600) : model.inverter.nominalAcVoltageV,
      operatingCurrentA: type === 'DC' ? (model.pv.impA || 10) : (model.inverter.maxOutputCurrentA || 20),
      maxDesignCurrentA: type === 'DC' ? (model.pv.iscA * 1.56 || 18) : (model.inverter.maxOutputCurrentA * 1.25 || 25),
      currentBasisDescription: type === 'DC' ? 'Isc × 1.56 régimen continuo' : 'I_max_ac × 1.25 continuo',
      powerFactor: type === 'DC' ? 1.0 : 0.98,
      material: 'Cu',
      insulation: type === 'DC' ? 'PV-Wire' : 'THHW-LS',
      tempRating: '90C',
      ambientTempC: model.ambientMaxTempC,
      rooftopAdderC: type === 'DC' ? 17 : 0,
      conduitType: 'EMT',
      isNipple: false,
      geometry: {
        bends90: 2,
        bends45: 0,
        cabinetEntries: 1,
        cabinetExits: 1,
        supportSpacingM: 1.5,
        isOutdoor: type === 'DC',
      },
    };

    onChangeModel({
      ...model,
      routes: [...model.routes, newRoute],
    });
  };

  const removeRoute = (index: number) => {
    const updatedRoutes = model.routes.filter((_, i) => i !== index);
    onChangeModel({
      ...model,
      routes: updatedRoutes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Editor Header Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Editor Paramétrico de Instalación
          </h2>
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveSection('project')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSection === 'project' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Proyecto & Clima
          </button>
          <button
            onClick={() => setActiveSection('pv')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSection === 'pv' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Módulos FV
          </button>
          <button
            onClick={() => setActiveSection('inverter')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSection === 'inverter' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Inversores
          </button>
          <button
            onClick={() => setActiveSection('battery')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSection === 'battery' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Baterías / ESS
          </button>
          <button
            onClick={() => setActiveSection('cabinets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSection === 'cabinets' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Tableros
          </button>
          <button
            onClick={() => setActiveSection('routes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeSection === 'routes' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Rutas ({model.routes.length})
          </button>
        </div>
      </div>

      {/* SECTION: PROJECT INFO & CLIMATE */}
      {activeSection === 'project' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Compass className="w-4 h-4 text-amber-400" /> Datos Generales y Condiciones Ambientales
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nombre del Proyecto</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 font-medium"
                value={model.projectName}
                onChange={(e) => onChangeModel({ ...model, projectName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Cliente</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 font-medium"
                value={model.clientName}
                onChange={(e) => onChangeModel({ ...model, clientName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Ubicación</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 font-medium"
                value={model.location}
                onChange={(e) => onChangeModel({ ...model, location: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Temp. Ambiente Máxima Diseño (°C)</label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                value={model.ambientMaxTempC}
                onChange={(e) => updateProjectClimate(parseFloat(e.target.value) || 30)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Temp. Ambiente Mínima Diseño (°C)</label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                value={model.ambientMinTempC}
                onChange={(e) => updateProjectClimate(model.ambientMaxTempC, parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION: PV MODULES */}
      {activeSection === 'pv' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sun className="w-4 h-4 text-amber-400" /> Parámetros Eléctricos del Módulo FV (STC)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Fabricante</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                value={model.pv.manufacturer}
                onChange={(e) => updatePV({ manufacturer: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Modelo</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                value={model.pv.model}
                onChange={(e) => updatePV({ model: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Potencia Nominal Pmp (W)</label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-amber-400 font-mono font-bold outline-none focus:border-amber-500"
                value={model.pv.powerW}
                onChange={(e) => updatePV({ powerW: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tensión Circuito Abierto Voc (V)</label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                value={model.pv.vocV}
                onChange={(e) => updatePV({ vocV: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Corriente Cortocircuito Isc (A)</label>
              <input
                type="number"
                step="0.01"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                value={model.pv.iscA}
                onChange={(e) => updatePV({ iscA: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tensión Máx Potencia Vmp (V)</label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                value={model.pv.vmpV}
                onChange={(e) => updatePV({ vmpV: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Corriente Máx Potencia Imp (A)</label>
              <input
                type="number"
                step="0.01"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                value={model.pv.impA}
                onChange={(e) => updatePV({ impA: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Módulos por String</label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono font-bold outline-none focus:border-amber-500"
                value={model.pv.modulesPerString}
                onChange={(e) => {
                  const mps = parseInt(e.target.value) || 1;
                  updatePV({ modulesPerString: mps, totalModules: mps * model.pv.numberOfStrings });
                }}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Número de Strings</label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono font-bold outline-none focus:border-amber-500"
                value={model.pv.numberOfStrings}
                onChange={(e) => {
                  const nos = parseInt(e.target.value) || 1;
                  updatePV({ numberOfStrings: nos, totalModules: nos * model.pv.modulesPerString });
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION: INVERTER */}
      {activeSection === 'inverter' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Zap className="w-4 h-4 text-cyan-400" /> Inversor y Topología de Conversión
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Arquitectura de Inversor</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-cyan-300 font-bold outline-none focus:border-amber-500 cursor-pointer"
                value={model.inverter.architecture}
                onChange={(e) => updateInverter({ architecture: e.target.value as InverterArchitecture })}
              >
                <option value="microinverter">Microinversores (ITM DC = 0)</option>
                <option value="string">Inversor String (Cadena)</option>
                <option value="central">Inversor Central (Combiners)</option>
                <option value="hybrid_ess">Inversor Híbrido + ESS Baterías</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Fabricante & Modelo</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                value={`${model.inverter.manufacturer} ${model.inverter.model}`}
                onChange={(e) => {
                  const parts = e.target.value.split(' ');
                  updateInverter({ manufacturer: parts[0] || '', model: parts.slice(1).join(' ') || '' });
                }}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Potencia Nominal Unitaria (kW)</label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-emerald-400 font-mono font-bold outline-none focus:border-amber-500"
                value={model.inverter.ratedPowerKw}
                onChange={(e) => updateInverter({ ratedPowerKw: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Cantidad de Inversores</label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                value={model.inverter.numberOfUnits || 1}
                onChange={(e) => updateInverter({ numberOfUnits: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Sistema Eléctrico AC</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono outline-none focus:border-amber-500 cursor-pointer"
                value={model.inverter.systemType}
                onChange={(e) => updateInverter({ systemType: e.target.value as ElectricalSystemType })}
              >
                <option value="1F-2H-127V">1F-2H-127V (Fase + Neutro + Tierra)</option>
                <option value="2F-2H-220V">2F-2H-220V (Bifásico sin neutro)</option>
                <option value="2F-3H-120/240V">2F-3H-120/240V (Bifásico con neutro)</option>
                <option value="3F-3H-220V">3F-3H-220V (Trifásico Delta)</option>
                <option value="3F-4H-220/127V">3F-4H-220/127V (Trifásico Estrella)</option>
                <option value="3F-4H-480/277V">3F-4H-480/277V (Trifásico Industrial)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tensión Nominal AC (V)</label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                value={model.inverter.nominalAcVoltageV}
                onChange={(e) => updateInverter({ nominalAcVoltageV: parseFloat(e.target.value) || 220 })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Corriente Máx Salida AC (A)</label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-emerald-400 font-mono font-bold outline-none focus:border-amber-500"
                value={model.inverter.maxOutputCurrentA}
                onChange={(e) => updateInverter({ maxOutputCurrentA: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Eficiencia Inversor (%)</label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                value={model.inverter.efficiencyPercent}
                onChange={(e) => updateInverter({ efficiencyPercent: parseFloat(e.target.value) || 98 })}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION: BATTERY */}
      {activeSection === 'battery' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Battery className="w-4 h-4 text-purple-400" /> Sistema de Almacenamiento ESS
            </h3>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded bg-slate-950 border-slate-700 text-purple-500 focus:ring-purple-500 h-4 w-4"
                checked={model.battery.enabled}
                onChange={(e) => updateBattery({ enabled: e.target.checked })}
              />
              <span className="text-xs font-bold text-slate-300">Habilitar ESS</span>
            </label>
          </div>

          {model.battery.enabled ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Fabricante & Modelo</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                  value={`${model.battery.manufacturer} ${model.battery.model}`}
                  onChange={(e) => {
                    const parts = e.target.value.split(' ');
                    updateBattery({ manufacturer: parts[0] || '', model: parts.slice(1).join(' ') || '' });
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Capacidad Total (kWh)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-purple-400 font-mono font-bold outline-none focus:border-amber-500"
                  value={model.battery.capacityKwh}
                  onChange={(e) => updateBattery({ capacityKwh: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tensión Nominal Banco (V)</label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                  value={model.battery.nominalVoltageV}
                  onChange={(e) => updateBattery({ nominalVoltageV: parseFloat(e.target.value) || 48 })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Corriente Máx Descarga (A)</label>
                <input
                  type="number"
                  step="1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-purple-300 font-mono font-bold outline-none focus:border-amber-500"
                  value={model.battery.maxContinuousDischargeCurrentA}
                  onChange={(e) => updateBattery({ maxContinuousDischargeCurrentA: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              El almacenamiento de baterías se encuentra deshabilitado para este proyecto. Marca la casilla superior si deseas modelar un sistema híbrido o ESS.
            </p>
          )}
        </div>
      )}

      {/* SECTION: CABINETS */}
      {activeSection === 'cabinets' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" /> Tableros, Gabinetes y Cajas de Combinación
            </h3>
            <button
              onClick={() => {
                const newCab = {
                  id: `CAB-${Date.now().toString().slice(-4)}`,
                  name: `Nuevo Gabinete / Tablero`,
                  type: 'Gabinete AC' as const,
                  nemaRating: 'NEMA 3R',
                  location: 'Muro Exterior',
                  circuitsCount: 8,
                };
                onChangeModel({ ...model, cabinets: [...model.cabinets, newCab] });
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agregar Gabinete</span>
            </button>
          </div>

          <div className="space-y-3">
            {model.cabinets.map((cab, index) => (
              <div key={cab.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-500 block mb-1">Nombre</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    value={cab.name}
                    onChange={(e) => {
                      const updated = [...model.cabinets];
                      updated[index].name = e.target.value;
                      onChangeModel({ ...model, cabinets: updated });
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Tipo</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    value={cab.type}
                    onChange={(e) => {
                      const updated = [...model.cabinets];
                      updated[index].type = e.target.value as any;
                      onChangeModel({ ...model, cabinets: updated });
                    }}
                  >
                    <option value="Gabinete AC">Gabinete AC</option>
                    <option value="Gabinete DC / Combiner Box">Gabinete DC / Combiner Box</option>
                    <option value="Tablero AC Principal">Tablero AC Principal</option>
                    <option value="Tablero Subdistribución">Tablero Subdistribución</option>
                    <option value="Caja de Paso">Caja de Paso</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Protección / NEMA</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    value={cab.nemaRating}
                    onChange={(e) => {
                      const updated = [...model.cabinets];
                      updated[index].nemaRating = e.target.value;
                      onChangeModel({ ...model, cabinets: updated });
                    }}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-4 sm:pt-0">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 block mb-1">Ubicación</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                      value={cab.location}
                      onChange={(e) => {
                        const updated = [...model.cabinets];
                        updated[index].location = e.target.value;
                        onChangeModel({ ...model, cabinets: updated });
                      }}
                    />
                  </div>
                  {model.cabinets.length > 1 && (
                    <button
                      onClick={() => {
                        const updated = model.cabinets.filter((_, i) => i !== index);
                        onChangeModel({ ...model, cabinets: updated });
                      }}
                      className="p-2 text-rose-400 hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-800/40 mt-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: ROUTES & GEOMETRY */}
      {activeSection === 'routes' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Gestor de Rutas Físicas, Eléctricas y Geométricas
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => addRoute('DC')}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-amber-500/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ruta DC</span>
              </button>
              <button
                onClick={() => addRoute('AC')}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-emerald-500/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ruta AC</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {model.routes.map((route, index) => (
              <div key={route.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono ${
                      route.type === 'DC' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {route.type}
                    </span>
                    <input
                      type="text"
                      className="bg-transparent text-sm font-bold text-white border-b border-transparent focus:border-amber-500 outline-none"
                      value={route.name}
                      onChange={(e) => updateRoute(index, { name: e.target.value })}
                    />
                  </div>
                  {model.routes.length > 1 && (
                    <button
                      onClick={() => removeRoute(index)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded bg-rose-950/20 border border-rose-900/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Ruta</span>
                    </button>
                  )}
                </div>

                {/* Route Electrical & Physical Parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Origen</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      value={route.origin}
                      onChange={(e) => updateRoute(index, { origin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Destino</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      value={route.destination}
                      onChange={(e) => updateRoute(index, { destination: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Longitud (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-amber-400 font-bold"
                      value={route.lengthM}
                      onChange={(e) => updateRoute(index, { lengthM: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Tensión (V)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-white"
                      value={route.voltageV}
                      onChange={(e) => updateRoute(index, { voltageV: parseFloat(e.target.value) || 220 })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">I_diseño (A)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-emerald-400 font-bold"
                      value={route.maxDesignCurrentA}
                      onChange={(e) => updateRoute(index, { maxDesignCurrentA: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Canalización</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono cursor-pointer"
                      value={route.conduitType}
                      onChange={(e) => updateRoute(index, { conduitType: e.target.value as ConduitType })}
                    >
                      <option value="EMT">EMT (Acero Ligero)</option>
                      <option value="PVC-40">PVC Cédula 40</option>
                      <option value="PVC-80">PVC Cédula 80</option>
                      <option value="IMC">IMC (Acero Semipesado)</option>
                      <option value="LiquidTight">LiquidTight (Hermético)</option>
                    </select>
                  </div>
                </div>

                {/* Geometry Editor for Automatic Accessories */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-purple-400" /> Parámetros Geométricos (Derivación de Accesorios Automática)
                    </span>
                    <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        className="rounded bg-slate-900 border-slate-700 text-amber-500 h-3.5 w-3.5"
                        checked={route.geometry.isOutdoor}
                        onChange={(e) => updateRoute(index, {
                          geometry: { ...route.geometry, isOutdoor: e.target.checked }
                        })}
                      />
                      <span>Instalación Exterior (Intemperie)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Curvas 90°</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-white"
                        value={route.geometry.bends90}
                        onChange={(e) => updateRoute(index, {
                          geometry: { ...route.geometry, bends90: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Curvas 45°</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-white"
                        value={route.geometry.bends45}
                        onChange={(e) => updateRoute(index, {
                          geometry: { ...route.geometry, bends45: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Entradas a Gabinetes</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-white"
                        value={route.geometry.cabinetEntries}
                        onChange={(e) => updateRoute(index, {
                          geometry: { ...route.geometry, cabinetEntries: parseInt(e.target.value) || 1 }
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Salidas de Gabinetes</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-white"
                        value={route.geometry.cabinetExits}
                        onChange={(e) => updateRoute(index, {
                          geometry: { ...route.geometry, cabinetExits: parseInt(e.target.value) || 1 }
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Espaciado Soportería (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-white"
                        value={route.geometry.supportSpacingM}
                        onChange={(e) => updateRoute(index, {
                          geometry: { ...route.geometry, supportSpacingM: parseFloat(e.target.value) || 1.5 }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
