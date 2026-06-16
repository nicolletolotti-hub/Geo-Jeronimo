import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import MapLibreMap from '../components/MapLibreMap';
import bairrosGeoJSON from '../data/bairros/bairros.json';
import { getCachedData, setCachedData } from '../utils/cacheManager';

const navItems = [
  { path: '/mapa', label: 'Mapa de Inundação' },
  { path: '/portal', label: 'Painel do Morador' },
  { path: '/admin', label: 'Painel do Servidor' },
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
  const [ruasSearch, setRuasSearch] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mapMode, setMapMode] = useState('satellite');
  const [stations, setStations] = useState({})

  const [floodData, setFloodData] = useState(null);
  const [floodDataNear, setFloodDataNear] = useState(null);
  const [ruasData, setRuasData] = useState(null);
  const [municipioData, setMunicipioData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [heatmapData, setHeatmapData] = useState(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState([]);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const bairrosData = bairrosGeoJSON;

  const cacheRef = useRef(floodCache);

  useEffect(() => {
    const loadGeoData = async (url, setData, cacheKey) => {
      setIsLoading(true);
      try {
        const cachedRaw = getCachedData(cacheKey);
        if (cachedRaw) {
          setData(cachedRaw);
          setIsLoading(false);
          return;
        }
        const response = await fetch(url);
        const data = await response.json();
        setData(data);
        setCachedData(cacheKey, data);
      } catch (error) {
        console.error(`Erro ao carregar dados de ${url}:`, error);
      } finally {
        setIsLoading(false);
      }
    };
    loadGeoData('/ruas/ruas.geojson', setRuasData, 'geojeronimo_ruas_cache');
    loadGeoData('/limites/municipio_mask.geojson', setMunicipioData, 'geojeronimo_municipio_cache');
  }, []);

  async function fetchFloodFile(level) {
    const adjusted = Math.round(level * 5) / 5;
    const cacheKey = `flood:${adjusted}`;
    if (cacheRef.current[cacheKey]) return cacheRef.current[cacheKey];
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const tryPaths = [() => `${apiUrl}/flood/geojson/${adjusted}`];
    const s = adjusted % 1 === 0 ? `${adjusted}m` : `${adjusted.toFixed(1)}m`;
    tryPaths.push(() => `/inundacao/flood_${s}_clean.geojson`);
    for (const getPath of tryPaths) {
      try {
        const resp = await fetch(getPath());
        if (resp.ok) {
          const data = await resp.json();
          cacheRef.current[cacheKey] = data;
          return data;
        }
      } catch {}
    }
    return null;
  }

  useEffect(() => {
    const loadFloodData = async () => {
      if (floodLevel === null || floodLevel < 1) return;
      const data = await fetchFloodFile(floodLevel);
      if (!data) {
        for (let fb = Math.round((floodLevel - 0.2) * 5) / 5; fb >= 1; fb = Math.round((fb - 0.2) * 5) / 5) {
          const fbData = await fetchFloodFile(fb);
          if (fbData) { setFloodData(fbData); return; }
        }
        setFloodData(null);
        return;
      }
      setFloodData(data);
      const nearData = await fetchFloodFile(floodLevel + 0.5);
      setFloodDataNear(nearData);
    };
    const timer = setTimeout(loadFloodData, 300);
    return () => clearTimeout(timer);
  }, [floodLevel]);

  useEffect(() => {
    const abort = new AbortController()
    const apiUrl = import.meta.env.VITE_API_URL || '/api'
    fetch(`${apiUrl}/stations`, { signal: abort.signal })
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

  useEffect(() => {
    const abort = new AbortController()
    const apiUrl = import.meta.env.VITE_API_URL || '/api'
    fetch(`${apiUrl}/river/history?hours=72`, { signal: abort.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const points = data.data || []
        const now = Date.now()
        const h72 = now - 72 * 3600000
        const h24 = now - 24 * 3600000
        let tresDias = null, ontem = null, minDist72 = Infinity, minDist24 = Infinity
        for (const p of points) {
          const t = new Date(p.timestamp).getTime()
          const d72 = Math.abs(t - h72), d24 = Math.abs(t - h24)
          if (d72 < minDist72) { minDist72 = d72; tresDias = p.level }
          if (d24 < minDist24) { minDist24 = d24; ontem = p.level }
        }
        setHistoryData({ tresDias, ontem, statistics: data.statistics })
      })
      .catch(() => {})
    return () => abort.abort()
  }, [])

  const getRiskLevel = useCallback((level) => {
    if (level < 6) return { label: 'BAIXO RISCO', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500' };
    if (level < 9) return { label: 'ATENÇÃO', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500' };
    if (level < 12) return { label: 'ALERTA', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500' };
    return { label: 'PERIGO', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500' };
  }, []);

  const risk = getRiskLevel(floodLevel);

  const handleNeighborhoodClick = useCallback((feature) => {
    setSelectedNeighborhood((prev) => {
      if (prev?.properties?.nome === feature.properties?.nome) return prev;
      return feature;
    });
  }, []);

  useEffect(() => {
    if (!heatmapMode) { setHeatmapData(null); return; }
    const apiUrl = import.meta.env.VITE_API_URL || '/api'
    fetch(`${apiUrl}/residence/locations`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setHeatmapData(Array.isArray(data) ? data : []))
      .catch(() => setHeatmapData([]))
  }, [heatmapMode])

  const handleAddressSearch = useCallback((e) => {
    const q = e.target.value
    setAddressQuery(q)
    if (!q || q.length < 2 || !ruasData) { setAddressResults([]); return }
    const normalized = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const found = []
    const seen = new Set()
    for (const f of ruasData.features) {
      const name = f.properties?.name || f.properties?.nome || ''
      if (!name) continue
      const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (n.includes(normalized) && !seen.has(name)) {
        seen.add(name)
        found.push({ name, coords: f.geometry.coordinates })
        if (found.length >= 10) break
      }
    }
    setAddressResults(found)
  }, [ruasData])

  const handleAddressSelect = useCallback((result) => {
    setAddressQuery(result.name)
    setAddressResults([])
    setShowAddressSearch(false)
    let lng = result.coords[0], lat = result.coords[1]
    if (Array.isArray(result.coords[0])) {
      lng = result.coords[0][0]; lat = result.coords[0][1]
    }
    setSelectedNeighborhood(null)
    setShowRuas(true)
    setTimeout(() => {
      window.__flyTo?.({ center: [lng, lat], zoom: 17 })
    }, 100)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedNeighborhood(null);
    setShowRuas(false);
    setHeatmapMode(false);
  }, []);

  const initialState = useMemo(
    () => ({ lng: -51.723, lat: -29.965, zoom: 15 }),
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
              const levelColor = !s?.level ? 'bg-slate-500'
                : s.level >= 9 ? 'bg-red-500'
                : s.level >= 6 ? 'bg-amber-500'
                : s.level >= 4 ? 'bg-yellow-500'
                : 'bg-emerald-500'
              return (
                <div key={sk.codes[0]} className="flex items-center gap-1 sm:gap-1.5 bg-slate-800/80 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-slate-700/50 whitespace-nowrap">
                  <div className={`w-2 h-2 rounded-full ${levelColor} flex-shrink-0`} />
                  <div className="leading-tight">
                    <div className="text-[10px] sm:text-xs text-slate-500">{sk.name}</div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs sm:text-sm font-bold text-slate-100 tabular-nums">
                        {s?.level != null ? s.level.toFixed(2) : '--'}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-slate-500">m</span>
                      {s && <TrendIcon trend={s.trend} />}
                      {s?.trendRate > 0 && (
                        <span className="text-[9px] sm:text-[10px] text-slate-500">
                          {s.trendRate.toFixed(1)}cm/h
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {historyData && (
              <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-800/80 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-slate-700/50 whitespace-nowrap">
                <div className="leading-tight">
                  <div className="text-[10px] sm:text-xs text-slate-500">Jacuí (histórico)</div>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400">
                    {historyData.tresDias != null && <span>3d: <b className="text-slate-100">{historyData.tresDias.toFixed(2)}m</b></span>}
                    {historyData.ontem != null && <span>ontem: <b className="text-slate-100">{historyData.ontem.toFixed(2)}m</b></span>}
                    {historyData.statistics?.current != null && <span>agora: <b className="text-slate-100">{historyData.statistics.current.toFixed(2)}m</b></span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
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
            <button
              onClick={() => setIsMenuOpen(v => !v)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <nav className="lg:hidden px-3 py-2 border-b border-slate-800/50 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                  location.pathname === item.path
                    ? 'bg-primary-500/15 text-primary-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="px-2 sm:px-3 py-1.5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <span className={`${risk.bg} ${risk.color} ${risk.border} border-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold leading-none`}>
              {risk.label}
            </span>
            {isLoading && (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-400 flex-shrink-0" />
            )}
            <button onClick={() => setShowAddressSearch(v => !v)}
              className="px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-medium rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition-colors">
              🔍
            </button>
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
              <button onClick={() => setHeatmapMode(v => !v)}
                className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-medium rounded-lg transition-colors ${heatmapMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                {heatmapMode ? 'Calor ON' : 'Calor'}
              </button>

            </div>
          </div>
        </div>

        {showAddressSearch && (
          <div className="px-2 sm:px-3 py-1.5 bg-slate-800/90 border-t border-slate-700/30">
            <div className="relative">
              <input
                type="text" value={addressQuery} onChange={handleAddressSearch}
                placeholder="Buscar rua..." autoFocus
                className="w-full bg-slate-700 text-slate-100 px-3 py-1.5 rounded-lg text-xs border border-slate-600 placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
              {addressResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-40 overflow-y-auto z-50">
                  {addressResults.map((r, i) => (
                    <button key={i} onClick={() => handleAddressSelect(r)}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors">
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
        <MapLibreMap
          initialState={initialState}
          selectedNeighborhood={selectedNeighborhood}
          floodData={floodData}
          floodDataNear={floodDataNear}
          bairrosData={bairrosData}
          municipioData={municipioData}
          ruasData={ruasData}
          ruasSearch={ruasSearch}
          showRuas={showRuas}
          mapMode={mapMode}
          heatmapMode={heatmapMode}
          heatmapData={heatmapData}
          onNeighborhoodClick={handleNeighborhoodClick}
        />
        <div className="absolute bottom-28 left-4 bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700 p-3 z-[1000] select-none">
          <h4 className="text-xs font-bold text-slate-200 mb-2">Legenda</h4>
          <div className="space-y-1.5">
            {!heatmapMode ? <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500 border border-blue-400" />
                <span className="text-[10px] text-slate-300">Área Inundada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500 border border-red-400" />
                <span className="text-[10px] text-slate-300">Rua Alagada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500 border border-orange-400" />
                <span className="text-[10px] text-slate-300">+50cm Alagaria</span>
              </div>
            </> : <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500" />
                <span className="text-[10px] text-slate-300">Risco (baixo→alto)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-[10px] text-slate-300">Não resgatado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-slate-300">Resgatado</span>
              </div>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}
