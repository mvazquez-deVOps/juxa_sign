import {
  getMemoryOperatorUserEmail,
  getMemoryOperatorUserPasswordPlain,
  getMemoryPanelUserEmail,
  getMemoryPanelUserPasswordPlain,
  getMemorySandboxUserEmail,
  getMemorySandboxUserPasswordPlain,
  getMemoryViewerUserEmail,
  getMemoryViewerUserPasswordPlain,
} from "@/lib/memory-panel-credentials";

/**
 * Credenciales visibles solo en desarrollo o con JUXA_SHOW_TEST_CREDENTIALS=1.
 * No usar en producción con datos reales.
 */
export function LoginTestHint({ demoMode }: { demoMode: boolean }) {
  const allowHint =
    process.env.NODE_ENV !== "production" || process.env.JUXA_SHOW_TEST_CREDENTIALS?.trim() === "1";
  if (!allowHint) return null;

  const box =
    "mb-4 rounded-lg border border-teal-200 bg-teal-50/90 p-3 text-sm text-zinc-800 shadow-sm dark:border-teal-300 dark:bg-teal-50 dark:text-zinc-900";

  if (demoMode) {
    const password = process.env.DEMO_PASSWORD?.trim();
    if (!password) return null;
    return (
      <div className={box} data-testid="login-test-hint">
        <p className="font-semibold text-teal-900">Prueba — acceso demo</p>
        <p className="mt-1 text-xs text-zinc-700">
          Usa la misma contraseña que definiste en <code className="rounded bg-white/80 px-1">DEMO_PASSWORD</code>.
        </p>
        <p className="mt-2 break-all font-mono text-xs">
          <span className="font-sans font-semibold text-zinc-600">Contraseña: </span>
          {password}
        </p>
      </div>
    );
  }

  const memory = process.env.JUXA_DATA_STORE?.trim().toLowerCase() === "memory";
  if (memory) {
    const adminEmail = getMemoryPanelUserEmail();
    const adminPass = getMemoryPanelUserPasswordPlain();
    const opEmail = getMemoryOperatorUserEmail();
    const opPass = getMemoryOperatorUserPasswordPlain();
    const viewerEmail = getMemoryViewerUserEmail();
    const viewerPass = getMemoryViewerUserPasswordPlain();
    const sandboxEmail = getMemorySandboxUserEmail();
    const sandboxPass = getMemorySandboxUserPasswordPlain();
    return (
      <div className={box} data-testid="login-test-hint">
        <p className="font-semibold text-teal-900">Cuentas de prueba (memoria local)</p>
        <p className="mt-1 text-xs text-zinc-700">
          Cuatro cuentas en la misma organización: <strong className="font-medium text-teal-950">ADMIN</strong> (equipo,
          API keys, límites), <strong className="font-medium text-teal-950">OPERATOR</strong> (usuario final operativo:
          inicio sin ayudas de sandbox), <strong className="font-medium text-teal-950">SANDBOX</strong> (pruebas: checklist
          sandbox y E2E en inicio) y <strong className="font-medium text-teal-950">VIEWER</strong> (solo
          visualización). En producción invita miembros desde Configuración → Equipo o usa Postgres con{" "}
          <code className="rounded bg-white/80 px-1">npm run db:seed</code>.
        </p>
        <div className="mt-3 border-t border-teal-200/70 pt-3 dark:border-teal-300/50">
          <p className="text-xs font-semibold text-teal-900">Administrador · rol ADMIN</p>
          <p className="mt-1 break-all font-mono text-xs">
            <span className="font-sans font-semibold text-zinc-600">Correo: </span>
            {adminEmail}
          </p>
          <p className="mt-0.5 break-all font-mono text-xs">
            <span className="font-sans font-semibold text-zinc-600">Contraseña: </span>
            {adminPass}
          </p>
        </div>
        <div className="mt-3 border-t border-teal-200/70 pt-3 dark:border-teal-300/50">
          <p className="text-xs font-semibold text-teal-900">Operador · rol OPERATOR</p>
          <p className="mt-1 text-xs text-zinc-700">Vista producto en inicio (sin ayudas de sandbox ni métricas internas).</p>
          <p className="mt-1 break-all font-mono text-xs">
            <span className="font-sans font-semibold text-zinc-600">Correo: </span>
            {opEmail}
          </p>
          <p className="mt-0.5 break-all font-mono text-xs">
            <span className="font-sans font-semibold text-zinc-600">Contraseña: </span>
            {opPass}
          </p>
        </div>
        <div className="mt-3 border-t border-teal-200/70 pt-3 dark:border-teal-300/50">
          <p className="text-xs font-semibold text-teal-900">Pruebas · rol SANDBOX</p>
          <p className="mt-1 text-xs text-zinc-700">
            Mismos permisos operativos que operador; inicio con checklist sandbox y atajos E2E (sin métricas MVP en inicio).
          </p>
          <p className="mt-1 break-all font-mono text-xs">
            <span className="font-sans font-semibold text-zinc-600">Correo: </span>
            {sandboxEmail}
          </p>
          <p className="mt-0.5 break-all font-mono text-xs">
            <span className="font-sans font-semibold text-zinc-600">Contraseña: </span>
            {sandboxPass}
          </p>
        </div>
        <div className="mt-3 border-t border-teal-200/70 pt-3 dark:border-teal-300/50">
          <p className="text-xs font-semibold text-teal-900">Solo visualización · rol VIEWER</p>
          <p className="mt-1 text-xs text-zinc-700">
            Misma organización; explora panel y planes; sin operar envíos ni configuración hasta que un admin te eleve
            de rol.
          </p>
          <p className="mt-1 break-all font-mono text-xs">
            <span className="font-sans font-semibold text-zinc-600">Correo: </span>
            {viewerEmail}
          </p>
          <p className="mt-0.5 break-all font-mono text-xs">
            <span className="font-sans font-semibold text-zinc-600">Contraseña: </span>
            {viewerPass}
          </p>
        </div>
        <p className="mt-3 text-xs text-zinc-600">
          Variables:{" "}
          <code className="rounded bg-white/80 px-1">JUXA_MEMORY_PANEL_EMAIL</code>,{" "}
          <code className="rounded bg-white/80 px-1">JUXA_MEMORY_DEMO_PASSWORD</code>,{" "}
          <code className="rounded bg-white/80 px-1">JUXA_MEMORY_OPERATOR_EMAIL</code>,{" "}
          <code className="rounded bg-white/80 px-1">JUXA_MEMORY_OPERATOR_PASSWORD</code>,{" "}
          <code className="rounded bg-white/80 px-1">JUXA_MEMORY_SANDBOX_EMAIL</code>,{" "}
          <code className="rounded bg-white/80 px-1">JUXA_MEMORY_SANDBOX_PASSWORD</code>,{" "}
          <code className="rounded bg-white/80 px-1">JUXA_MEMORY_VIEWER_EMAIL</code>,{" "}
          <code className="rounded bg-white/80 px-1">JUXA_MEMORY_VIEWER_PASSWORD</code>.
        </p>
      </div>
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const operatorEmail = process.env.OPERATOR_EMAIL?.trim();
  const operatorPassword = process.env.OPERATOR_PASSWORD;

  if (adminEmail && adminPassword) {
    return (
      <>
        <div className={box} data-testid="login-test-hint">
          <p className="font-semibold text-teal-900">Prueba — administrador (seed)</p>
          <p className="mt-1 text-xs text-zinc-700">Rol ADMIN · equipo, API keys, límites.</p>
          <p className="mt-2 break-all font-mono text-xs">
            <span className="font-sans font-semibold text-zinc-600">Correo: </span>
            {adminEmail}
          </p>
          <p className="mt-1 break-all font-mono text-xs">
            <span className="font-sans font-semibold text-zinc-600">Contraseña: </span>
            {adminPassword}
          </p>
          <p className="mt-2 text-xs text-zinc-600">
            <code className="rounded bg-white/80 px-1">ADMIN_EMAIL</code> /{" "}
            <code className="rounded bg-white/80 px-1">ADMIN_PASSWORD</code> ·{" "}
            <code className="rounded bg-white/80 px-1">npm run db:seed</code>
          </p>
        </div>
        {operatorEmail && operatorPassword ? (
          <div className={box} data-testid="login-test-hint-operator">
            <p className="font-semibold text-teal-900">Prueba — operador (seed)</p>
            <p className="mt-1 text-xs text-zinc-700">
              Rol OPERATOR · envíos y folios; inicio tipo cliente final (sin ayudas de sandbox).
            </p>
            <p className="mt-2 break-all font-mono text-xs">
              <span className="font-sans font-semibold text-zinc-600">Correo: </span>
              {operatorEmail}
            </p>
            <p className="mt-1 break-all font-mono text-xs">
              <span className="font-sans font-semibold text-zinc-600">Contraseña: </span>
              {operatorPassword}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              <code className="rounded bg-white/80 px-1">OPERATOR_EMAIL</code> /{" "}
              <code className="rounded bg-white/80 px-1">OPERATOR_PASSWORD</code>
            </p>
          </div>
        ) : null}
        {process.env.SANDBOX_EMAIL?.trim() && process.env.SANDBOX_PASSWORD ? (
          <div className={box} data-testid="login-test-hint-sandbox">
            <p className="font-semibold text-teal-900">Prueba — cuenta sandbox (seed)</p>
            <p className="mt-1 text-xs text-zinc-700">
              Rol SANDBOX · mismos permisos operativos que operador; inicio con checklist sandbox y E2E.
            </p>
            <p className="mt-2 break-all font-mono text-xs">
              <span className="font-sans font-semibold text-zinc-600">Correo: </span>
              {process.env.SANDBOX_EMAIL.trim()}
            </p>
            <p className="mt-1 break-all font-mono text-xs">
              <span className="font-sans font-semibold text-zinc-600">Contraseña: </span>
              {process.env.SANDBOX_PASSWORD}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              <code className="rounded bg-white/80 px-1">SANDBOX_EMAIL</code> /{" "}
              <code className="rounded bg-white/80 px-1">SANDBOX_PASSWORD</code>
            </p>
          </div>
        ) : null}
        {process.env.VIEWER_EMAIL?.trim() && process.env.VIEWER_PASSWORD ? (
          <div className={box} data-testid="login-test-hint-viewer">
            <p className="font-semibold text-teal-900">Prueba — observador (seed)</p>
            <p className="mt-1 text-xs text-zinc-700">Rol VIEWER · solo visualización (misma organización).</p>
            <p className="mt-2 break-all font-mono text-xs">
              <span className="font-sans font-semibold text-zinc-600">Correo: </span>
              {process.env.VIEWER_EMAIL.trim()}
            </p>
            <p className="mt-1 break-all font-mono text-xs">
              <span className="font-sans font-semibold text-zinc-600">Contraseña: </span>
              {process.env.VIEWER_PASSWORD}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              <code className="rounded bg-white/80 px-1">VIEWER_EMAIL</code> /{" "}
              <code className="rounded bg-white/80 px-1">VIEWER_PASSWORD</code>
            </p>
          </div>
        ) : null}
      </>
    );
  }

  if (operatorEmail && operatorPassword) {
    return (
      <div className={box} data-testid="login-test-hint">
        <p className="font-semibold text-teal-900">Prueba — operador (seed)</p>
        <p className="mt-1 text-xs text-zinc-700">Rol OPERATOR. Define también ADMIN_EMAIL para ver la cuenta admin.</p>
        <p className="mt-2 break-all font-mono text-xs">
          <span className="font-sans font-semibold text-zinc-600">Correo: </span>
          {operatorEmail}
        </p>
        <p className="mt-1 break-all font-mono text-xs">
          <span className="font-sans font-semibold text-zinc-600">Contraseña: </span>
          {operatorPassword}
        </p>
      </div>
    );
  }

  return (
    <div
      className="mb-4 rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-xs text-zinc-600 dark:border-zinc-300 dark:bg-zinc-100 dark:text-zinc-700"
      data-testid="login-test-hint"
    >
      <p className="font-medium text-zinc-800">Prueba</p>
      <p className="mt-1">
        Para ver cuentas aquí: <code className="rounded bg-white px-1">JUXA_DATA_STORE=memory</code> (ADMIN + OPERATOR +
        SANDBOX + VIEWER), o <code className="rounded bg-white px-1">ADMIN_EMAIL</code>/
        <code className="rounded bg-white px-1">ADMIN_PASSWORD</code> y opcional{" "}
        <code className="rounded bg-white px-1">OPERATOR_EMAIL</code>/
        <code className="rounded bg-white px-1">OPERATOR_PASSWORD</code> o{" "}
        <code className="rounded bg-white px-1">VIEWER_EMAIL</code>/
        <code className="rounded bg-white px-1">VIEWER_PASSWORD</code>, o modo demo{" "}
        <code className="rounded bg-white px-1">DEMO_PASSWORD</code>.
      </p>
    </div>
  );
}
