# Aceptación de Términos y Política de Privacidad — Design Spec

**Fecha:** 2026-05-24
**Estado:** Aprobado por el usuario, pendiente plan de implementación.

## Objetivo

Bloquear el alta de nuevos usuarios (email/password y social) hasta que acepten explícitamente los Términos de uso y la Política de privacidad. Persistir el consentimiento en Firestore con timestamp y versión. Exponer ambos documentos en rutas reales accesibles desde el registro y desde el footer.

## Decisiones tomadas durante el brainstorming

| Pregunta | Decisión |
|---|---|
| Acceso a documentos | Páginas dedicadas con rutas reales `/legal/terms` y `/legal/privacy`. Los links abren en pestaña nueva. |
| Documentos a crear | Aviso legal (Términos de uso) y Política de privacidad. **Política de cookies queda fuera** (sigue muerta en el footer). |
| Aplica a sign-in social | Sí. Modal intermedio con misma aceptación antes de crear el `UserProfile`, solo para usuarios nuevos. |
| Persistencia | Sí, en `UserProfile`: `acceptedTermsAt` (ISO string) + `acceptedTermsVersion` (`"v1"`). |
| Contenido de los docs | Placeholder hardcoded en los `.tsx` (suficiente para v1). |
| Footer | Links de "Aviso legal" y "Política de privacidad" se conectan a las rutas reales. "Política de cookies" sigue como `#`. |

## Arquitectura

### Archivos nuevos

| Path | Responsabilidad |
|---|---|
| `src/pages/legal/TermsPage.tsx` | Página de Aviso legal / Términos de uso |
| `src/pages/legal/PrivacyPage.tsx` | Página de Política de privacidad |
| `src/pages/legal/LegalDocument.scss` | Estilos compartidos para el layout de página legal (importado por ambas páginas) |
| `src/components/auth/TermsConsentModal.tsx` + `.scss` | Modal intermedio para sign-in social de usuarios nuevos |
| `src/services/legal/termsVersion.ts` | Constante `CURRENT_TERMS_VERSION = "v1"` |
| `src/plugins/i18n/locales/es/legal.json` | Textos de las páginas legales (placeholder) en español |
| `src/plugins/i18n/locales/en/legal.json` | Equivalente en inglés |

### Archivos a modificar

| Path | Cambios |
|---|---|
| `src/components/auth/forms/RegisterForm.tsx` | Añadir checkbox + validación + pasar `acceptedTermsAt`/`Version` a `createUserProfile` |
| `src/components/auth/sign-in-buttons/SignInGoogleButton.tsx` | Detectar usuario nuevo, mostrar modal antes de `createUserProfile` |
| `src/components/auth/sign-in-buttons/SignInAppleButton.tsx` | Mismo cambio que Google |
| `src/services/firebase/firebaseUsers.ts` | Extender `UserProfileData` y `createUserProfile` con campos de consentimiento |
| `src/services/firebase/firebaseAuth.ts` | Helper `getIsNewUser(credential)` con `getAdditionalUserInfo` |
| `src/types/AuthTypes.ts` | Añadir `acceptedTerms: boolean` a `RegisterFormValues` |
| `src/types/UserProfile.ts` | Añadir `acceptedTermsAt?: string` y `acceptedTermsVersion?: string` opcionales a `UserFullProfile` |
| `src/components/layout/Footer.tsx` | Links de Aviso legal y Privacidad pasan a `<Link>` de react-router |
| `src/routes/routes.tsx` | Registrar `/legal/terms` y `/legal/privacy` (públicas, sin `<AuthRoute>`) |
| `src/plugins/i18n/locales/es/auth.json` y `en/auth.json` | Claves nuevas del checkbox, modal y error |

## Flujo email/password

### UI

Dentro de `<form>` en `RegisterForm`, debajo del input de contraseña y encima del botón submit:

```tsx
<label className="auth__remember auth__terms-row">
  <input
    type="checkbox"
    {...register("acceptedTerms", {
      required: t("authErrors.terms-required"),
    })}
  />
  <span>
    <Trans
      i18nKey="auth.acceptTermsLabel"
      components={{
        terms: <a href="/legal/terms" target="_blank" rel="noreferrer noopener" />,
        privacy: <a href="/legal/privacy" target="_blank" rel="noreferrer noopener" />,
      }}
    />
  </span>
</label>
{errors.acceptedTerms && (
  <p className="auth__error" role="alert">{errors.acceptedTerms.message}</p>
)}
```

Reaprovecha `.auth__remember` (ya existe), añade modificador `.auth__terms-row` si necesita ajuste de tipografía (ej. `align-items: flex-start` para que el checkbox quede arriba del texto multilínea).

### Lógica

`RegisterFormValues` (en `AuthTypes.ts`) gana `acceptedTerms: boolean`. Default value `false`. Validación required.

