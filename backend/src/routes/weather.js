import express from 'express'
import axios from 'axios'

const router = express.Router()

const WMO_CODES = {
  0: 'Céu Limpo', 1: 'Predom. Limpo', 2: 'Parcial. Nublado', 3: 'Encoberto',
  45: 'Nevoeiro', 48: 'Nevoeiro c/ Depósito',
  51: 'Chuvisco Fraco', 53: 'Chuvisco Moderado', 55: 'Chuvisco Intenso',
  56: 'Chuvisco Gélido', 57: 'Chuvisco Gélido Intenso',
  61: 'Chuva Fraca', 63: 'Chuva Moderada', 65: 'Chuva Forte',
  66: 'Chuva Gélida', 67: 'Chuva Gélida Forte',
  71: 'Neve Fraca', 73: 'Neve Moderada', 75: 'Neve Intensa',
  77: 'Grãos de Neve',
  80: 'Pancada Chuva Fraca', 81: 'Pancada Chuva Moderada', 82: 'Pancada Chuva Violenta',
  85: 'Pancada Neve Fraca', 86: 'Pancada Neve Intensa',
  95: 'Tempestade', 96: 'Tempestade c/ Granizo', 99: 'Tempestade c/ Granizo Forte',
}

function wmoIcon(code, isDay = true) {
  if (code === 0) return isDay ? '01d' : '01n'
  if (code <= 2) return isDay ? '02d' : '02n'
  if (code === 3) return '04d'
  if (code >= 45 && code <= 48) return '50d'
  if (code >= 51 && code <= 57) return '09d'
  if (code >= 61 && code <= 67) return '10d'
  if (code >= 71 && code <= 77) return '13d'
  if (code >= 80 && code <= 82) return '09d'
  if (code >= 85 && code <= 86) return '13d'
  if (code >= 95) return '11d'
  return '02d'
}

router.get('/current', async (req, res) => {
  const lat = -29.988118
  const lon = -51.722883

  try {
    const omResp = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,is_day',
        daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_speed_10m_max',
        timezone: 'America/Sao_Paulo',
        forecast_days: 5,
      },
      timeout: 5000,
    })

    const { current, daily } = omResp.data
    const code = current.weather_code ?? 0
    const isDay = current.is_day === 1
    const condition = WMO_CODES[code] || 'Não disponível'

    const forecast = []
    if (daily?.time) {
      for (let i = 0; i < daily.time.length; i++) {
        const dayName = new Date(daily.time[i] + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })
        const fCode = daily.weather_code[i] ?? 0
        forecast.push({
          date: daily.time[i],
          day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          temp: Math.round((daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2),
          tempMin: Math.round(daily.temperature_2m_min[i]),
          tempMax: Math.round(daily.temperature_2m_max[i]),
          condition: WMO_CODES[fCode] || 'Não disponível',
          icon: wmoIcon(fCode, true),
          rain: daily.precipitation_probability_max?.[i] ?? 0,
          windSpeed: Math.round(daily.wind_speed_10m_max?.[i] ?? 0),
        })
      }
    }

    return res.json({
      temp: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      condition,
      icon: wmoIcon(code, isDay),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      windGust: current.wind_gusts_10m ? Math.round(current.wind_gusts_10m) : null,
      forecast,
      source: 'Open-Meteo',
    })
  } catch (omError) {
    console.warn('Open-Meteo falhou, tentando OpenWeatherMap:', omError.message)
    const apiKey = process.env.OPENWEATHER_API_KEY

    if (apiKey) {
      try {
        const [curResp, foreResp] = await Promise.all([
          axios.get('https://api.openweathermap.org/data/2.5/weather', {
            params: { lat, lon, appid: apiKey, units: 'metric', lang: 'pt_br' },
            timeout: 5000,
          }),
          axios.get('https://api.openweathermap.org/data/2.5/forecast', {
            params: { lat, lon, appid: apiKey, units: 'metric', lang: 'pt_br' },
            timeout: 5000,
          }),
        ])

        const cur = curResp.data
        const foreList = foreResp.data.list
        const dailyForecasts = {}
        foreList.forEach((item) => {
          const dayKey = new Date(item.dt * 1000).toDateString()
          if (!dailyForecasts[dayKey]) dailyForecasts[dayKey] = item
        })

        const forecast = Object.keys(dailyForecasts)
          .sort()
          .slice(1, 6)
          .map((k) => {
            const d = dailyForecasts[k]
            const date = new Date(d.dt * 1000)
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' })
            return {
              date: date.toLocaleDateString('pt-BR'),
              day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
              temp: Math.round(d.main.temp),
              tempMin: Math.round(d.main.temp_min),
              tempMax: Math.round(d.main.temp_max),
              condition: d.weather[0]?.description || 'Não disponível',
              icon: d.weather[0]?.icon || '01d',
              rain: Math.round((d.pop || 0) * 100),
              windSpeed: Math.round(d.wind.speed * 3.6),
            }
          })

        return res.json({
          temp: Math.round(cur.main.temp),
          feelsLike: Math.round(cur.main.feels_like),
          condition: cur.weather[0]?.description || 'Não disponível',
          icon: cur.weather[0]?.icon || '01d',
          humidity: cur.main.humidity,
          windSpeed: Math.round(cur.wind.speed * 3.6),
          windGust: cur.wind.gust ? Math.round(cur.wind.gust * 3.6) : null,
          forecast,
          source: 'OpenWeatherMap',
        })
      } catch (owmError) {
        console.error('OpenWeatherMap também falhou:', owmError.message)
      }
    }

    console.error('Ambas APIs climáticas falharam.')
    res.status(503).json({ error: 'Dados climáticos indisponíveis no momento' })
  }
})

export default router
