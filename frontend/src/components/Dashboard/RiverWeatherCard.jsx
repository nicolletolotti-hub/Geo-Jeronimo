import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '../ui/Card'
import {
  TrendingUp, TrendingDown, Minus, Droplets, AlertTriangle, ShieldCheck, Siren,
  Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, Wind, Droplet as WaterDrop,
  Clock, MapPin,
} from 'lucide-react'
import { useState } from 'react'

const weatherIconMap = {
  '01d': <Sun className="w-6 h-6 text-yellow-400" />,
  '01n': <Sun className="w-6 h-6 text-yellow-400" />,
  '02d': <CloudSun className="w-6 h-6 text-slate-300" />,
  '02n': <CloudSun className="w-6 h-6 text-slate-300" />,
  '03d': <Cloud className="w-6 h-6 text-slate-400" />,
  '03n': <Cloud className="w-6 h-6 text-slate-400" />,
  '04d': <Cloud className="w-6 h-6 text-slate-500" />,
  '04n': <Cloud className="w-6 h-6 text-slate-500" />,
  '09d': <CloudRain className="w-6 h-6 text-blue-400" />,
  '09n': <CloudRain className="w-6 h-6 text-blue-400" />,
  '10d': <CloudRain className="w-6 h-6 text-blue-400" />,
  '10n': <CloudRain className="w-6 h-6 text-blue-400" />,
  '11d': <CloudLightning className="w-6 h-6 text-yellow-400" />,
  '11n': <CloudLightning className="w-6 h-6 text-yellow-400" />,
  '13d': <CloudSnow className="w-6 h-6 text-blue-300" />,
  '13n': <CloudSnow className="w-6 h-6 text-blue-300" />,
  '50d': <Cloud className="w-6 h-6 text-slate-400" />,
  '50n': <Cloud className="w-6 h-6 text-slate-400" />,
  default: <Sun className="w-6 h-6 text-slate-400" />,
}

const levelConfig = {
  normal: { Icon: ShieldCheck, color: 'text-emerald-400', border: 'border-emerald-500/30', bgColor: 'bg-emerald-500', text: 'Normal' },
  warning: { Icon: AlertTriangle, color: 'text-amber-400', border: 'border-amber-500/30', bgColor: 'bg-amber-500', text: 'Atenção' },
  danger: { Icon: Siren, color: 'text-red-400', border: 'border-red-500/30', bgColor: 'bg-red-500', text: 'Perigo' },
}

const trendConfig = {
  rising: { Icon: TrendingUp, color: 'text-red-400', text: 'Subindo' },
  falling: { Icon: TrendingDown, color: 'text-emerald-400', text: 'Descendo' },
  stable: { Icon: Minus, color: 'text-slate-400', text: 'Estável' },
}