En `onSubmit`, después del `createUserProfile`, los campos `acceptedTermsAt` (= `new Date().toISOString()`) y `acceptedTermsVersion` (= `CURRENT_TERMS_VERSION`) se pasan dentro de `UserProfileData`.

No se desactiva el botón submit cuando el checkbox está vacío — react-hook-form muestra el error inline al pulsar registrar. Consistente con el resto de validaciones del formulario.

## Flujo social (Google / Apple)

### Problema

Hoy `SignInGoogleButton.handleGoogle()` hace `signInWithGoogle()` → `createUserProfile()` inmediatamente. No hay punto donde insertar consentimiento sin romper a usuarios que ya tienen cuenta.

### Solución

Detectar usuario nuevo con `getAdditionalUserInfo(credential).isNewUser` de Firebase:

- **Usuario existente** (`isNewUser === false`): flujo actual sin cambios. `createUserProfile` es idempotente, no toca el documento si ya existe.
- **Usuario nuevo** (`isNewUser === true`): **no** se llama a `createUserProfile` aún. Se muestra `<TermsConsentModal />` con la misma UI del checkbox (label + dos links a las páginas legales).
  - Si **acepta**: se llama a `createUserProfile` con `acceptedTermsAt` + `acceptedTermsVersion` y el flujo termina con sesión activa.
  - Si **cancela**: se llama a `logoutUser()`. La cuenta de Firebase Auth queda creada (Firebase la crea como efecto del popup, no se puede deshacer atómicamente), pero **sin documento en Firestore**. Próximo intento: `isNewUser` será `false` pero el documento no existe, por lo que el flujo debe tratar este caso como "nuevo" igualmente. Helper:

```ts
// en firebaseUsers.ts
export async function userProfileExists(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "Users", uid));
  return snap.exists();
}
```

Y la condición real en el botón social es:

```ts
const isFirstSignIn = isNewUser || !(await userProfileExists(credential.user.uid));
```

### Componente `TermsConsentModal`

Props:
```ts
type TermsConsentModalProps = {
  open: boolean;
  onAccept: () => void | Promise<void>;
  onCancel: () => void;
  isProcessing?: boolean;
};
```

Markup mínimo:
```tsx
<div className="terms-modal" role="dialog" aria-modal="true" aria-labelledby="terms-modal-title">
  <div className="terms-modal__backdrop" onClick={onCancel} />
  <div className="terms-modal__panel">
    <h2 id="terms-modal-title">{t("auth.consentModalTitle")}</h2>
    <p>{t("auth.consentModalBody")}</p>
    <label className="auth__remember">
      <input type="checkbox" checked={accepted} onChange={...} />
      <span><Trans i18nKey="auth.acceptTermsLabel" components={...} /></span>
    </label>
    <div className="terms-modal__actions">
      <button onClick={onCancel} disabled={isProcessing}>{t("auth.consentCancel")}</button>
      <button onClick={onAccept} disabled={!accepted || isProcessing}>
        {isProcessing ? t("auth.registering") : t("auth.consentAccept")}
      </button>
    </div>
  </div>
</div>
```

Estilos siguen los tokens y patrones existentes (`--shadow-modal`, `--color-overlay`, `--radius-md`).

## Persistencia en Firestore

### Schema

Documento `Users/{uid}` gana dos campos opcionales:

```
acceptedTermsAt:      string  // ISO 8601, e.g. "2026-05-24T10:15:30.123Z"
acceptedTermsVersion: string  // e.g. "v1"
```

Campos opcionales para no romper a usuarios actuales (que no tienen estos campos). El consumidor no debe asumir su presencia.

### Constante de versión

```ts
// src/services/legal/termsVersion.ts
export const CURRENT_TERMS_VERSION = "v1";
```

Cuando se actualicen los términos de forma sustancial, se incrementa esta constante. **Fuera de scope** en esta v1: detectar discrepancia entre versión guardada vs actual y forzar re-aceptación. Solo persistimos el dato para tener trazabilidad.

### Actualización de `createUserProfile`

Firma actual:
```ts
export async function createUserProfile(
  uid: string,
  data: UserProfileData
): Promise<void>
```

`UserProfileData` se extiende:
```ts
export type UserProfileData = {
  email?: string;
  name?: string;
  surname?: string;
  birthDate?: string;
  acceptedTermsAt?: string;
  acceptedTermsVersion?: string;
};
```

Implementación: los nuevos campos van al documento público (no a `private/info`). Solo se escriben si vienen definidos, así no rompe llamadas existentes.

## Páginas legales

### Estructura visual

Ambas comparten layout:
- Header: título grande (font-editorial) + "Última actualización: 2026-05-24".
- Contenido: secciones numeradas (`<h2>` para cada sección) con párrafos.
- Padding generoso (`var(--page-padding-y)`, `var(--page-padding-x)`).
- `max-width` ~720px centrado para legibilidad.

### Contenido placeholder

**Términos de uso** (8 secciones tipo): Objeto, Aceptación, Registro y cuenta, Uso del servicio, Propiedad intelectual, Limitación de responsabilidad, Modificaciones, Legislación aplicable.

