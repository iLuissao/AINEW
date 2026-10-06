import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Sun,
  Thermometer,
  Compass,
  Layers,
  Search,
  CheckCircle2,
  RefreshCw,
  X,
  TrendingUp,
  Zap,
  Globe,
  Maximize2,
  Mountain,
  Snowflake,
  Flame,
  Activity,
  Ruler,
  Grid
} from 'lucide-react';
import L from 'leaflet';
import { SolarClimateData, fetchSolarAndGeoData } from '../engine/geoSolarService';
import { InstallationModel } from '../engine/types';

interface SatelliteLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: InstallationModel;
  onApplyClimateData: (updates: {
    location: string;
    ambientMaxTempC: number;
    ambientMinTempC: number;
    roofTiltDeg?: number;
  }) => void;
}

export const SatelliteLocationModal: React.FC<SatelliteLocationModalProps> = ({
  isOpen,
  onClose,
  model,
  onApplyClimateData,
}) => {
  const [searchQuery, setSearchQuery] = useState(model.location || 'Av. Paseo del Pípila 75, Naucalpan');
  const [solarData, setSolarData] = useState<SolarClimateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapLayer, setMapLayer] = useState<'satellite' | 'hybrid' | 'streets'>('satellite');
  const [roofAreaM2, setRoofAreaM2] = useState<number>(65); // Default estimated roof area
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Module dimensions (590W standard: 2.27m x 1.13m = 2.57 m² + spacing)
  const moduleAreaM2 = 2.8;
  const modulesThatFit = Math.floor((roofAreaM2 * 0.75) / moduleAreaM2); // 75% usable area after setbacks

  // Load initial data based on project location
  useEffect(() => {
    if (isOpen) {
      const initialAddress = model.location || 'Av. Paseo del Pípila 75, Manuel Ávila Camacho, Naucalpan';
      setSearchQuery(initialAddress);
      loadGeoAndSolar(initialAddress);
    }
  }, [isOpen]);

  const loadGeoAndSolar = async (query: string, customLat?: number, customLon?: number) => {
    setIsLoading(true);
    try {
      const data = await fetchSolarAndGeoData(query, customLat, customLon);
      setSolarData(data);
      if (leafletMapRef.current && data.location) {
        leafletMapRef.current.setView([data.location.lat, data.location.lon], 18);
        if (markerRef.current) {
          markerRef.current.setLatLng([data.location.lat, data.location.lon]);
        }
      }
    } catch (e) {
      console.error('Error fetching solar/geo data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize or update Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const initialLat = solarData?.location.lat || 19.4785;
    const initialLon = solarData?.location.lon || -99.2396;

    // Clean container if it previously had a leaflet instance attached
    if ((mapContainerRef.current as any)._leaflet_id) {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      (mapContainerRef.current as any)._leaflet_id = null;
    }

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: 18,
        zoomControl: true,
        attributionControl: false,
      });

      // Satellite Tile Provider (ESRI World Imagery High-Res)
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
        }
      ).addTo(map);

      tileLayerRef.current = satLayer;

      // Custom Glowing Pin Marker
      const customIcon = L.divIcon({
        className: 'custom-solar-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 36px; height: 36px; background: rgba(245, 158, 11, 0.4); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 22px; height: 22px; background: #f59e0b; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 15px rgba(245, 158, 11, 0.8);"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([initialLat, initialLon], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        loadGeoAndSolar('', pos.lat, pos.lng);
      });

      markerRef.current = marker;
      leafletMapRef.current = map;

      // Map click reposition
      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        loadGeoAndSolar('', e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      // Cleanup on unmount
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isOpen]);

  // Update map layer tile source
  const handleChangeLayer = (layer: 'satellite' | 'hybrid' | 'streets') => {
    setMapLayer(layer);
    if (!leafletMapRef.current || !tileLayerRef.current) return;

    leafletMapRef.current.removeLayer(tileLayerRef.current);

    let url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    if (layer === 'streets') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    } else if (layer === 'hybrid') {
      url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    }

    const newLayer = L.tileLayer(url, { maxZoom: 20 }).addTo(leafletMapRef.current);
    tileLayerRef.current = newLayer;
  };

  const handleApplyToProject = () => {
    if (!solarData) return;
    onApplyClimateData({
      location: solarData.location.formattedAddress,
      ambientMaxTempC: solarData.ambientMaxTempC,
      ambientMinTempC: solarData.ambientMinTempC,
      roofTiltDeg: solarData.optimalTiltDeg,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        >
          {/* Top Bar Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Visor Satelital de Azotea & Recurso Solar
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                    NASA / OPEN-METEO
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Extracción climática en tiempo real: $T_{'{'}max{'}'}$ (Art. 310), $T_{'{'}min{'}'}$ en frío (Art. 690-7) e Irradiancia solar (HSP).
                </p>
              </div>
            </div>

            {/* Address Search Bar */}
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar calle, colonia, municipio o coordenadas..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      loadGeoAndSolar(searchQuery);
                    }
                  }}
                />
              </div>
              <button
                onClick={() => loadGeoAndSolar(searchQuery)}
                disabled={isLoading}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition shadow cursor-pointer whitespace-nowrap"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Explorar'}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
            
            {/* Left Column: High-Resolution Satellite Map (7 cols on lg) */}
            <div className="lg:col-span-7 flex flex-col relative bg-slate-950 border-r border-slate-800 min-h-[350px] lg:min-h-[520px]">
              
              {/* Map Layer Switcher overlay */}
              <div className="absolute top-3 left-3 z-[400] flex bg-slate-900/90 backdrop-blur-md rounded-xl p-1 border border-slate-700/80 shadow-lg text-xs font-medium">
                <button
                  onClick={() => handleChangeLayer('satellite')}
                  className={`px-3 py-1 rounded-lg transition ${
                    mapLayer === 'satellite' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Satelital HD
                </button>
                <button
                  onClick={() => handleChangeLayer('hybrid')}
                  className={`px-3 py-1 rounded-lg transition ${
                    mapLayer === 'hybrid' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Híbrido
                </button>
                <button
                  onClick={() => handleChangeLayer('streets')}
                  className={`px-3 py-1 rounded-lg transition ${
                    mapLayer === 'streets' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Calles
                </button>
              </div>

              {/* Coordinates Pill */}
              {solarData && (
                <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-lg text-[11px] font-mono text-slate-300 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lat: {solarData.location.lat.toFixed(4)}° | Lon: {solarData.location.lon.toFixed(4)}° | Elev: {solarData.location.elevationM} msnm</span>
                </div>
              )}

              {/* Leaflet Map DOM Container */}
              <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

              {/* Rooftop Quick Sizer Overlay */}
              <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2">
                  <Ruler className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-300 font-medium">Área Estimada de Azotea:</span>
                  <input
                    type="number"
                    min="10"
                    max="2000"
                    step="5"
                    value={roofAreaM2}
                    onChange={(e) => setRoofAreaM2(parseFloat(e.target.value) || 20)}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono font-bold"
                  />
                  <span className="text-slate-400">m²</span>
                </div>

                <div className="flex items-center space-x-2 font-mono text-xs">
                  <span className="text-slate-400">Capacidad Máxima:</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    ~{modulesThatFit} paneles ({(modulesThatFit * (model.pv.powerW || 590) / 1000).toFixed(1)} kWp)
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Solar Resource & Microclimate Parameters (5 cols on lg) */}
            <div className="lg:col-span-5 p-5 overflow-y-auto space-y-4 bg-slate-900">
              
              {solarData ? (
                <>
                  {/* Location Info Banner */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Ubicación Geográfica Detectada</span>
                    <h4 className="text-xs font-bold text-white leading-relaxed">{solarData.location.formattedAddress}</h4>
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
                      <span>{solarData.location.city}, {solarData.location.state}</span>
                      <span>•</span>
                      <span className="text-amber-400">{solarData.climateZone}</span>
                    </div>
                  </div>

                  {/* 4 Core Parametric Climate Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* T_max Design (Art. 310) */}
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-amber-500/30 space-y-1">
                      <div className="flex items-center justify-between text-amber-400">
                        <span className="text-[10px] font-mono uppercase font-bold">T_max Diseño</span>
                        <Flame className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-xl font-mono font-extrabold text-amber-300">{solarData.ambientMaxTempC}°C</div>
                      <p className="text-[10px] text-slate-400 font-mono">Factor Ft Ampacidad (Art. 310)</p>
                    </div>

                    {/* T_min Extreme (Art. 690-7 Voc Cold) */}
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-blue-500/30 space-y-1">
                      <div className="flex items-center justify-between text-blue-400">
                        <span className="text-[10px] font-mono uppercase font-bold">T_min Histórica</span>
                        <Snowflake className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-xl font-mono font-extrabold text-blue-300">{solarData.ambientMinTempC}°C</div>
                      <p className="text-[10px] text-slate-400 font-mono">Voc en frío (Art. 690-7)</p>
                    </div>

                    {/* Peak Sun Hours (HSP) */}
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-emerald-500/30 space-y-1">
                      <div className="flex items-center justify-between text-emerald-400">
                        <span className="text-[10px] font-mono uppercase font-bold">HSP Promedio</span>
                        <Sun className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-xl font-mono font-extrabold text-emerald-300">{solarData.dailyAverageGHI_kWh_m2}</div>
                      <p className="text-[10px] text-slate-400 font-mono">kWh/m²/día de irradiación</p>
                    </div>

                    {/* Optimal Tilt & Azimuth */}
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-purple-500/30 space-y-1">
                      <div className="flex items-center justify-between text-purple-400">
                        <span className="text-[10px] font-mono uppercase font-bold">Inclinación Óptima</span>
                        <Compass className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-xl font-mono font-extrabold text-purple-300">{solarData.optimalTiltDeg}°</div>
                      <p className="text-[10px] text-slate-400 font-mono">Azimut 180° Sur Geográfico</p>
                    </div>
                  </div>

                  {/* Monthly Solar Irradiance Bar Chart */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                        <span>Perfil Mensual de Irradiancia (HSP)</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        ~{solarData.yearlySpecificYield_kWh_kWp} kWh/kWp/año
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-1 h-20 items-end pt-2">
                      {solarData.monthlyHSP.map((item, idx) => {
                        const heightPct = Math.round((item.hsp / 7.0) * 100);
                        return (
                          <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group relative">
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t transition-all group-hover:from-amber-400 group-hover:to-amber-300"
                            />
                            <span className="text-[9px] font-mono text-slate-400">{item.month[0]}</span>
                            
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 bg-slate-900 border border-slate-700 text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap text-white">
                              <span>{item.month}: {item.hsp} HSP</span>
                              <span className="text-amber-400">{item.avgTempC}°C</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sync Action Call-To-Action Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleApplyToProject}
                      className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 transition shadow-lg cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sincronizar Variables Climáticas al Proyecto ({solarData.ambientMaxTempC}°C / {solarData.ambientMinTempC}°C)</span>
                    </button>
                    <p className="text-[10px] text-slate-500 text-center mt-2 font-mono">
                      Ajustará automáticamente los factores térmicos de todos los conductores y la tensión $V_{'{'}oc{'}'}$ en frío según NOM-001.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="text-xs font-mono">Consultando datos satelitales y solares...</span>
                </div>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
