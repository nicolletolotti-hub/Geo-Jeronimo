// Structured logging utility
const logger = {
  info: (message, data = {}) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] INFO: ${message}`, data)
  },
  
  error: (message, error = null, data = {}) => {
    const timestamp = new Date().toISOString()
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      ...data
    } : data
    console.error(`[${timestamp}] ERROR: ${message}`, errorData)
  },
  
  warn: (message, data = {}) => {
    const timestamp = new Date().toISOString()
    console.warn(`[${timestamp}] WARN: ${message}`, data)
  },
  
  debug: (message, data = {}) => {
    const timestamp = new Date().toISOString()
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${timestamp}] DEBUG: ${message}`, data)
    }
  }
}

export default logger
