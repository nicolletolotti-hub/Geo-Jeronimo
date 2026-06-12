// Centralized database helper functions for PostgreSQL

export const runQuery = async (pool, sql, params = []) => {
  try {
    const result = await pool.query(sql, params)
    return result.rows
  } catch (error) {
    throw error
  }
}

export const runGet = async (pool, sql, params = []) => {
  try {
    const result = await pool.query(sql, params)
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

export const runRun = async (pool, sql, params = []) => {
  try {
    const result = await pool.query(sql, params)
    return { lastID: result.rows[0]?.id, changes: result.rowCount }
  } catch (error) {
    throw error
  }
}

export default {
  runQuery,
  runGet,
  runRun
}
