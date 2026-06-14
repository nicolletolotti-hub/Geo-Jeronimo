export const runQuery = async (db, sql, params = []) => {
  try {
    const s = db.type === 'sqlite' ? sql.replace(/\$(\d+)/g, () => '?') : sql
    return await db.all(s, params)
  } catch (error) {
    throw error
  }
}

export const runGet = async (db, sql, params = []) => {
  try {
    const s = db.type === 'sqlite' ? sql.replace(/\$(\d+)/g, () => '?') : sql
    return await db.get(s, params)
  } catch (error) {
    throw error
  }
}

export const runRun = async (db, sql, params = []) => {
  try {
    const s = db.type === 'sqlite' ? sql.replace(/\$(\d+)/g, () => '?') : sql
    return await db.run(s, params)
  } catch (error) {
    throw error
  }
}

export default { runQuery, runGet, runRun }
