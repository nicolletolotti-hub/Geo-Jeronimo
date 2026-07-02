/**
 * init.js — Inicializa o schema do banco de dados PostgreSQL.
 *
 * Executado automaticamente pelo startServer() em server.js.
 * Usa CREATE TABLE IF NOT EXISTS, portanto é idempotente e seguro para
 * rodar em cada deploy na Railway.
 */
import db from './db.js'

export async function initDatabase() {
  const client = await db.getClient()
  try {
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id               SERIAL PRIMARY KEY,
        cpf              TEXT UNIQUE,
        email            TEXT NOT NULL DEFAULT '',
        password         TEXT NOT NULL,
        name             TEXT NOT NULL,
        role             TEXT DEFAULT 'user'
                           CHECK (role IN ('user','admin','superadmin','agent')),
        profile          TEXT DEFAULT 'CIDADAO'
                           CHECK (profile IN ('CIDADAO','ADMIN','DEFESA_CIVIL','SAUDE',
                                              'ASSISTENCIA_SOCIAL','DEFESA_ANIMAL','AGENTE_CAMPO')),
        agent_area       TEXT DEFAULT '',
        agent_status     TEXT DEFAULT 'approved',
        approved_by      INTEGER REFERENCES users(id),
        approved_at      TIMESTAMP,
        approved_profiles TEXT DEFAULT '[]',
        phone            TEXT DEFAULT '',
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS residences (
        id                      SERIAL PRIMARY KEY,
        user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        address                 TEXT NOT NULL,
        house_number            TEXT DEFAULT '',
        neighborhood            TEXT NOT NULL,
        nome_titular             TEXT DEFAULT '',
        residents               INTEGER NOT NULL DEFAULT 0,
        comorbidities           TEXT DEFAULT '',
        has_elderly             BOOLEAN DEFAULT false,
        has_children            BOOLEAN DEFAULT false,
        has_pregnant            BOOLEAN DEFAULT false,
        has_disabled            BOOLEAN DEFAULT false,
        comorbidade_respiratoria  BOOLEAN DEFAULT false,
        comorbidade_has           BOOLEAN DEFAULT false,
        comorbidade_cardiaca      BOOLEAN DEFAULT false,
        comorbidade_diabetes      BOOLEAN DEFAULT false,
        comorbidade_renal         BOOLEAN DEFAULT false,
        comorbidade_neurologica   BOOLEAN DEFAULT false,
        comorbidade_mobilidade    BOOLEAN DEFAULT false,
        comorbidade_saude_mental  BOOLEAN DEFAULT false,
        comorbidade_alergias      BOOLEAN DEFAULT false,
        comorbidade_oxigenio      BOOLEAN DEFAULT false,
        comorbidade_quimioterapia BOOLEAN DEFAULT false,
        telefone_contato        TEXT DEFAULT '',
        telefone_emergencia     TEXT DEFAULT '',
        possui_veiculo          BOOLEAN DEFAULT false,
        possui_animais_grande_porte BOOLEAN DEFAULT false,
        acesso_superior         BOOLEAN DEFAULT false,
        medicamentos_continuos  TEXT DEFAULT '',
        necessita_energia       BOOLEAN DEFAULT false,
        abrigo_preferencial     TEXT DEFAULT '',
        pontos_referencia       TEXT DEFAULT '',
        pets                    TEXT DEFAULT '',
        evacuation_logistics    TEXT DEFAULT 'vehicle',
        shelter_plan            TEXT DEFAULT 'relatives',
        preventive_aid          TEXT DEFAULT '',
        flood_level             REAL DEFAULT 10,
        evacuation_level        REAL,
        latitude                REAL,
        longitude               REAL,
        evacuation_status       TEXT DEFAULT 'unknown',
        registered_by           TEXT DEFAULT 'citizen',
        agent_notes             TEXT DEFAULT '',
        shelter_name            TEXT DEFAULT '',
        health_markers          TEXT DEFAULT '[]',
        household_members       TEXT DEFAULT '[]',
        emergency_contact_name  TEXT DEFAULT '',
        emergency_contact_phone TEXT DEFAULT '',
        needs_evacuation_help   BOOLEAN DEFAULT false,
        evacuation_reason       TEXT DEFAULT '',
        needs_truck             BOOLEAN DEFAULT false,
        pets_info               TEXT DEFAULT '[]',
        shelter_destination     TEXT DEFAULT '',
        registration_step       INTEGER DEFAULT 1,
        registration_complete   BOOLEAN DEFAULT false,
        prescription_photos     TEXT DEFAULT '[]',
        created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Adiciona colunas novas em bancos já existentes (residences foi criada
    // antes de nome_titular/comorbidade_has existirem).
    await client.query(`
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS nome_titular TEXT DEFAULT ''
    `)
    await client.query(`
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_has BOOLEAN DEFAULT false
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS shelters (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        address    TEXT DEFAULT '',
        latitude   REAL,
        longitude  REAL,
        capacity   INTEGER DEFAULT 0,
        type       TEXT DEFAULT 'shelter',
        contact    TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS evacuation_routes (
        id           SERIAL PRIMARY KEY,
        name         TEXT NOT NULL,
        description  TEXT DEFAULT '',
        geojson_data JSONB,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS river_levels (
        id        SERIAL PRIMARY KEY,
        level     REAL NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source    TEXT DEFAULT 'manual'
      )
    `)

    // Add new columns to existing river_levels table (for backward compatibility)
    await client.query(`
      ALTER TABLE river_levels ADD COLUMN IF NOT EXISTS station_code TEXT DEFAULT 'DCRS-00093'
    `)
    await client.query(`
      ALTER TABLE river_levels ADD COLUMN IF NOT EXISTS station_name TEXT DEFAULT 'Rio Jacuí - São Jerônimo'
    `)

    // Add unique constraint if it doesn't exist (check first to avoid transaction abort)
    const constraintCheck = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'river_levels'
      AND constraint_name = 'river_levels_station_timestamp_unique'
    `)

    if (constraintCheck.rows.length === 0) {
      try {
        await client.query('BEGIN')
        await client.query(`
          ALTER TABLE river_levels ADD CONSTRAINT river_levels_station_timestamp_unique UNIQUE(station_code, timestamp)
        `)
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        // Constraint already exists or columns have duplicate data, ignore
        if (err.code !== '23505') {
          console.log('[db] Note: Could not add unique constraint (may already exist or have duplicates):', err.message)
        }
      }
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id         SERIAL PRIMARY KEY,
        type       TEXT NOT NULL,
        title      TEXT NOT NULL,
        message    TEXT NOT NULL,
        source     TEXT NOT NULL,
        residence_id INTEGER REFERENCES residences(id) ON DELETE SET NULL,
        is_active  BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS residence_id INTEGER REFERENCES residences(id) ON DELETE SET NULL
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS station_data (
        id          SERIAL PRIMARY KEY,
        station     TEXT NOT NULL,
        level       REAL,
        trend       TEXT DEFAULT 'stable',
        trend_rate  REAL DEFAULT 0,
        status      TEXT DEFAULT 'normal',
        percentage  REAL DEFAULT 0,
        source      TEXT DEFAULT 'unknown',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS import_log (
        id            SERIAL PRIMARY KEY,
        filename      TEXT NOT NULL,
        total_rows    INTEGER DEFAULT 0,
        imported_rows INTEGER DEFAULT 0,
        skipped_rows  INTEGER DEFAULT 0,
        status        TEXT DEFAULT 'completed',
        error         TEXT,
        imported_by   INTEGER REFERENCES users(id),
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER,
        user_name    TEXT,
        user_profile TEXT,
        action       TEXT NOT NULL,
        entity_type  TEXT NOT NULL,
        entity_id    INTEGER,
        old_values   TEXT,
        new_values   TEXT,
        ip_address   TEXT,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS pets (
        id                 SERIAL PRIMARY KEY,
        owner_name         TEXT NOT NULL,
        owner_cpf          TEXT,
        owner_address      TEXT DEFAULT '',
        owner_neighborhood TEXT DEFAULT '',
        owner_phone        TEXT DEFAULT '',
        owner_location     TEXT DEFAULT 'propria_residencia',
        pet_name           TEXT NOT NULL,
        pet_type           TEXT NOT NULL,
        pet_breed          TEXT DEFAULT '',
        pet_age            TEXT DEFAULT '',
        residence_id       INTEGER,
        notes              TEXT DEFAULT '',
        pet_photos         TEXT DEFAULT '[]',
        created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS belongings (
        id                  SERIAL PRIMARY KEY,
        family_name         TEXT NOT NULL,
        family_cpf          TEXT DEFAULT '',
        family_phone        TEXT DEFAULT '',
        registration_number TEXT DEFAULT '',
        items               TEXT DEFAULT '[]',
        storage_location    TEXT DEFAULT '',
        shelter_id          INTEGER,
        notes               TEXT DEFAULT '',
        registered_by       INTEGER REFERENCES users(id),
        photos              TEXT DEFAULT '[]',
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Índices
    await client.query(`CREATE INDEX IF NOT EXISTS idx_residences_user_id    ON residences(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_residences_flood      ON residences(flood_level)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_residences_neighbor   ON residences(neighborhood)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_agent_status    ON users(agent_status)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_station_data_station  ON station_data(station)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_station_data_recorded ON station_data(recorded_at)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_river_levels_ts       ON river_levels(timestamp)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_river_levels_station  ON river_levels(station_code)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alerts_active         ON alerts(is_active)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alerts_residence      ON alerts(residence_id) WHERE residence_id IS NOT NULL`)

    await client.query('COMMIT')
    console.log('[db] Schema initialized successfully.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[db] Failed to initialize schema:', err.message)
    throw err
  } finally {
    client.release()
  }
}
