/**
 * Mensajes legibles para el usuario ante errores del proveedor de firma / red (es-MX).
 */
export function digidUserMessage(err: unknown, fallback = "No se pudo completar la operación con el proveedor de firma."): string {
  if (err instanceof Error) {
    const m = err.message.trim();
    if (!m) return fallback;
    if (/network|fetch|ECONNREFUSED|ETIMEDOUT/i.test(m)) {
      return "No hubo respuesta del servicio de firma. Revisa red o credenciales y vuelve a intentar.";
    }
    if (/HTTP\s*5\d\d/i.test(m) || /500/.test(m)) {
      return "El servicio de firma respondió con error. Intenta más tarde o contacta soporte.";
    }
    if (/HTTP\s*4\d\d/i.test(m) || /401|403/.test(m)) {
      return "El servicio rechazó la petición (autenticación o permisos). Revisa la configuración en el servidor.";
    }
    if (/no es JSON/i.test(m)) {
      return "La respuesta del servicio no es válida. Comprueba la URL de la API en la configuración del servidor.";
    }
    if (m.length > 200) return `${m.slice(0, 197)}…`;
    return m;
  }
  return fallback;
}
