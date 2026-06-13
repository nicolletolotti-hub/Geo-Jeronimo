import pool from './db.js'

const migration = `
ALTER TABLE residences ADD COLUMN IF NOT EXISTS evacuation_level REAL;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS has_elderly BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS has_children BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS has_pregnant BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS has_disabled BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS evacuation_status TEXT DEFAULT 'unknown';
ALTER TABLE residences ADD COLUMN IF NOT EXISTS registered_by TEXT DEFAULT 'citizen';
ALTER TABLE residences ADD COLUMN IF NOT EXISTS agent_notes TEXT;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS shelter_name TEXT;
ALTER TABLE shelters ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'shelter';

ALTER TABLE residences ADD COLUMN IF NOT EXISTS telefone_contato TEXT;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS telefone_emergencia TEXT;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS possui_veiculo BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS possui_animais_grande_porte BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS acesso_superior BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS medicamentos_continuos TEXT;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS necessita_energia BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS abrigo_preferencial TEXT;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS pontos_referencia TEXT;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_respiratoria BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_cardiaca BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_diabetes BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_renal BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_neurologica BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_mobilidade BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_saude_mental BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_alergias BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_oxigenio BOOLEAN DEFAULT false;
ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_quimioterapia BOOLEAN DEFAULT false;

ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_area TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_status TEXT DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_approved_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_approved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE TABLE IF NOT EXISTS import_log (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  error TEXT,
  imported_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_residences_evacuation_status ON residences(evacuation_status);
CREATE INDEX IF NOT EXISTS idx_residences_neighborhood ON residences(neighborhood);
CREATE INDEX IF NOT EXISTS idx_residences_has_elderly ON residences(has_elderly);
CREATE INDEX IF NOT EXISTS idx_users_agent_status ON users(agent_status);
`

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin', 'agent')),
  agent_area TEXT,
  agent_status TEXT DEFAULT 'pending',
  agent_approved_by INTEGER REFERENCES users(id),
  agent_approved_at TIMESTAMP,
  phone TEXT,
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
  has_elderly BOOLEAN DEFAULT false,
  has_children BOOLEAN DEFAULT false,
  has_pregnant BOOLEAN DEFAULT false,
  has_disabled BOOLEAN DEFAULT false,
  telefone_contato TEXT,
  telefone_emergencia TEXT,
  possui_veiculo BOOLEAN DEFAULT false,
  possui_animais_grande_porte BOOLEAN DEFAULT false,
  acesso_superior BOOLEAN DEFAULT false,
  medicamentos_continuos TEXT,
  necessita_energia BOOLEAN DEFAULT false,
  abrigo_preferencial TEXT,
  pontos_referencia TEXT,
  comorbidade_respiratoria BOOLEAN DEFAULT false,
  comorbidade_cardiaca BOOLEAN DEFAULT false,
  comorbidade_diabetes BOOLEAN DEFAULT false,
  comorbidade_renal BOOLEAN DEFAULT false,
  comorbidade_neurologica BOOLEAN DEFAULT false,
  comorbidade_mobilidade BOOLEAN DEFAULT false,
  comorbidade_saude_mental BOOLEAN DEFAULT false,
  comorbidade_alergias BOOLEAN DEFAULT false,
  comorbidade_oxigenio BOOLEAN DEFAULT false,
  comorbidade_quimioterapia BOOLEAN DEFAULT false,
  pets TEXT,
  evacuation_logistics TEXT NOT NULL,
  shelter_plan TEXT NOT NULL,
  preventive_aid TEXT,
  flood_level REAL NOT NULL,
  evacuation_level REAL,
  latitude REAL,
  longitude REAL,
  evacuation_status TEXT DEFAULT 'unknown',
  registered_by TEXT DEFAULT 'citizen',
  agent_notes TEXT,
  shelter_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shelters (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  latitude REAL,
  longitude REAL,
  capacity INTEGER DEFAULT 0,
  type TEXT DEFAULT 'shelter',
  contact TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evacuation_routes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  geojson_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS import_log (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  error TEXT,
  imported_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    console.log('Schema created')
    try {
      await pool.query(migration)
      console.log('Migration applied')
    } catch (e) {
      console.log('Migration note:', e.message)
    }
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
