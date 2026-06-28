/**
 * helpers.js — Wrappers de query para PostgreSQL (pg)
 *
 * Todas as funções recebem `db` (o objeto exportado por db.js)
 * e adaptam o resultado para a interface usada em todo o projeto.
 *
 * Convenção de retorno:
 *   runQuery  → Array de rows
 *   runGet    → Primeira row ou null
 *   runRun    → { lastID, changes } — compatível com o padrão SQLite que o
 *               código legado esperava, mas alimentado com dados do PostgreSQL.
 */

/**
 * Executa uma query e devolve todas as linhas como array.
 * @param {object} db   — instância exportada por db.js
 * @param {string} sql  — query SQL com placeholders $1, $2…
 * @param {Array}  [params=[]]
 * @returns {Promise<Array>}
 */
export async function runQuery(db, sql, params = []) {
  const result = await db.query(sql, params)
  return result.rows
}

/**
 * Executa uma query e devolve apenas a primeira linha (ou null).
 * @param {object} db
 * @param {string} sql
 * @param {Array}  [params=[]]
 * @returns {Promise<object|null>}
 */
export async function runGet(db, sql, params = []) {
  const result = await db.query(sql, params)
  return result.rows[0] ?? null
}

/**
 * Executa INSERT / UPDATE / DELETE.
 * Devolve { lastID, changes } para manter compatibilidade com o código legado.
 *
 * Se a query contiver "RETURNING id" (inserts), lastID recebe o id gerado.
 * changes reflete rowCount do pg.
 *
 * @param {object} db
 * @param {string} sql
 * @param {Array}  [params=[]]
 * @returns {Promise<{ lastID: number|null, changes: number }>}
 */
export async function runRun(db, sql, params = []) {
  const result = await db.query(sql, params)
  const lastID = result.rows?.[0]?.id ?? null
  const changes = result.rowCount ?? 0
  return { lastID, changes }
}
