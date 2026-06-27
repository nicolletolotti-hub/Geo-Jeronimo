let accessToken = null
let refreshTok = null

export function setTokens(token, refreshToken) {
  accessToken = token
  refreshTok = refreshToken
}

export function getToken() {
  return accessToken
}

export function getRefreshToken() {
  return refreshTok
}

export function clearTokens() {
  accessToken = null
  refreshTok = null
}
