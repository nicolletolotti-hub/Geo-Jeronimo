import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MapLibreMap from '../components/MapLibreMap';
import AppShell from '../components/AppShell';
import bairrosGeoJSON from '../data/bairros/bairros.json';
import { getCachedData, setCachedData } from '../utils/cacheManager';
import api from '../services/api';

function weatherIcon(code) {
  const map = {
    '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️', '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️', '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️', '13d': '🌨️', '13n': '🌨️', '50d': '🌫️', '50n': '🌫️',
  }
  return map[code] || '🌤️'
}

const STATION_KEYS = [
  { codes: ['DCRS-00093'], name: 'São Jerônimo (Jacuí)' },
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
  const [floodLevel, setFloodLevel] = useState(3);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [showRuas, setShowRuas] = useState(false);
  const ruasSearch = '';
  const [isLoading, setIsLoading] = useState(false);
  const [mapMode, setMapMode] = useState('satellite');
  const [stations, setStations] = useState({})
  const [prediction, setPrediction] = useState(null)
  const [river, setRiver] = useState(null)
  const [weather, setWeather] = useState(null)
  const [rainfall, setRainfall] = useState(null)

  const [floodData, setFloodData] = useState(null);
  const [floodDataNear, setFloodDataNear] = useState(null);
  const [ruasData, setRuasData] = useState(null);
  const [municipioData, setMunicipioData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
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
      } catch { /* try next path */ }
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
        setPrediction(data.prediction || null)
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

  useEffect(() => {
    const fetchRiverData = async () => {
      try {
        const [r, w, rf] = await Promise.allSettled([
          api.get('/river/current'),
          api.get('/weather/current'),
          api.get('/rainfall/history'),
        ])
        if (r.status === 'fulfilled') setRiver(r.value.data)
        if (w.status === 'fulfilled') setWeather(w.value.data)
        if (rf.status === 'fulfilled') setRainfall(rf.value.data)
      } catch {}
    }
    fetchRiverData()
    const interval = setInterval(fetchRiverData, 30 * 60 * 1000)
    return () => clearInterval(interval)
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

  function getStreetCenter(coords) {
    const flat = coords.flat(Infinity).filter(v => typeof v === 'number')
    if (flat.length < 2) return null
    const mid = Math.floor(flat.length / 4) * 2
    return [flat[mid], flat[mid + 1]]
  }

  const searchTimerRef = useRef(null)

  const doAddressSearch = useCallback((q) => {
    if (!q || q.length < 2 || !ruasData) { setAddressResults([]); return }
    const normalized = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const found = []
    const seen = new Set()
    for (const f of ruasData.features) {
      const name = f.properties?.name
      if (!name || typeof name !== 'string') continue
      const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (n.includes(normalized) && !seen.has(name)) {
        seen.add(name)
        const center = getStreetCenter(f.geometry.coordinates)
        if (center) found.push({ name, coords: center })
        if (found.length >= 10) break
      }
    }
    setAddressResults(found)
  }, [ruasData])

  const handleAddressSearch = useCallback((e) => {
    const q = e.target.value
    setAddressQuery(q)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => doAddressSearch(q), 200)
  }, [doAddressSearch])

  const handleAddressSelect = useCallback((result) => {
    setAddressQuery(result.name)
    setAddressResults([])
    setShowAddressSearch(false)
    setSelectedNeighborhood(null)
    setShowRuas(true)
    setTimeout(() => {
      window.__flyTo?.({ center: result.coords, zoom: 17 })
    }, 200)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedNeighborhood(null);
    setShowRuas(false);
  }, []);

  const initialState = useMemo(
    () => ({ lng: -51.723, lat: -29.965, zoom: 15 }),
    [],
  );

  const currentRiverLevel = stations['DCRS-00093']?.level
  const selectedNome = selectedNeighborhood?.properties?.nome;
  const neighborhoodRisk = selectedNome ? NEIGHBORHOOD_RISK[selectedNome] : null;
  const floodedStreets = selectedNome ? RUAS_ALAGADAS[selectedNome] || [] : [];

  const ALERT_STYLES = {
    'CRÍTICO': { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
    'ALERTA': { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
    'ATENÇÃO': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    'NORMAL': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  };

  const station = STATION_KEYS[0].codes.reduce((found, c) => found || stations[c], null)
  const mainPrediction = prediction?.predictions?.length > 0
    ? prediction.predictions.reduce((a, b) => a.predictedLocalLevel > b.predictedLocalLevel ? a : b)
    : null
  const pRise = mainPrediction?.predictedLocalLevel != null && station?.level != null
    ? mainPrediction.predictedLocalLevel - station.level
    : null
  const hasHistory = historyData?.tresDias != null

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-800/80">
        {river && (
          <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50 mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌊</span>
              <span className="font-bold text-slate-100 text-xl tabular-nums">{river.current?.toFixed(2)}</span>
              <span className="text-slate-400 text-sm">m</span>
              <span className={`text-sm font-semibold ${river.trend === 'rising' ? 'text-red-400' : river.trend === 'falling' ? 'text-emerald-400' : 'text-slate-400'}`}>
                {river.trend === 'rising' ? '↑ Subindo' : river.trend === 'falling' ? '↓ Descendo' : '→ Estável'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              {weather && <span>{weatherIcon(weather.icon)} {weather.temp}°C <span className="capitalize">{weather.condition}</span></span>}
              {rainfall?.last7d != null && <span>🌧️ {Number(typeof rainfall.last7d === 'object' ? rainfall.last7d.value ?? 0 : rainfall.last7d).toFixed(1)}mm/sem</span>}
              {river?.timestamp && <span className="text-slate-600">{new Date(river.timestamp).toLocaleTimeString('pt-BR')}</span>}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary-500/20">
            G
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Controles do Mapa</h2>
            <p className="text-[10px] text-slate-500">Monitoramento de Cheias</p>
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`${risk.bg} ${risk.color} ${risk.border} border-2 px-2 py-0.5 rounded-full text-[11px] font-bold leading-none`}>
            {risk.label}
          </span>
          {isLoading && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-400" />
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary-400 tabular-nums">
              Nível: {floodLevel.toFixed(1)}m
            </span>
            {currentRiverLevel != null && (
              <button onClick={() => setFloodLevel(Math.round(currentRiverLevel * 5) / 5)}
                className="px-2 py-0.5 text-[10px] font-medium rounded-lg bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30 transition-colors">
                Atual
              </button>
            )}
          </div>
          <input
            type="range"
            min="1" max="15" step="0.2"
            value={floodLevel}
            onChange={(e) => setFloodLevel(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gradient-to-r from-emerald-500 via-amber-500 via-orange-500 to-red-500 rounded-full appearance-none cursor-pointer accent-primary-400"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex bg-slate-800 rounded-lg p-0.5">
            {[
              { key: 'satellite', label: 'Satélite' },
              { key: 'street', label: 'Rua' },
              { key: 'topo', label: 'Topo' },
            ].map(m => (
              <button key={m.key} onClick={() => setMapMode(m.key)}
                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${mapMode === m.key ? 'bg-primary-500/20 text-primary-400' : 'text-slate-400 hover:text-slate-200'}`}>
                {m.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowRuas(!showRuas)}
            className={`px-2 py-1 text-[10px] font-medium rounded-lg transition-colors ${showRuas ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
            {showRuas ? 'Ocultar Ruas' : 'Ruas Alagadas'}
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-slate-800/80">
        <button onClick={() => setShowAddressSearch(v => !v)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition-colors">
          <span>🔍</span>
          <span>Buscar Endereço</span>
        </button>
        {showAddressSearch && (
          <div className="mt-2 relative">
            <input
              type="text" value={addressQuery} onChange={handleAddressSearch}
              placeholder="Nome da rua..." autoFocus
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
        )}
      </div>

      {selectedNeighborhood && (
        <div className="p-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-primary-400 whitespace-nowrap">{selectedNome}</span>
            {neighborhoodRisk && (() => {
              const a = ALERT_STYLES[neighborhoodRisk.alert] || ALERT_STYLES.NORMAL;
              return <span className={`${a.bg} ${a.text} ${a.border} border px-2 py-0.5 rounded text-[11px] font-bold leading-none whitespace-nowrap`}>{neighborhoodRisk.alert}</span>;
            })()}
            <button onClick={handleClearSelection}
              className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all">
              × Limpar
            </button>
          </div>

          {floodedStreets.length > 0 && showRuas && (
            <div className="mt-1.5">
              <span className="text-[10px] text-slate-500 font-medium">Ruas Alagadas:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {floodedStreets.map((street, i) => (
                  <span key={i} className="text-[10px] text-slate-300 bg-slate-700/50 px-1.5 py-0.5 rounded">{street}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3 mt-auto">
        <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
          <h4 className="text-xs font-bold text-slate-200 mb-1.5">Legenda</h4>
          <div className="space-y-1.5">
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
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 top-[64px] bottom-[36px] left-0 right-0">
      <AppShell
        sidebar={sidebarContent}
        mapContainer={
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
            onNeighborhoodClick={handleNeighborhoodClick}
          />
        }
      />
    </div>
  );
}
