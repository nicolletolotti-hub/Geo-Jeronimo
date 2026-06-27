const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const ITERATIONS = 100000
const HASH = 'SHA-256'
const SALT_KEY = 'geojeronimo_crypto_salt'

let cachedKey = null

function getStoredCPF() {
  try {
    const stored = localStorage.getItem('user')
    if (!stored) return null
    const user = JSON.parse(stored)
    return user?.cpf || null
  } catch {
    return null
  }
}

function getOrCreateSalt() {
  let stored = localStorage.getItem(SALT_KEY)
  if (stored) {
    try {
      return Uint8Array.from(atob(stored), c => c.charCodeAt(0))
    } catch {
      localStorage.removeItem(SALT_KEY)
    }
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt)))
  return salt
}

function ab2b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function b642ab(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

export async function getCryptoKey(cpf) {
  if (cachedKey) return cachedKey

  const password = cpf || getStoredCPF()
  if (!password) throw new Error('CPF não disponível para derivação de chave criptográfica')

  const salt = getOrCreateSalt()

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  cachedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )

  return cachedKey
}

export async function encryptSensitive(plaintext, cpf) {
  const key = await getCryptoKey(cpf)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(plaintext))
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded)
  return { iv: ab2b64(iv), data: ab2b64(ciphertext) }
}

export async function decryptSensitive(encrypted, cpf) {
  if (!encrypted?.iv || !encrypted?.data) return null
  const key = await getCryptoKey(cpf)
  const iv = b642ab(encrypted.iv)
  const data = b642ab(encrypted.data)
  try {
    const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data)
    return JSON.parse(new TextDecoder().decode(decrypted))
  } catch {
    return null
  }
}

export function clearCryptoKey() {
  cachedKey = null
}
