interface LogPayload {
  message: string
  context?: Record<string, unknown>
}

const asJson = (payload: LogPayload) => JSON.stringify(payload)

export const logInfo = (message: string, context?: Record<string, unknown>) => {
  console.log(asJson({ message, context }))
}

export const logError = (message: string, context?: Record<string, unknown>) => {
  console.error(asJson({ message, context }))
}
