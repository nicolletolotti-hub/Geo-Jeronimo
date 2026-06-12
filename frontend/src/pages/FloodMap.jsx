import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import LeafletMap from '../components/LeafletMap';
import bairrosGeoJSON from '../data/bairros/bairros.json';

const floodCache = {};

const NEIGHBORHOOD_RISK = {
  'Cidade Baixa': { alert: 'ATENÇÃO', color: 'text-amber-400', bg: 'bg-amber-500/20', floodedStreets: 8 },
  'Centro': { alert: 'ALERTA', color: 'text-orange-400', bg: 'bg-orange-500/20', floodedStreets: 12 },
  'Bela Vista': { alert: 'ATENÇÃO', color: 'text-amber-400', bg: 'bg-amber-500/20', floodedStreets: 5 },
  'Fátima': { alert: 'CRÍTICO', color: 'text-red-400', bg: 'bg-red-500/20', floodedStreets: 15 },
  'Quininho': { alert: 'ALERTA', color: 'text-orange-400', bg: 'bg-orange-500/20', floodedStreets: 10 },
  'Cidade Alta': { alert: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/20', floodedStreets: 2 },
  'Capororóca': { alert: 'ATENÇÃO', color: 'text-amber-400', bg: 'bg-amber-500/20', floodedStreets: 6 },
  'São Thomás': { alert: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/20', floodedStreets: 1 },
  'Princesa Isabel': { alert: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/20', floodedStreets: 0 },
  'Passo D\'Areia': { alert: 'ATENÇÃO', color: 'text-amber-400', bg: 'bg-amber-500/20', floodedStreets: 4 },
  'Bandeira Branca': { alert: 'CRÍTICO', color: 'text-red-400', bg: 'bg-red-500/20', floodedStreets: 20 },
  'Parque de Exposições': { alert: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/20', floodedStreets: 0 },
  'Padre Reus': { alert: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/20', floodedStreets: 0 },
  'São Francisco': { alert: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/20', floodedStreets: 0 },
  'Residencial Bela Vista': { alert: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/20', floodedStreets: 0 },
  'Lago Parque Clube': { alert: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/20', floodedStreets: 0 },
  'Passo da Cruz': { alert: 'ATENÇÃO', color: 'text-amber-400', bg: 'bg-amber-500/20', floodedStreets: 3 },
  'Porto do Conde': { alert: 'CRÍTICO', color: 'text-red-400', bg: 'bg-red-500/20', floodedStreets: 18 },
};

const RUAS_ALAGADAS = {
  'Cidade Baixa': ['Cel. Augusto Pereira', 'Dr. Roque', 'João XXIII', '7 de Setembro', '1° de Maio', 'das Acácias', 'dos Andradas', 'Amazonas'],
  'Centro': ['Cel. Joaquim Pedro', 'Dr. Dinis', '15 de Novembro', '20 de Setembro', 'do Comércio', 'dos Ferroviários', 'Júlio de Castilhos', 'Setembrino', 'Venâncio Aires', 'Pinheiro Machado', 'Ceará', 'São Paulo'],
  'Fátima': ['Rua 1', 'Rua 2', 'Rua 3', 'Av. B', 'Rua 5', 'Rua 6', 'Rua 7', 'Rua 8', 'Rua 9', 'Rua 10', 'Rua 11', 'Rua 12', 'Rua 13', 'Rua 14', 'Rua 15'],
  'Quininho': ['Rua A', 'Rua B', 'Rua C', 'Rua D', 'Rua E', 'da Amizade', 'do Sol', 'das Flores', 'dos Pássaros', 'Verde'],
  'Bandeira Branca': ['Principal', 'Av. Central', 'Rua 1', 'Rua 2', 'Rua 3', 'Rua 4', 'Rua 5', 'Rua 6', 'Rua 7', 'Rua 8', 'Rua 9', 'Rua 10', 'Rua 11', 'Rua 12', 'Rua 13', 'Rua 14', 'Rua 15', 'Rua 16', 'Rua 17', 'Rua 18'],
  'Porto do Conde': ['Estrada Porto do Conde', 'Principal', 'do Porto', 'da Praia', 'do Lago', 'Rua 1', 'Rua 2', 'Rua 3', 'Rua 4', 'Rua 5', 'Rua 6', 'Rua 7', 'Rua 8', 'Rua 9', 'Rua 10', 'Rua 11', 'Rua 12', 'Rua 13'],
  'Passo da Cruz': ['da Figueira', 'do Santuário', 'das Pedras'],
  'Capororóca': ['Capororoca', 'do Campo', 'da Serra', 'da Várzea', 'do Riacho', 'da Lagoa'],
  'Cidade Alta': ['do Alto', 'do Mirante'],
  'Passo D\'Areia': ['Estrada Passo D\'Areia', 'do Areal', 'do Meio', 'da Fonte'],
  'São Thomás': ['São Thomás'],
  'Bela Vista': ['Bela Vista', 'do Morro', 'da Paz', 'da Serra', 'do Vale'],
};

export default function FloodMap() {
  const [floodLevel, setFloodLevel] = useState(3);
  const [useRealTime, setUseRealTime] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [showRuas, setShowRuas] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mapMode, setMapMode] = useState('satellite');
  const [showSimulator, setShowSimulator] = useState(true);

  const [floodData, setFloodData] = useState(null);
  const [ruasData, setRuasData] = useState(null);
  const [municipioData, setMunicipioData] = useState(null);
  const bairrosData = bairrosGeoJSON;

  const cacheRef = useRef(floodCache);

  useEffect(() => {
    const loadGeoData = async (url, setData, cacheKey) => {
      setIsLoading(true);
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          setData(JSON.parse(cachedData));
          setIsLoading(false);
          return;
        }
        const response = await fetch(url);
        const data = await response.json();
        setData(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (error) {
        console.error(`Erro ao carregar dados de ${url}:`, error);
      } finally {
        setIsLoading(false);
      }
    };
    loadGeoData('/ruas/ruas.geojson', setRuasData, 'geojeronimo_ruas_cache');
    loadGeoData('/limites/municipio_mask.geojson', setMunicipioData, 'geojeronimo_municipio_cache');
  }, []);

  useEffect(() => {
    const activeFloodLevel = useRealTime ? 9.9 : floodLevel;
    const loadFloodData = async () => {
      if (activeFloodLevel === null) return;
      const adjustedLevel = (Math.round(activeFloodLevel * 5) / 5).toFixed(1);
      const levelString = adjustedLevel.endsWith('.0') ? adjustedLevel.slice(0, -2) : adjustedLevel;
      const filePath = `/inundacao/flood_${levelString}m_clean.geojson`;

      if (cacheRef.current[filePath]) {
        setFloodData(cacheRef.current[filePath]);
        return;
      }

      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          setFloodData(null);
          return;
        }
        const data = await response.json();
        cacheRef.current[filePath] = data;
        setFloodData(data);
      } catch (error) {
        console.error('Falha ao carregar dados de inundação:', error);
      }
    };
    const timer = setTimeout(loadFloodData, 300);
    return () => clearTimeout(timer);
  }, [floodLevel, useRealTime]);

  const getRiskLevel = useCallback((level) => {
    if (level <= 4) return { label: 'BAIXO RISCO', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500' };
    if (level <= 7) return { label: 'ATENÇÃO', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500' };
    if (level <= 10) return { label: 'ALERTA', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500' };
    return { label: 'PERIGO', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500' };
  }, []);

  const activeFloodLevel = useRealTime ? 9.9 : floodLevel;
  const risk = getRiskLevel(activeFloodLevel);

  const handleNeighborhoodClick = useCallback((feature) => {
    setSelectedNeighborhood((prev) => {
      if (prev?.properties?.nome === feature.properties?.nome) return prev;
      return feature;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedNeighborhood(null);
    setShowRuas(false);
  }, []);

  const initialState = useMemo(
    () => ({ lng: -51.723, lat: -29.965, zoom: 14, pitch: 0, bearing: 0 }),
    [],
  );

  const selectedNome = selectedNeighborhood?.properties?.nome;
  const neighborhoodRisk = selectedNome ? NEIGHBORHOOD_RISK[selectedNome] : null;
  const floodedStreets = selectedNome ? RUAS_ALAGADAS[selectedNome] || [] : [];

  const ALERT_STYLES = {
    'CRÍTICO': { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', icon: '🚨' },
    'ALERTA': { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', icon: '⚠️' },
    'ATENÇÃO': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: '⚡' },
    'NORMAL': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: '✓' },
  };

  return (
    <div className="h-dvh w-screen overflow-hidden bg-slate-950 font-sans flex flex-col">
      <div className="flex-shrink-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 shadow-lg z-50">
        <div className="px-2 sm:px-3 py-1.5 flex flex-wrap items-center gap-1.5 sm:gap-3 justify-between">
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-100">GeoJeronimo</h1>
            <span className={`${risk.bg} ${risk.color} ${risk.border} border-2 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold leading-none`}>
              {risk.label}
            </span>
            {isLoading && (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-400 flex-shrink-0" />
            )}
          </div>

          {showSimulator && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-[120px] sm:min-w-[200px] max-w-xl order-last sm:order-none basis-full sm:basis-auto mt-1 sm:mt-0">
              <span className="text-xs sm:text-sm font-black text-primary-400 min-w-[2.5rem] sm:min-w-[3.5rem] text-right">
                {activeFloodLevel.toFixed(1)}m
              </span>
              <input
                type="range"
                min="1" max="15" step="0.2"
                value={floodLevel}
                onChange={(e) => setFloodLevel(parseFloat(e.target.value))}
                className="flex-1 h-1.5 sm:h-2 bg-gradient-to-r from-emerald-500 via-amber-500 via-orange-500 to-red-500 rounded-full appearance-none cursor-pointer accent-primary-400"
              />
              {useRealTime && (
                <span className="px-1 py-0.5 bg-emerald-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full leading-none">REAL</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <button onClick={() => setShowSimulator(!showSimulator)}
              className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-medium rounded-lg transition-colors ${showSimulator ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-800 text-slate-400'}`}>
              Nível
            </button>
            <div className="flex bg-slate-800 rounded-lg p-0.5">
              {[
                { key: 'satellite', label: 'Sat' },
                { key: 'street', label: 'Std' },
                { key: 'topo', label: 'Topo' },
              ].map(m => (
                <button key={m.key} onClick={() => setMapMode(m.key)}
                  className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-medium rounded-md transition-all ${mapMode === m.key ? 'bg-primary-500/20 text-primary-400' : 'text-slate-400 hover:text-slate-200'}`}>
                  {m.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowRuas(!showRuas)}
              className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-medium rounded-lg transition-colors ${showRuas ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
              Ruas
            </button>
          </div>
        </div>

        {selectedNeighborhood && (
          <div className="px-2 sm:px-3 py-1 bg-slate-800/80 border-t border-slate-700/30 flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span className="text-xs sm:text-sm font-bold text-primary-400 whitespace-nowrap">{selectedNome}</span>
              {neighborhoodRisk && (() => {
                const a = ALERT_STYLES[neighborhoodRisk.alert] || ALERT_STYLES.NORMAL;
                return <span className={`${a.bg} ${a.text} ${a.border} border px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold leading-none whitespace-nowrap`}>{a.icon} {neighborhoodRisk.alert}</span>;
              })()}
            </div>

            {floodedStreets.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0 min-w-0">
                <span className="text-[10px] sm:text-[11px] text-slate-500 whitespace-nowrap">Ruas:</span>
                <div className="flex gap-1 overflow-x-auto">
                  {floodedStreets.map((street, i) => (
                    <span key={i} className="text-[10px] sm:text-[11px] text-slate-300 bg-slate-700/50 px-1.5 py-0.5 rounded whitespace-nowrap">{street}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1 ml-auto flex-shrink-0">
              <button onClick={() => setShowRuas(!showRuas)}
                className={`text-[10px] sm:text-[11px] font-medium px-1.5 sm:px-2.5 py-1 rounded-lg transition-all ${showRuas ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-800 text-slate-400'}`}>
                {showRuas ? 'Ocultar' : 'Ruas'}
              </button>
              <button onClick={handleClearSelection}
                className="text-[10px] sm:text-[11px] font-medium px-1.5 sm:px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all">
                × Limpar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 relative min-h-0">
        <LeafletMap
          initialState={initialState}
          selectedNeighborhood={selectedNeighborhood}
          floodData={floodData}
          bairrosData={bairrosData}
          municipioData={municipioData}
          ruasData={ruasData}
          showRuas={showRuas}
          mapMode={mapMode}
          onNeighborhoodClick={handleNeighborhoodClick}
        />
      </div>
    </div>
  );
}
