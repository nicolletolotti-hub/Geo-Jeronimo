/* eslint-disable camelcase */

export const shorthands = undefined;

export const up = pgm => {
  // Criação de todas as tabelas
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      cpf TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin', 'agent')),
      profile TEXT DEFAULT 'CIDADAO' CHECK (profile IN ('CIDADAO','ADMIN','DEFESA_CIVIL','SAUDE','ASSISTENCIA_SOCIAL','DEFESA_ANIMAL','AGENTE_CAMPO')),
      agent_area TEXT,
      agent_status TEXT DEFAULT 'pending',
      agent_approved_by INTEGER REFERENCES users(id),
      agent_approved_at TIMESTAMP,
      approved_profiles TEXT DEFAULT '[]',
      phone TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS residences (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      address TEXT NOT NULL,
      house_number TEXT,
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
      evacuation_logistics TEXT,
      shelter_plan TEXT,
      preventive_aid TEXT,
      flood_level REAL,
      evacuation_level REAL,
      latitude REAL,
      longitude REAL,
      evacuation_status TEXT DEFAULT 'unknown',
      registered_by TEXT DEFAULT 'citizen',
      agent_notes TEXT,
      shelter_name TEXT,
      health_markers TEXT DEFAULT '[]',
      household_members TEXT DEFAULT '[]',
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      needs_evacuation_help BOOLEAN DEFAULT false,
      evacuation_reason TEXT,
      needs_truck BOOLEAN DEFAULT false,
      pets_info TEXT DEFAULT '[]',
      shelter_destination TEXT,
      registration_step INTEGER DEFAULT 1,
      registration_complete BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shelters (id SERIAL PRIMARY KEY, name TEXT NOT NULL, address TEXT, latitude REAL, longitude REAL, capacity INTEGER DEFAULT 0, type TEXT DEFAULT 'shelter', contact TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS evacuation_routes (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, geojson_data JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS river_levels (id SERIAL PRIMARY KEY, level REAL NOT NULL, "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, source TEXT DEFAULT 'manual');
    CREATE TABLE IF NOT EXISTS alerts (id SERIAL PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, source TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_active BOOLEAN DEFAULT true);
    CREATE TABLE IF NOT EXISTS station_data (id SERIAL PRIMARY KEY, station TEXT NOT NULL, level REAL, trend TEXT DEFAULT 'stable', trend_rate REAL DEFAULT 0, status TEXT DEFAULT 'normal', percentage REAL DEFAULT 0, source TEXT DEFAULT 'unknown', recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS import_log (id SERIAL PRIMARY KEY, filename TEXT NOT NULL, total_rows INTEGER DEFAULT 0, imported_rows INTEGER DEFAULT 0, skipped_rows INTEGER DEFAULT 0, status TEXT DEFAULT 'completed', error TEXT, imported_by INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, user_id INTEGER, user_name TEXT, user_profile TEXT, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id INTEGER, old_values TEXT, new_values TEXT, ip_address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS pets (id SERIAL PRIMARY KEY, owner_name TEXT, owner_cpf TEXT, owner_address TEXT DEFAULT '', owner_neighborhood TEXT DEFAULT '', owner_phone TEXT DEFAULT '', owner_location TEXT DEFAULT 'propria_residencia', pet_name TEXT NOT NULL, pet_type TEXT NOT NULL, pet_breed TEXT DEFAULT '', pet_age TEXT DEFAULT '', residence_id INTEGER, notes TEXT DEFAULT '', pet_photos TEXT DEFAULT '[]', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS belongings (id SERIAL PRIMARY KEY, family_name TEXT NOT NULL, family_cpf TEXT DEFAULT '', family_phone TEXT DEFAULT '', registration_number TEXT DEFAULT '', items TEXT DEFAULT '[]', storage_location TEXT DEFAULT '', shelter_id INTEGER, notes TEXT DEFAULT '', registered_by INTEGER REFERENCES users(id), photos TEXT DEFAULT '[]', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

    -- Índices para performance
    CREATE INDEX IF NOT EXISTS idx_residences_user_id ON residences(user_id);
    CREATE INDEX IF NOT EXISTS idx_residences_flood_level ON residences(flood_level);
    CREATE INDEX IF NOT EXISTS idx_residences_neighborhood ON residences(neighborhood);
    CREATE INDEX IF NOT EXISTS idx_users_agent_status ON users(agent_status);
    CREATE INDEX IF NOT EXISTS idx_station_data_station ON station_data(station);
    CREATE INDEX IF NOT EXISTS idx_station_data_recorded ON station_data(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_river_levels_timestamp ON river_levels("timestamp");
    CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active);
  `);
};

export const down = pgm => {
  pgm.sql(`
    DROP TABLE IF EXISTS belongings;
    DROP TABLE IF EXISTS pets;
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS import_log;
    DROP TABLE IF EXISTS station_data;
    DROP TABLE IF EXISTS alerts;
    DROP TABLE IF EXISTS river_levels;
    DROP TABLE IF NOT EXISTS evacuation_routes;
    DROP TABLE IF EXISTS shelters;
    DROP TABLE IF EXISTS residences;
    DROP TABLE IF EXISTS users;
  `);
};
