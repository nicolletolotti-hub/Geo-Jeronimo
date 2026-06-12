import pool from './connection.js'

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS residences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  residents INTEGER NOT NULL,
  comorbidities TEXT,
  pets TEXT,
  evacuation_logistics TEXT NOT NULL,
  shelter_plan TEXT NOT NULL,
  preventive_aid TEXT,
  flood_level REAL NOT NULL,
  latitude REAL,
  longitude REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS river_levels (
  id SERIAL PRIMARY KEY,
  level REAL NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source TEXT DEFAULT 'manual'
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS station_data (
  id SERIAL PRIMARY KEY,
  station TEXT NOT NULL,
  level REAL,
  trend TEXT DEFAULT 'stable',
  trend_rate REAL DEFAULT 0,
  status TEXT DEFAULT 'normal',
  percentage REAL DEFAULT 0,
  source TEXT DEFAULT 'unknown',
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_station_data_station ON station_data(station);
CREATE INDEX IF NOT EXISTS idx_station_data_recorded ON station_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_residences_user_id ON residences(user_id);
CREATE INDEX IF NOT EXISTS idx_residences_flood_level ON residences(flood_level);
CREATE INDEX IF NOT EXISTS idx_river_levels_timestamp ON river_levels(timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active);
`

async function initializeDatabase() {
  try {
    await pool.connect()
    console.log('Connected to PostgreSQL database')
    await pool.query(schema)
    console.log('Database initialized successfully')
    await pool.end()
    console.log('Database connection closed')
    process.exit(0)
  } catch (error) {
    console.error('Error initializing database:', error)
    process.exit(1)
  }
}

initializeDatabase()
