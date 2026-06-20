import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import '@arcgis/core/assets/esri/themes/dark/main.css'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