export default function RiverWeatherCard({ riverData, weatherData }) {
  const [showForecast, setShowForecast] = useState(false)
  if (!riverData && !weatherData) return null

  const status = riverData
    ? riverData.current >= riverData.dangerLevel ? 'danger'
      : riverData.current >= riverData.warningLevel ? 'warning' : 'normal'
    : 'normal'

  const trend = riverData ? (trendConfig[riverData.trend] || trendConfig.stable) : trendConfig.stable
  const { Icon: StatusIcon, color: statusColor, border: statusBorder, bgColor: statusBgColor, text: statusText } = levelConfig[status]
  const percentage = riverData ? Math.min((riverData.current / 15) * 100, 100) : 0

  return (
    <Card className="flex flex-col border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="w-7 h-7 text-primary-400" />
            <CardTitle className="text-xl text-slate-100">Rio Jacuí & Clima</CardTitle>
          </div>
          {riverData && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${statusBorder} bg-slate-800`}>
              <StatusIcon className={`w-5 h-5 ${statusColor}`} />
              <span className={`font-bold text-sm ${statusColor}`}>{statusText}</span>
            </div>
          )}
        </div>
        {weatherData?.location && (
          <CardDescription className="flex items-center gap-1 text-sm">
            <MapPin className="w-3 h-3" />
            {weatherData.location}, {weatherData.country}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-grow pb-4">
        <div className="grid md:grid-cols-2 gap-6">
          {riverData && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-sm text-slate-400 mb-1">Nível do Rio</div>
                <span className="text-5xl font-bold text-slate-100">{riverData.current.toFixed(2)}</span>
                <span className="text-2xl text-slate-500 ml-2 font-semibold">m</span>
              </div>

              <div className="space-y-2">
                <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`absolute left-0 top-0 h-full ${statusBgColor} transition-all duration-700 ease-out shadow-lg`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>0m</span>
                  <span className="text-amber-400">{riverData.warningLevel.toFixed(1)}m</span>
                  <span className="text-red-400">{riverData.dangerLevel.toFixed(1)}m</span>
                  <span>15m</span>
                </div>
              </div>

              <div className={`flex items-center gap-2 ${trend.color}`}>
                <trend.Icon className="w-4 h-4" />
                <span className="font-semibold text-sm">{trend.text}</span>
              </div>
            </div>
          )}

          {weatherData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Temperatura</div>
                  <span className="text-5xl font-bold text-slate-100">{weatherData.temp}°C</span>
                </div>
                <div className="text-5xl" aria-hidden="true">
                  {weatherIconMap[weatherData.icon] || weatherIconMap.default}
                </div>
              </div>

              <div className="text-sm text-slate-400 capitalize font-medium">
                {weatherData.condition}
              </div>

              {weatherData.feelsLike && (
                <div className="text-xs text-slate-500">
                  Sensação térmica: {weatherData.feelsLike}°C
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                  <WaterDrop className="w-4 h-4 text-primary-400" />
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Umidade</div>
                    <div className="text-sm font-bold text-slate-100">{weatherData.humidity}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                  <Wind className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Vento</div>
                    <div className="text-sm font-bold text-slate-100">{weatherData.windSpeed} km/h</div>
                  </div>
                </div>
              </div>

              {weatherData.sunrise && weatherData.sunset && (
                <div className="flex items-center justify-between p-2 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <div className="text-xs">
                      <span className="text-slate-400">Nascer: </span>
                      <span className="font-bold text-slate-100">{weatherData.sunrise}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <div className="text-xs">
                      <span className="text-slate-400">Pôr: </span>
                      <span className="font-bold text-slate-100">{weatherData.sunset}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {weatherData?.forecast && (
          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowForecast(!showForecast)}
              className="text-sm font-semibold text-slate-400 mb-2 hover:text-primary-400 transition-colors"
            >
              {showForecast ? '▼' : '▶'} Previsão para os próximos dias
            </button>
            {showForecast && (
              <div className="space-y-2 mt-2">
                {weatherData.forecast.slice(0, 5).map((day, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-2">
                      {weatherIconMap[day.icon] || weatherIconMap.default}
                      <div className="text-sm">
                        <div className="font-semibold text-slate-200">{day.day}</div>
                        {day.date && <div className="text-xs text-slate-500">{day.date}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-bold text-slate-100">{day.temp}°C</span>
                        {day.tempMin !== undefined && day.tempMax !== undefined && (
                          <span className="text-xs text-slate-500 ml-1">({day.tempMin}° - {day.tempMax}°)</span>
                        )}
                      </div>
                      {day.rain !== undefined && (
                        <div className="flex items-center gap-1 text-xs font-medium text-blue-400">
                          <CloudRain className="w-3 h-3" />
                          <span>{day.rain}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {riverData && (
        <CardFooter className="justify-between text-sm font-medium text-slate-400 pt-4 border-t border-slate-800">
          <div className={`flex items-center gap-2 ${trend.color}`}>
            <trend.Icon className="w-4 h-4" />
            <span className="font-semibold">{trend.text}</span>
          </div>
          <span className="text-slate-500">
            Atualizado: {new Date(riverData.timestamp).toLocaleTimeString('pt-BR')}
          </span>
        </CardFooter>
      )}
    </Card>
  )
}
