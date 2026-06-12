import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom'
import { Droplets, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import LeafletMap from '../components/LeafletMap';
import bairrosGeoJSON from '../data/bairros/bairros.json';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/mapa', label: 'Mapa' },
  { path: '/portal', label: 'Portal' },
  { path: '/apoio', label: 'Apoio' },
  { path: '/admin', label: 'Admin' },
]

const STATION_KEYS = [
  { codes: ['DCRS-00093'], name: 'São Jerônimo' },
  { codes: ['DCRS-00028'], name: 'Rio Pardo' },
  { codes: ['DCRS-00102', 'Dona Francisca'], name: 'Dona Francisca' },
]

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
  const location = useLocation()
  const [floodLevel, setFloodLevel] = useState(3);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [showRuas, setShowRuas] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mapMode, setMapMode] = useState('satellite');
  const [stations, setStations] = useState({})

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
    const loadFloodData = async () => {
      if (floodLevel === null) return;
      const adjustedLevel = (Math.round(floodLevel * 5) / 5).toFixed(1);
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
  }, [floodLevel]);

  useEffect(() => {
    const abort = new AbortController()
    fetch('/api/stations', { signal: abort.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.stations) return
        const map = {}
        for (const group of Object.values(data.stations)) {
          for (const s of group) {
            if (s?.code) map[s.code] = s
            if (s?.station) map[s.station] = s
          }
        }
        setStations(map)
      })
      .catch(() => {})
    return () => abort.abort()
  }, [])

  const getRiskLevel = useCallback((level) => {
    if (level <= 4) return { label: 'BAIXO RISCO', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500' };
    if (level <= 7) return { label: 'ATENÇÃO', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500' };
    if (level <= 10) return { label: 'ALERTA', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500' };
    return { label: 'PERIGO', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500' };
  }, []);

  const risk = getRiskLevel(floodLevel);

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
    () => ({ lng: -51.723, lat: -29.965, zoom: 14 }),
    [],
  );

  const selectedNome = selectedNeighborhood?.properties?.nome;
  const neighborhoodRisk = selectedNome ? NEIGHBORHOOD_RISK[selectedNome] : null;
  const floodedStreets = selectedNome ? RUAS_ALAGADAS[selectedNome] || [] : [];

  const ALERT_STYLES = {
    'CRÍTICO': { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
    'ALERTA': { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
    'ATENÇÃO': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    'NORMAL': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  };

  const TrendIcon = ({ trend }) => {
    if (trend === 'rising') return <TrendingUp className="w-3 h-3 text-red-400" />
    if (trend === 'falling') return <TrendingDown className="w-3 h-3 text-emerald-400" />
    return <Minus className="w-3 h-3 text-slate-400" />
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 font-sans flex flex-col">
      <div className="flex-shrink-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 shadow-lg">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-800/50">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-lg shadow-primary-500/20">
              G
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100">GeoJeronimo</h1>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium leading-tight">Monitoramento de Cheias</p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
            {STATION_KEYS.map(sk => {
              const s = sk.codes.reduce((found, c) => found || stations[c], null)
              return (
                <div key={sk.codes[0]} className="flex items-center gap-1 sm:gap-1.5 bg-slate-800/80 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-slate-700/50 whitespace-nowrap">
                  <Droplets className="w-3 h-3 text-primary-400 flex-shrink-0" />
                  <div className="leading-tight">
                    <div className="text-[10px] sm:text-xs text-slate-500">{sk.name}</div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs sm:text-sm font-bold text-slate-100 tabular-nums">
                        {s?.level != null ? s.level.toFixed(2) : '--'}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-slate-500">m</span>
                      {s && <TrendIcon trend={s.trend} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Navegação">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all text-sm ${
                  location.pathname === item.path
                    ? 'bg-primary-500/15 text-primary-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                aria-current={location.pathname === item.path ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="px-2 sm:px-3 py-1.5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <span className={`${risk.bg} ${risk.color} ${risk.border} border-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold leading-none`}>
              {risk.label}
            </span>
            {isLoading && (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-400 flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <span className="text-xs sm:text-sm font-black text-primary-400 min-w-[2.5rem] sm:min-w-[3.5rem] text-right tabular-nums">
              {floodLevel.toFixed(1)}m
            </span>
            <input
              type="range"
              min="1" max="15" step="0.2"
              value={floodLevel}
              onChange={(e) => setFloodLevel(parseFloat(e.target.value))}
              className="flex-1 h-1.5 sm:h-2 bg-gradient-to-r from-emerald-500 via-amber-500 via-orange-500 to-red-500 rounded-full appearance-none cursor-pointer accent-primary-400"
            />
            <div className="flex items-center gap-1 flex-shrink-0">
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
                {showRuas ? 'Ocultar Ruas' : 'Mostrar Ruas'}
              </button>
            </div>
          </div>
        </div>

        {selectedNeighborhood && (
          <div className="px-2 sm:px-3 py-1 bg-slate-800/80 border-t border-slate-700/30 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs sm:text-sm font-bold text-primary-400 whitespace-nowrap">{selectedNome}</span>
            {neighborhoodRisk && (() => {
              const a = ALERT_STYLES[neighborhoodRisk.alert] || ALERT_STYLES.NORMAL;
              return <span className={`${a.bg} ${a.text} ${a.border} border px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold leading-none whitespace-nowrap`}>{neighborhoodRisk.alert}</span>;
            })()}

            {floodedStreets.length > 0 && showRuas && (
              <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
                <span className="text-[10px] sm:text-[11px] text-slate-500 whitespace-nowrap">Ruas:</span>
                <div className="flex gap-1">
                  {floodedStreets.map((street, i) => (
                    <span key={i} className="text-[10px] sm:text-[11px] text-slate-300 bg-slate-700/50 px-1.5 py-0.5 rounded whitespace-nowrap">{street}</span>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleClearSelection}
              className="ml-auto text-[10px] sm:text-[11px] font-medium px-1.5 sm:px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all flex-shrink-0">
              × Limpar
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 relative">
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