**Política de privacidad** (7 secciones tipo): Responsable del tratamiento, Datos recogidos, Finalidad, Base legal, Conservación, Derechos del usuario, Contacto.

Texto generado en español/inglés, breve por sección (1-3 párrafos). No es contenido legal real — se sustituirá cuando haya documentos definitivos.

### Rutas

En `routes.tsx`, dentro del array `children` de `App`:
```tsx
{ path: "legal/terms",   element: <TermsPage /> },
{ path: "legal/privacy", element: <PrivacyPage /> },
```

Públicas (no envueltas en `<AuthRoute>`).

### Footer

En `Footer.tsx`, los `COMPANY_LINKS` "privacy" y los `LEGAL_LINKS` "legalNotice" pasan de `<a href="#">` a `<Link to="/legal/privacy">` y `<Link to="/legal/terms">` respectivamente. Resto sigue con `#`.

> **Pendiente para otro PR**: revisar si el link "Política de privacidad" debe estar en la columna "Empresa" o duplicarse en "Legal". Por ahora se mantiene donde el spec del footer lo puso.

## i18n

### Claves nuevas en `auth.json`

```json
{
  "auth": {
    "acceptTermsLabel": "He leído y acepto los <terms>Términos de uso</terms> y la <privacy>Política de privacidad</privacy>",
    "consentModalTitle": "Un último paso",
    "consentModalBody": "Para crear tu cuenta necesitas aceptar nuestros términos.",
    "consentCancel": "Cancelar",
    "consentAccept": "Aceptar y continuar"
  },
  "authErrors": {
    "terms-required": "Debes aceptar los términos para continuar"
  }
}
```

> El uso de tags `<terms>` y `<privacy>` dentro del valor es para `<Trans>` de react-i18next: permite que la traducción inserte los enlaces en el lugar correcto sin concatenar strings.

Equivalente en inglés:
```json
{
  "auth": {
    "acceptTermsLabel": "I have read and agree to the <terms>Terms of use</terms> and the <privacy>Privacy policy</privacy>",
    "consentModalTitle": "One last step",
    "consentModalBody": "To create your account you need to accept our terms.",
    "consentCancel": "Cancel",
    "consentAccept": "Accept and continue"
  },
  "authErrors": {
    "terms-required": "You must accept the terms to continue"
  }
}
```

### Nuevo namespace `legal.json`

Estructura por documento:
```json
{
  "legal": {
    "lastUpdated": "Última actualización: {{date}}",
    "terms": {
      "title": "Términos de uso",
      "sections": [
        { "heading": "1. Objeto", "body": "..." },
        { "heading": "2. Aceptación", "body": "..." }
      ]
    },
    "privacy": {
      "title": "Política de privacidad",
      "sections": [
        { "heading": "1. Responsable del tratamiento", "body": "..." }
      ]
    }
  }
}
```

> El array de `sections` permite que las páginas recorran las secciones sin acoplarse a una cantidad fija. Si añades una sección, solo tocas el JSON.

## Accesibilidad

- Checkbox: `<label>` envolvente (ya patrón en `.auth__remember`).
- Error del checkbox: `<p role="alert">`.
- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apuntando al `<h2>`. Trap de foco básico (focus inicial en el primer botón, cerrar con ESC).
- Links en pestaña nueva: `rel="noreferrer noopener"`.
- Páginas legales: `<h1>` para el título, `<h2>` para secciones.

## Riesgos conocidos

1. **Cuenta huérfana en Firebase Auth**: si el usuario cancela el consentimiento social, queda una cuenta de Auth sin perfil en Firestore. Mitigación: helper `userProfileExists` para tratarla como nueva al reintentar. Riesgo residual: acumulación de cuentas sin perfil con el tiempo. Limpieza opcional en una Cloud Function periódica (fuera de scope).

2. **Usuarios actuales sin consentimiento**: los registros previos a este cambio no tienen `acceptedTermsAt`/`Version`. Decisión: **no se les pide retroactivamente**. Cuando los términos sean reales y entre en vigor un cambio relevante, podemos añadir un hook que detecte la ausencia y muestre un modal post-login.

3. **`<Trans>` de react-i18next** requiere instalar/usar la importación correcta — no hay regression risk pero hay que asegurarse de que el `i18next.config` lo soporta. Ya está usado en el proyecto si miramos `react-i18next` en `package.json`.

## Fuera de scope (explícito)

- Página de Política de cookies (sigue con `href="#"` en footer).
- Re-aceptación automática cuando suba `CURRENT_TERMS_VERSION`.
- Migración retroactiva: pedir consentimiento a usuarios ya registrados.
- Editor de términos (CMS, panel admin, Firestore-backed content).
- Borrado físico de la cuenta de Firebase Auth si el usuario cancela el consentimiento social.
- Logging/analytics de aceptación.
- Banner de cookies (cookies consent banner) — diferente al checkbox de términos.
