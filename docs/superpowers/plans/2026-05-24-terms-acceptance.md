# Aceptación de Términos y Política de Privacidad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bloquear el alta de nuevos usuarios (email/password y social) hasta que acepten Términos de uso y Política de privacidad, persistiendo el consentimiento en Firestore. Crear páginas accesibles para ambos documentos. Spec: [2026-05-24-terms-acceptance-design.md](../specs/2026-05-24-terms-acceptance-design.md).

**Architecture:**
- Constante `CURRENT_TERMS_VERSION` + dos campos opcionales en `UserProfile` (`acceptedTermsAt`, `acceptedTermsVersion`).
- En email/password: checkbox `react-hook-form` con `required`. En social: modal intermedio (`TermsConsentModal`) que solo se muestra para usuarios nuevos detectados con `getAdditionalUserInfo(credential).isNewUser` o ausencia de doc en Firestore.
- Páginas `/legal/terms` y `/legal/privacy` con contenido placeholder hardcoded en JSX leído de `legal.json`.

**Tech Stack:** React 19, TypeScript, react-hook-form, react-i18next (incluido componente `<Trans>`), Firebase Auth + Firestore, SCSS BEM con tokens CSS. **No hay test suite** — verificación con `npm run lint`, `npm run build` y revisión manual en navegador.

**Convenciones importantes:**
- Tokens semánticos `var(--*)`, BEM, alias `@/` → `src/`.
- i18n: añadir claves a **ambos** idiomas (`es/` y `en/`).
- Patrón de modal del proyecto: ver [FollowRequestsModal.tsx](../../../src/components/profile/modals/FollowRequestsModal.tsx) — backdrop separado, ESC handler en `useEffect`, `role="dialog"`, `aria-modal="true"`.
- **Commits**: el usuario debe aprobar cada commit explícitamente antes de ejecutarlo. Los pasos de commit están documentados pero **no los ejecutes sin pedir confirmación al usuario**.

---

## File Structure

### Crear

| Path | Responsabilidad |
|---|---|
| `src/services/legal/termsVersion.ts` | Constante `CURRENT_TERMS_VERSION = "v1"` |
| `src/pages/legal/LegalDocument.scss` | Estilos compartidos por TermsPage y PrivacyPage |
| `src/pages/legal/TermsPage.tsx` | Página Aviso legal / Términos de uso |
| `src/pages/legal/PrivacyPage.tsx` | Página Política de privacidad |
| `src/components/auth/TermsConsentModal.tsx` | Modal de consentimiento para sign-in social |
| `src/components/auth/TermsConsentModal.scss` | Estilos del modal |
| `src/plugins/i18n/locales/es/legal.json` | Textos placeholder de páginas legales (ES) |
| `src/plugins/i18n/locales/en/legal.json` | Equivalente en EN |

### Modificar

| Path | Cambios |
|---|---|
| `src/types/UserProfile.ts` | `UserFullProfile`: añadir `acceptedTermsAt?` y `acceptedTermsVersion?` |
| `src/types/AuthTypes.ts` | `RegisterFormValues`: añadir `acceptedTerms: boolean` |
| `src/services/firebase/firebaseUsers.ts` | Extender `UserProfileData` y `createUserProfile` para persistir consentimiento; añadir `userProfileExists` |
| `src/services/firebase/firebaseAuth.ts` | Exportar helper `getIsNewUser(credential)` |
| `src/components/auth/forms/RegisterForm.tsx` | Checkbox + validación + pasar consentimiento al `createUserProfile` |
| `src/components/auth/sign-in-buttons/SignInGoogleButton.tsx` | Detectar usuario nuevo, mostrar modal antes de crear perfil |
| `src/components/auth/sign-in-buttons/SignInAppleButton.tsx` | Mismo cambio que Google |
| `src/components/layout/Footer.tsx` | Links de privacy y legalNotice pasan de `<a href="#">` a `<Link>` |
| `src/components/auth/AuthForm.scss` | Añadir modificador `.auth__terms-row` y placeholder para `.auth__btn-secondary` reutilizable |
| `src/routes/routes.tsx` | Registrar `/legal/terms` y `/legal/privacy` |
| `src/plugins/i18n/i18n.ts` | Cargar `legal.json` en `resources` (ES + EN) |
| `src/plugins/i18n/locales/es/auth.json` y `en/auth.json` | Nuevas claves de consentimiento y error |

---

## Task 1: Foundations — constante de versión, tipos, persistencia

**Files:**
- Create: `src/services/legal/termsVersion.ts`
- Modify: `src/types/UserProfile.ts`
- Modify: `src/types/AuthTypes.ts`
- Modify: `src/services/firebase/firebaseUsers.ts`

Sentamos los cimientos: constante de versión, extensión de tipos, y `createUserProfile` capaz de persistir el consentimiento. Sin UI todavía — esta task no cambia comportamiento visible.

- [ ] **Step 1: Crear `src/services/legal/termsVersion.ts`**

```ts
// Incrementar cuando los términos legales sufran un cambio sustancial.
// El valor se persiste en UserProfile.acceptedTermsVersion cuando un usuario acepta.
export const CURRENT_TERMS_VERSION = "v1";
```

- [ ] **Step 2: Extender `UserFullProfile` en `src/types/UserProfile.ts`**

Encuentra el bloque `export type UserFullProfile = { ... };` y añade los dos campos opcionales al final, antes del cierre:

```ts
export type UserFullProfile = {
  uid: string;
  email: string;
  name: string;
  surname: string;
  username: string;
  bio: string;
  profilePhotoUrl: string;
  bannerImageUrl: string;
  followersCount: number;
  followingCount: number;
  birthDate?: string;
  isPublic: boolean;
  acceptedTermsAt?: string;
  acceptedTermsVersion?: string;
};
```

- [ ] **Step 3: Extender `RegisterFormValues` en `src/types/AuthTypes.ts`**

Reemplaza el tipo completo por:

```ts
export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues {
  email: string;
  password: string;
  name: string;
  surname: string;
  birthDate: string;
  acceptedTerms: boolean;
}

export type AuthScreen = "loading" | "login" | "register" | "user";
```

- [ ] **Step 4: Extender `UserProfileData` y `createUserProfile` en `src/services/firebase/firebaseUsers.ts`**

Localiza el bloque `export type UserProfileData = { ... }` (líneas ~5-10) y reemplázalo por:

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

Después localiza la función activa `createUserProfile` (la que no está comentada, líneas ~32-53) y reemplázala por:

```ts
export async function createUserProfile(
  uid: string,
  data: UserProfileData
): Promise<void> {
  const { email, birthDate, acceptedTermsAt, acceptedTermsVersion, ...publicData } = data;
  const userRef = doc(db, "Users", uid);

  const existing = await getDoc(userRef);
  if (!existing.exists()) {
    const publicDoc: Record<string, unknown> = {
      ...publicData,
      isPublic: true,
      followersCount: 0,
      followingCount: 0,
      createdAt: new Date().toISOString(),
    };
    if (acceptedTermsAt !== undefined) publicDoc.acceptedTermsAt = acceptedTermsAt;
    if (acceptedTermsVersion !== undefined) publicDoc.acceptedTermsVersion = acceptedTermsVersion;
    await setDoc(userRef, publicDoc);
  }

  if (email !== undefined || birthDate !== undefined) {
    await updatePrivateInfo(uid, { email, birthDate });
  }
}
```

> **Nota TS**: usamos `Record<string, unknown>` para poder añadir campos condicionalmente sin que TypeScript se queje. Los campos van al documento público porque el consentimiento es metadata de cuenta (no PII como email/birthDate).

- [ ] **Step 5: Verificar TypeScript**

Run: `npm run build`
Expected: build pasa sin errores. Los nuevos campos opcionales no rompen ningún consumidor existente.

- [ ] **Step 6: Commit** *(requiere aprobación explícita del usuario)*

```bash
git add src/services/legal/termsVersion.ts src/types/UserProfile.ts src/types/AuthTypes.ts src/services/firebase/firebaseUsers.ts
git commit -m "feat(legal): add terms version constant and consent fields to user profile"
```

---

## Task 2: i18n — claves de auth + namespace legal

**Files:**
- Modify: `src/plugins/i18n/locales/es/auth.json`
- Modify: `src/plugins/i18n/locales/en/auth.json`
- Create: `src/plugins/i18n/locales/es/legal.json`
- Create: `src/plugins/i18n/locales/en/legal.json`
- Modify: `src/plugins/i18n/i18n.ts`

Añadimos todas las claves necesarias antes de tocar UI. Así la UI puede referenciarlas sin warnings.

- [ ] **Step 1: Añadir claves nuevas a `src/plugins/i18n/locales/es/auth.json`**

Dentro del objeto `"auth": { ... }`, añade tras la línea `"birthDatePlaceholder": "Fecha de nacimiento"` (sin coma final del objeto auth):

```json
,
    "acceptTermsLabel": "He leído y acepto los <terms>Términos de uso</terms> y la <privacy>Política de privacidad</privacy>",
    "consentModalTitle": "Un último paso",
    "consentModalBody": "Para crear tu cuenta necesitas aceptar nuestros términos.",
    "consentCancel": "Cancelar",
    "consentAccept": "Aceptar y continuar"
```

Dentro del objeto `"authErrors": { ... }`, añade tras `"birthDate-min-age": "..."` (con coma antes):

```json
,
    "terms-required": "Debes aceptar los términos para continuar"
```

- [ ] **Step 2: Añadir claves equivalentes a `src/plugins/i18n/locales/en/auth.json`**

Mismo patrón en inglés:

En `"auth": {...}`:
```json
,
    "acceptTermsLabel": "I have read and agree to the <terms>Terms of use</terms> and the <privacy>Privacy policy</privacy>",
    "consentModalTitle": "One last step",
    "consentModalBody": "To create your account you need to accept our terms.",
    "consentCancel": "Cancel",
    "consentAccept": "Accept and continue"
```

En `"authErrors": {...}`:
```json
,
    "terms-required": "You must accept the terms to continue"
```

- [ ] **Step 3: Crear `src/plugins/i18n/locales/es/legal.json`**

```json
{
  "legal": {
    "lastUpdated": "Última actualización: {{date}}",
    "terms": {
      "title": "Términos de uso",
      "sections": [
        { "heading": "1. Objeto", "body": "El presente Aviso Legal regula el uso del servicio Trama (en adelante, \"el Servicio\") puesto a disposición de los usuarios. El acceso al Servicio implica la aceptación plena y sin reservas de los presentes términos." },
        { "heading": "2. Aceptación de los términos", "body": "Al registrarte y utilizar el Servicio aceptas estos términos. Si no estás de acuerdo con alguno de ellos, debes abstenerte de utilizar el Servicio." },
        { "heading": "3. Registro y cuenta", "body": "Para acceder a determinadas funcionalidades es necesario crear una cuenta facilitando datos veraces. Eres responsable de la confidencialidad de tus credenciales y de toda actividad realizada bajo tu cuenta." },
        { "heading": "4. Uso del servicio", "body": "Te comprometes a utilizar el Servicio conforme a la ley, la moral y el orden público. Queda prohibido el uso del Servicio para fines ilícitos o que puedan dañar a terceros." },
        { "heading": "5. Propiedad intelectual", "body": "Todos los contenidos del Servicio, incluyendo textos, imágenes y código, son propiedad de Trama o de terceros licenciantes. Su reproducción, distribución o transformación sin autorización está prohibida." },
        { "heading": "6. Limitación de responsabilidad", "body": "Trama no se hace responsable de los daños directos o indirectos derivados del uso del Servicio, incluyendo pérdida de datos, interrupciones o accesos no autorizados, salvo en los casos previstos por la ley." },
        { "heading": "7. Modificaciones", "body": "Trama se reserva el derecho a modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor en el momento de su publicación. El uso continuado del Servicio implica la aceptación de los términos modificados." },
        { "heading": "8. Legislación aplicable", "body": "Estos términos se rigen por la legislación española. Cualquier controversia será sometida a los Juzgados y Tribunales competentes." }
      ]
    },
    "privacy": {
      "title": "Política de privacidad",
      "sections": [
        { "heading": "1. Responsable del tratamiento", "body": "El responsable del tratamiento de tus datos personales es Trama. Puedes contactar con nosotros a través de los canales habilitados en el Servicio." },
        { "heading": "2. Datos recogidos", "body": "Recogemos los datos que nos facilitas al registrarte (nombre, email, fecha de nacimiento), así como datos generados por el uso del Servicio (preferencias, libros añadidos, actividad)." },
        { "heading": "3. Finalidad del tratamiento", "body": "Utilizamos tus datos para prestar el Servicio, gestionar tu cuenta, mejorar la experiencia y cumplir con nuestras obligaciones legales." },
        { "heading": "4. Base legal", "body": "El tratamiento se basa en la ejecución del contrato derivado de la aceptación de los términos, en tu consentimiento y, en su caso, en el cumplimiento de obligaciones legales." },
        { "heading": "5. Conservación", "body": "Conservamos tus datos mientras mantengas la cuenta activa y durante los plazos legalmente exigidos tras su baja." },
        { "heading": "6. Derechos del usuario", "body": "Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a nuestros canales de contacto." },
        { "heading": "7. Contacto", "body": "Para cualquier consulta relacionada con la privacidad puedes contactarnos a través de los medios facilitados en el Servicio." }
      ]
    }
  }
}
```

- [ ] **Step 4: Crear `src/plugins/i18n/locales/en/legal.json`**

```json
{
  "legal": {
    "lastUpdated": "Last updated: {{date}}",
    "terms": {
      "title": "Terms of use",
      "sections": [
        { "heading": "1. Purpose", "body": "These Terms of Use govern the use of the Trama service (hereinafter, \"the Service\") made available to users. Accessing the Service implies full and unconditional acceptance of these terms." },
        { "heading": "2. Acceptance of terms", "body": "By registering and using the Service you accept these terms. If you do not agree with any of them, you must refrain from using the Service." },
        { "heading": "3. Registration and account", "body": "To access certain features, you must create an account by providing accurate information. You are responsible for the confidentiality of your credentials and for all activity carried out under your account." },
        { "heading": "4. Use of the service", "body": "You agree to use the Service in accordance with the law, morality and public order. Use of the Service for unlawful purposes or in a way that could harm third parties is prohibited." },
        { "heading": "5. Intellectual property", "body": "All contents of the Service, including text, images and code, are the property of Trama or of third-party licensors. Their reproduction, distribution or transformation without authorization is prohibited." },
        { "heading": "6. Limitation of liability", "body": "Trama is not liable for direct or indirect damages arising from the use of the Service, including data loss, interruptions or unauthorized access, except in cases provided for by law." },
        { "heading": "7. Modifications", "body": "Trama reserves the right to modify these terms at any time. Modifications will take effect upon publication. Continued use of the Service implies acceptance of the modified terms." },
        { "heading": "8. Applicable law", "body": "These terms are governed by Spanish law. Any dispute will be submitted to the competent courts." }
      ]
    },
    "privacy": {
      "title": "Privacy policy",
      "sections": [
        { "heading": "1. Data controller", "body": "The controller of your personal data is Trama. You may contact us through the channels available in the Service." },
        { "heading": "2. Data collected", "body": "We collect the data you provide at registration (name, email, date of birth), as well as data generated through your use of the Service (preferences, books added, activity)." },
        { "heading": "3. Purpose of processing", "body": "We use your data to provide the Service, manage your account, improve the experience and comply with our legal obligations." },
        { "heading": "4. Legal basis", "body": "Processing is based on the execution of the contract arising from acceptance of the terms, on your consent and, where applicable, on compliance with legal obligations." },
        { "heading": "5. Retention", "body": "We retain your data for as long as your account is active and for the periods legally required after its termination." },
        { "heading": "6. User rights", "body": "You may exercise your rights of access, rectification, erasure, objection, restriction and portability by writing to our contact channels." },
        { "heading": "7. Contact", "body": "For any privacy-related inquiry you may contact us through the means provided in the Service." }
      ]
    }
  }
}
```

- [ ] **Step 5: Registrar `legal.json` en `src/plugins/i18n/i18n.ts`**

Edita el archivo. Justo tras `import enToasts from "./locales/en/toasts.json";` (línea ~16), añade:

```ts
import enLegal from "./locales/en/legal.json";
```

Justo tras `import esToasts from "./locales/es/toasts.json";` (línea ~29), añade:

```ts
import esLegal from "./locales/es/legal.json";
```

Dentro de `resources.en.translation` (en el spread del objeto), añade `...enLegal,` después de `...enToasts,`:

```ts
en: {
  translation: {
    ...enNavbar,
    ...enLanding,
    ...enAuth,
    ...enExplore,
    ...enMyLibrary,
    ...enBook,
    ...enErrors,
    ...enFooter,
    ...enBookDetail,
    ...enProfile,
    ...enNotifications,
    ...enToasts,
    ...enLegal,
  },
},
```

Mismo patrón en `resources.es.translation`:

```ts
es: {
  translation: {
    ...esNavbar,
    ...esLanding,
    ...esAuth,
    ...esExplore,
    ...esMyLibrary,
    ...esBook,
    ...esErrors,
    ...esFooter,
    ...esBookDetail,
    ...esProfile,
    ...esNotifications,
    ...esToasts,
    ...esLegal,
  },
},
```

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: build pasa. Vite valida los JSON al importarlos. Si falla por JSON inválido, revisa comas finales y comillas escapadas en las cadenas de los `body`.

- [ ] **Step 7: Commit** *(requiere aprobación explícita del usuario)*

```bash
git add src/plugins/i18n/locales/es/auth.json src/plugins/i18n/locales/en/auth.json src/plugins/i18n/locales/es/legal.json src/plugins/i18n/locales/en/legal.json src/plugins/i18n/i18n.ts
git commit -m "i18n: add consent strings and legal documents namespace"
```

---

## Task 3: Páginas legales + rutas

**Files:**
- Create: `src/pages/legal/LegalDocument.scss`
- Create: `src/pages/legal/TermsPage.tsx`
- Create: `src/pages/legal/PrivacyPage.tsx`
- Modify: `src/routes/routes.tsx`

Renderizan el contenido de `legal.json` con un layout compartido. Públicas, sin `<AuthRoute>`.

- [ ] **Step 1: Crear `src/pages/legal/LegalDocument.scss`**

```scss
@use '../../styles/lib' as *;

.legal-document {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: var(--page-padding-y) var(--page-padding-x);

  &__title {
    font-family: var(--font-editorial);
    font-size: var(--text-3xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    margin: 0 0 var(--space-2);
    line-height: 1.2;
  }

  &__updated {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    margin: 0 0 var(--space-10);
  }

  &__section {
    margin-bottom: var(--space-8);

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__section-heading {
    font-family: var(--font-editorial);
    font-size: var(--text-xl);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0 0 var(--space-3);
    line-height: 1.3;
  }

  &__section-body {
    font-family: var(--font-main);
    font-size: var(--text-md);
    color: var(--color-text-secondary);
    line-height: 1.7;
    margin: 0;
  }
}
```

- [ ] **Step 2: Crear `src/pages/legal/TermsPage.tsx`**

```tsx
import { useTranslation } from "react-i18next";
import "./LegalDocument.scss";

type LegalSection = {
  heading: string;
  body: string;
};

const LAST_UPDATED = "2026-05-24";

export default function TermsPage() {
  const { t } = useTranslation();
  const sections = t("legal.terms.sections", { returnObjects: true }) as LegalSection[];

  return (
    <article className="legal-document">
      <h1 className="legal-document__title">{t("legal.terms.title")}</h1>
      <p className="legal-document__updated">
        {t("legal.lastUpdated", { date: LAST_UPDATED })}
      </p>
      {sections.map((section) => (
        <section key={section.heading} className="legal-document__section">
          <h2 className="legal-document__section-heading">{section.heading}</h2>
          <p className="legal-document__section-body">{section.body}</p>
        </section>
      ))}
    </article>
  );
}
```

> **Nota react-i18next**: la opción `returnObjects: true` permite que `t()` devuelva un array o un objeto en lugar de un string. Lo casteamos al tipo local `LegalSection[]` para TypeScript.

- [ ] **Step 3: Crear `src/pages/legal/PrivacyPage.tsx`**

```tsx
import { useTranslation } from "react-i18next";
import "./LegalDocument.scss";

type LegalSection = {
  heading: string;
  body: string;
};

const LAST_UPDATED = "2026-05-24";

export default function PrivacyPage() {
  const { t } = useTranslation();
  const sections = t("legal.privacy.sections", { returnObjects: true }) as LegalSection[];

  return (
    <article className="legal-document">
      <h1 className="legal-document__title">{t("legal.privacy.title")}</h1>
      <p className="legal-document__updated">
        {t("legal.lastUpdated", { date: LAST_UPDATED })}
      </p>
      {sections.map((section) => (
        <section key={section.heading} className="legal-document__section">
          <h2 className="legal-document__section-heading">{section.heading}</h2>
          <p className="legal-document__section-body">{section.body}</p>
        </section>
      ))}
    </article>
  );
}
```

- [ ] **Step 4: Registrar rutas en `src/routes/routes.tsx`**

Añade dos imports tras `import ListDetailPage from "@/pages/lists/ListDetailPage";`:

```tsx
import TermsPage from "@/pages/legal/TermsPage";
import PrivacyPage from "@/pages/legal/PrivacyPage";
```

Dentro del array `children` de `App` (entre las rutas existentes), añade antes del cierre del array `]`:

```tsx
{ path: "legal/terms", element: <TermsPage /> },
{ path: "legal/privacy", element: <PrivacyPage /> },
```

(No envolver en `<AuthRoute>` — son públicas.)

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: build pasa. No deberían aparecer errores de tipos por el cast de `returnObjects`.

- [ ] **Step 6: Verificar en navegador**

Run: `npm run dev`
Navega a `http://localhost:5173/legal/terms` y `/legal/privacy`. Comprueba:
- Título grande con tipografía editorial.
- "Última actualización: 2026-05-24" debajo del título.
- 8 secciones en términos, 7 en privacidad.
- Cambia el idioma del navegador a inglés y vuelve a entrar: el contenido se traduce.

- [ ] **Step 7: Commit** *(requiere aprobación explícita del usuario)*

```bash
git add src/pages/legal/LegalDocument.scss src/pages/legal/TermsPage.tsx src/pages/legal/PrivacyPage.tsx src/routes/routes.tsx
git commit -m "feat(legal): add Terms of use and Privacy policy pages with placeholder content"
```

---

## Task 4: Footer — conectar links de Aviso legal y Privacidad

**Files:**
- Modify: `src/components/layout/Footer.tsx`

Cambiar dos `<a href="#">` a `<Link>` de react-router. "Política de cookies" sigue con `#` (fuera de scope).

- [ ] **Step 1: Editar `src/components/layout/Footer.tsx`**

Añade import al inicio del archivo, tras `import { useTranslation } from "react-i18next";`:

```tsx
import { Link } from "react-router";
```

Localiza las constantes `COMPANY_LINKS` y `LEGAL_LINKS` y reemplázalas por:

```tsx
const COMPANY_LINKS = [
  { key: "contact", href: "#", internal: false },
  { key: "about", href: "#", internal: false },
  { key: "privacy", href: "/legal/privacy", internal: true },
] as const;

const LEGAL_LINKS = [
  { key: "legalNotice", href: "/legal/terms", internal: true },
  { key: "cookies", href: "#", internal: false },
] as const;
```

Ahora hay que renderizar `<Link>` para `internal: true` y `<a>` para el resto. Reemplaza el bloque de la columna Empresa por:

```tsx
<section className="footer__column">
  <h3 className="footer__heading">{t("footer.columns.company")}</h3>
  <ul className="footer__list">
    {COMPANY_LINKS.map(({ key, href, internal }) => (
      <li key={key}>
        {internal ? (
          <Link className="footer__link" to={href}>
            {t(`footer.links.${key}`)}
          </Link>
        ) : (
          <a className="footer__link" href={href}>
            {t(`footer.links.${key}`)}
          </a>
        )}
      </li>
    ))}
  </ul>
</section>
```

Y el bloque de la columna Legal:

```tsx
<section className="footer__column">
  <h3 className="footer__heading">{t("footer.columns.legal")}</h3>
  <ul className="footer__list">
    {LEGAL_LINKS.map(({ key, href, internal }) => (
      <li key={key}>
        {internal ? (
          <Link className="footer__link" to={href}>
            {t(`footer.links.${key}`)}
          </Link>
        ) : (
          <a className="footer__link" href={href}>
            {t(`footer.links.${key}`)}
          </a>
        )}
      </li>
    ))}
  </ul>
</section>
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build pasa.

- [ ] **Step 3: Verificar en navegador**

Recarga `npm run dev`. En cualquier página, scroll al footer y haz clic en "Política de privacidad" y "Aviso legal" — deben navegar a `/legal/privacy` y `/legal/terms` respectivamente sin recargar la página (SPA).

- [ ] **Step 4: Commit** *(requiere aprobación explícita del usuario)*

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat(footer): wire Privacy and Legal notice links to real routes"
```

---

## Task 5: Checkbox en RegisterForm (email/password)

**Files:**
- Modify: `src/components/auth/forms/RegisterForm.tsx`
- Modify: `src/components/auth/AuthForm.scss`

Añade el checkbox `acceptedTerms` con los enlaces a las páginas legales, validación required de react-hook-form, y persistencia del consentimiento.

- [ ] **Step 1: Modificar `src/components/auth/forms/RegisterForm.tsx`**

Añade dos imports nuevos al inicio:

```tsx
import { Trans, useTranslation } from "react-i18next";
import { CURRENT_TERMS_VERSION } from "@/services/legal/termsVersion";
```

(Sustituye el `import { useTranslation } from "react-i18next";` existente por el primero de los dos, que también importa `Trans`.)

Modifica el `defaultValues` del `useForm` para incluir el nuevo campo:

```tsx
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
  defaultValues: { email: "", password: "", name: "", surname: "", birthDate: "", acceptedTerms: false },
  mode: "onSubmit",
  reValidateMode: "onSubmit",
});
```

En `onSubmit`, dentro del bloque `createUserProfile(...)`, añade los dos campos de consentimiento. El bloque queda:

```tsx
async function onSubmit(data: RegisterFormValues) {
  setFirebaseError("");
  try {
    const credential = await registerWithEmail(data.email, data.password);
    try {
      await createUserProfile(credential.user.uid, {
        email: data.email,
        name: data.name,
        surname: data.surname,
        birthDate: data.birthDate,
        acceptedTermsAt: new Date().toISOString(),
        acceptedTermsVersion: CURRENT_TERMS_VERSION,
      });
    } catch (profileError) {
      await credential.user.delete();
      throw profileError;
    }
    await sendVerificationEmail(credential.user);
    await logoutUser();
    setSentEmail(data.email);
    setVerificationSent(true);
  } catch (error: unknown) {
    const firebaseErr = error as { code?: string };
    setFirebaseError(getFirebaseErrorMessage(firebaseErr.code ?? "unknown"));
  }
}
```

En el JSX del `<form>`, justo **antes** del `<button className="auth__btn-primary" ...>`, añade el bloque del checkbox:

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
        terms: (
          <a
            className="auth__terms-link"
            href="/legal/terms"
            target="_blank"
            rel="noreferrer noopener"
          />
        ),
        privacy: (
          <a
            className="auth__terms-link"
            href="/legal/privacy"
            target="_blank"
            rel="noreferrer noopener"
          />
        ),
      }}
    />
  </span>
</label>
{errors.acceptedTerms && (
  <p className="auth__error" role="alert">{errors.acceptedTerms.message}</p>
)}
```

> **Nota react-i18next `<Trans>`**: cuando el string de traducción contiene tags como `<terms>...</terms>`, el componente `<Trans>` los reemplaza por los componentes pasados en `components={{ terms: <a/> }}`. Es como hacer interpolación de JSX dentro de un string. El contenido del tag (`Términos de uso`) se inserta como children del componente.

- [ ] **Step 2: Añadir estilos en `src/components/auth/AuthForm.scss`**

Localiza el bloque `&__remember { ... }` (línea ~325) y añade tras él (al mismo nivel de anidamiento):

```scss
  &__terms-row {
    align-items: flex-start;

    input[type="checkbox"] {
      margin-top: 3px;
    }

    span {
      line-height: 1.5;
    }
  }

  &__terms-link {
    color: var(--color-text-primary);
    text-decoration: underline;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-brand-primary);
    }
  }
```

`flex-start` alinea el checkbox con la primera línea del texto cuando el label hace wrap. `margin-top: 3px` corrige el desalineamiento óptico del checkbox respecto al texto.

- [ ] **Step 3: Verificar build + lint**

Run en paralelo:
```bash
npm run build
npm run lint
```

Expected: build pasa. Lint puede mostrar errores preexistentes pero **ninguno nuevo** en `RegisterForm.tsx` ni en `AuthForm.scss`.

- [ ] **Step 4: Verificar en navegador**

Recarga `npm run dev`. Ve a `/auth`, pestaña "Registrarse". Comprueba:
- Aparece el checkbox encima del botón "Registrarse" con el texto y los dos links subrayados.
- Haz clic en "Términos de uso" → abre `/legal/terms` en pestaña nueva.
- Haz clic en "Política de privacidad" → abre `/legal/privacy` en pestaña nueva.
- Rellena el formulario sin marcar el checkbox y pulsa "Registrarse" → aparece el mensaje "Debes aceptar los términos para continuar".
- Marca el checkbox y reenvía → el registro funciona como antes y el documento `Users/{uid}` en Firestore contiene `acceptedTermsAt` (ISO string) y `acceptedTermsVersion: "v1"`.

- [ ] **Step 5: Commit** *(requiere aprobación explícita del usuario)*

```bash
git add src/components/auth/forms/RegisterForm.tsx src/components/auth/AuthForm.scss
git commit -m "feat(auth): add terms acceptance checkbox to register form"
```

---

## Task 6: Helpers para sign-in social

**Files:**
- Modify: `src/services/firebase/firebaseAuth.ts`
- Modify: `src/services/firebase/firebaseUsers.ts`

Necesitamos dos helpers: `getIsNewUser(credential)` (de Firebase Auth) y `userProfileExists(uid)` (de Firestore). Ambos sirven para detectar si un usuario social necesita pasar por el consentimiento.

- [ ] **Step 1: Añadir `getIsNewUser` en `src/services/firebase/firebaseAuth.ts`**

Modifica el import de `firebase/auth` (línea ~1-13) para añadir `getAdditionalUserInfo`:

```ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo,
} from "firebase/auth";
```

Al final del archivo, añade:

```ts
export function getIsNewUser(credential: UserCredential): boolean {
  return getAdditionalUserInfo(credential)?.isNewUser ?? false;
}
```

- [ ] **Step 2: Añadir `userProfileExists` en `src/services/firebase/firebaseUsers.ts`**

Añade al final del archivo:

```ts
export async function userProfileExists(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "Users", uid));
  return snap.exists();
}
```

> **Por qué hacen falta los dos**: si un usuario social cancela el consentimiento, su cuenta de Firebase Auth queda creada pero sin documento en Firestore. La próxima vez que entre, `isNewUser` será `false` (la cuenta ya existe en Auth), pero el documento sigue sin existir. La condición real para mostrar el modal es `isNewUser || !profileExists`.

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build pasa.

- [ ] **Step 4: Commit** *(requiere aprobación explícita del usuario)*

```bash
git add src/services/firebase/firebaseAuth.ts src/services/firebase/firebaseUsers.ts
git commit -m "feat(auth): add helpers for detecting new social sign-in users"
```

---

## Task 7: TermsConsentModal component

**Files:**
- Create: `src/components/auth/TermsConsentModal.tsx`
- Create: `src/components/auth/TermsConsentModal.scss`

Modal con el checkbox de aceptación, los dos enlaces, y los botones Cancelar / Aceptar y continuar. Sigue el patrón de [FollowRequestsModal.tsx](../../../src/components/profile/modals/FollowRequestsModal.tsx).

- [ ] **Step 1: Crear `src/components/auth/TermsConsentModal.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import "./TermsConsentModal.scss";

type TermsConsentModalProps = {
  open: boolean;
  isProcessing?: boolean;
  onAccept: () => void | Promise<void>;
  onCancel: () => void;
};

export default function TermsConsentModal({
  open,
  isProcessing = false,
  onAccept,
  onCancel,
}: TermsConsentModalProps) {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, isProcessing, onCancel]);

  useEffect(() => {
    if (!open) setAccepted(false);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="terms-consent-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-consent-modal-title"
    >
      <div
        className="terms-consent-modal__backdrop"
        onClick={() => { if (!isProcessing) onCancel(); }}
      />
      <div className="terms-consent-modal__panel">
        <h2
          id="terms-consent-modal-title"
          className="terms-consent-modal__title"
        >
          {t("auth.consentModalTitle")}
        </h2>
        <p className="terms-consent-modal__body">
          {t("auth.consentModalBody")}
        </p>

        <label className="auth__remember auth__terms-row">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            disabled={isProcessing}
          />
          <span>
            <Trans
              i18nKey="auth.acceptTermsLabel"
              components={{
                terms: (
                  <a
                    className="auth__terms-link"
                    href="/legal/terms"
                    target="_blank"
                    rel="noreferrer noopener"
                  />
                ),
                privacy: (
                  <a
                    className="auth__terms-link"
                    href="/legal/privacy"
                    target="_blank"
                    rel="noreferrer noopener"
                  />
                ),
              }}
            />
          </span>
        </label>

        <div className="terms-consent-modal__actions">
          <button
            type="button"
            className="terms-consent-modal__btn terms-consent-modal__btn--secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {t("auth.consentCancel")}
          </button>
          <button
            type="button"
            className="terms-consent-modal__btn terms-consent-modal__btn--primary"
            onClick={() => { void onAccept(); }}
            disabled={!accepted || isProcessing}
          >
            {isProcessing ? t("auth.registering") : t("auth.consentAccept")}
          </button>
        </div>
      </div>
    </div>
  );
}
```

> **Nota TS**: `() => { void onAccept(); }` evita el warning "promise returned from event handler" cuando `onAccept` devuelve `Promise<void>`. `void` descarta el promise explícitamente.

- [ ] **Step 2: Crear `src/components/auth/TermsConsentModal.scss`**

```scss
@use '../../styles/lib' as *;

.terms-consent-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);

  &__backdrop {
    position: absolute;
    inset: 0;
    background: var(--color-overlay);
  }

  &__panel {
    position: relative;
    width: 100%;
    max-width: 460px;
    background: var(--color-bg-page);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-modal);
    padding: var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__title {
    font-family: var(--font-editorial);
    font-size: var(--text-2xl);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
    line-height: 1.2;
  }

  &__body {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.6;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  &__btn {
    padding: var(--space-2) var(--space-5);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), opacity var(--transition-fast);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--primary {
      background: var(--color-text-primary);
      color: var(--color-btn-primary-fg);

      &:hover:not(:disabled) {
        background: var(--color-btn-primary-hover);
      }
    }

    &--secondary {
      background: transparent;
      color: var(--color-text-secondary);
      border-color: var(--color-border-medium);

      &:hover:not(:disabled) {
        color: var(--color-text-primary);
        border-color: var(--color-text-primary);
      }
    }
  }
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build pasa.

- [ ] **Step 4: NO commitear todavía** — el modal aún no se usa desde ningún sitio. Commitea junto con la Task 8.

---

## Task 8: Hook social sign-in → modal de consentimiento

**Files:**
- Modify: `src/components/auth/sign-in-buttons/SignInGoogleButton.tsx`
- Modify: `src/components/auth/sign-in-buttons/SignInAppleButton.tsx`

Cambia el flujo: tras `signInWithGoogle()` / `signInWithApple()`, comprueba si es un usuario nuevo. Si lo es, **NO** llama a `createUserProfile` y muestra el modal. Si acepta → crea perfil con consentimiento. Si cancela → cierra sesión.

- [ ] **Step 1: Reemplazar `src/components/auth/sign-in-buttons/SignInGoogleButton.tsx`**

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { signInWithGoogle, logoutUser, getIsNewUser } from "@/services/firebase/firebaseAuth";
import { getFirebaseErrorMessage } from "@/services/firebase/firebaseErrors";
import { createUserProfile, userProfileExists } from "@/services/firebase/firebaseUsers";
import { CURRENT_TERMS_VERSION } from "@/services/legal/termsVersion";
import TermsConsentModal from "@/components/auth/TermsConsentModal";
import googleLogo from "../../../../public/google-logo.svg";

type SignInGoogleButtonProps = {
  disabled?: boolean;
  onError?: (message: string) => void;
};

type PendingUser = {
  uid: string;
  email: string;
  firstName: string;
  surname: string;
};

export default function SignInGoogleButton({ disabled, onError }: SignInGoogleButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<PendingUser | null>(null);
  const [accepting, setAccepting] = useState(false);

  async function handleGoogle() {
    setIsLoading(true);
    try {
      const credential = await signInWithGoogle();
      const [firstName = "", ...rest] = (credential.user.displayName ?? "").split(" ");
      const profileExists = await userProfileExists(credential.user.uid);
      const isFirstSignIn = getIsNewUser(credential) || !profileExists;

      if (isFirstSignIn) {
        setPending({
          uid: credential.user.uid,
          email: credential.user.email ?? "",
          firstName,
          surname: rest.join(" "),
        });
        return;
      }

      // Usuario existente con perfil ya creado: nada que hacer.
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      onError?.(getFirebaseErrorMessage(firebaseError.code ?? "unknown"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAccept() {
    if (!pending) return;
    setAccepting(true);
    try {
      await createUserProfile(pending.uid, {
        email: pending.email,
        name: pending.firstName,
        surname: pending.surname,
        acceptedTermsAt: new Date().toISOString(),
        acceptedTermsVersion: CURRENT_TERMS_VERSION,
      });
      setPending(null);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      onError?.(getFirebaseErrorMessage(firebaseError.code ?? "unknown"));
    } finally {
      setAccepting(false);
    }
  }

  async function handleCancel() {
    setPending(null);
    try {
      await logoutUser();
    } catch {
      // best-effort: si el logout falla el usuario sigue logueado pero sin perfil.
    }
  }

  return (
    <>
      <button
        className="auth__btn-google"
        type="button"
        onClick={handleGoogle}
        disabled={disabled || isLoading}
      >
        <img src={googleLogo} alt="Google" />
        {t("auth.googleBtn")}
      </button>
      <TermsConsentModal
        open={pending !== null}
        isProcessing={accepting}
        onAccept={handleAccept}
        onCancel={handleCancel}
      />
    </>
  );
}
```

- [ ] **Step 2: Reemplazar `src/components/auth/sign-in-buttons/SignInAppleButton.tsx`**

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { signInWithApple, logoutUser, getIsNewUser } from "@/services/firebase/firebaseAuth";
import { createUserProfile, userProfileExists } from "@/services/firebase/firebaseUsers";
import { getFirebaseErrorMessage } from "@/services/firebase/firebaseErrors";
import { CURRENT_TERMS_VERSION } from "@/services/legal/termsVersion";
import TermsConsentModal from "@/components/auth/TermsConsentModal";

type SignInAppleButtonProps = {
  disabled?: boolean;
  onError?: (message: string) => void;
};

type PendingUser = {
  uid: string;
  email: string;
  firstName: string;
  surname: string;
};

export default function SignInAppleButton({ disabled, onError }: SignInAppleButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<PendingUser | null>(null);
  const [accepting, setAccepting] = useState(false);

  async function handleApple() {
    setIsLoading(true);
    try {
      const credential = await signInWithApple();
      const [firstName = "", ...rest] = (credential.user.displayName ?? "").split(" ");
      const profileExists = await userProfileExists(credential.user.uid);
      const isFirstSignIn = getIsNewUser(credential) || !profileExists;

      if (isFirstSignIn) {
        setPending({
          uid: credential.user.uid,
          email: credential.user.email ?? "",
          firstName,
          surname: rest.join(" "),
        });
        return;
      }
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      onError?.(getFirebaseErrorMessage(firebaseError.code ?? "unknown"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAccept() {
    if (!pending) return;
    setAccepting(true);
    try {
      await createUserProfile(pending.uid, {
        email: pending.email,
        name: pending.firstName,
        surname: pending.surname,
        acceptedTermsAt: new Date().toISOString(),
        acceptedTermsVersion: CURRENT_TERMS_VERSION,
      });
      setPending(null);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      onError?.(getFirebaseErrorMessage(firebaseError.code ?? "unknown"));
    } finally {
      setAccepting(false);
    }
  }

  async function handleCancel() {
    setPending(null);
    try {
      await logoutUser();
    } catch {
      // best-effort
    }
  }

  return (
    <>
      <button
        className="auth__btn-apple"
        type="button"
        onClick={handleApple}
        disabled={disabled || isLoading}
      >
        <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-150.9-116.1c-51-75.1-92.3-188.6-92.3-296.6 0-164 107.3-250.8 212.8-250.8 56.4 0 103.4 37.2 138.4 37.2 33.4 0 85.7-39.5 148.1-39.5 23.9 0 108.2 2 165.3 80.4zm-160.4-166c31.5-37.3 54.3-88.9 54.3-140.5 0-7.1-.6-14.3-1.9-20.1-51.6 2-112.3 34.4-149.2 77.3-28.5 32.6-55.1 83.5-55.1 135.8 0 7.7 1.3 15.5 1.9 17.9 3.2.6 8.4 1.3 13.6 1.3 46.5 0 102.5-30.9 136.4-71.7z"/>
        </svg>
        {t("auth.appleBtn")}
      </button>
      <TermsConsentModal
        open={pending !== null}
        isProcessing={accepting}
        onAccept={handleAccept}
        onCancel={handleCancel}
      />
    </>
  );
}
```

- [ ] **Step 3: Verificar build + lint**

```bash
npm run build
npm run lint
```

Expected: build pasa, no errores nuevos en los dos botones ni en el modal.

- [ ] **Step 4: Verificar en navegador**

Recarga `npm run dev`. Si tienes una cuenta de Google de prueba (no la real), entra en `/auth`, pestaña "Iniciar sesión" o "Registrarse", y haz clic en "Continuar con Google".

- **Si es la primera vez con esa cuenta** (o si has borrado tu doc en Firestore manualmente para probar): aparece el modal de consentimiento. Click en "Cancelar" → cierra sesión y vuelve a `/auth`. Click en "Aceptar y continuar" sin marcar el checkbox → botón deshabilitado. Marca el checkbox → botón activo → click → modal se cierra, sesión queda activa y en Firestore el doc tiene los campos de consentimiento.
- **Si ya tienes cuenta**: el modal NO aparece, flujo idéntico al actual.

> **Cómo simular "primera vez"**: en Firebase Console → Authentication, borra el usuario; o en Firestore → Users → borra el documento (la cuenta de Auth sigue creada pero `userProfileExists` devolverá `false` y el flujo te tratará como nuevo).

- [ ] **Step 5: Commit** *(requiere aprobación explícita del usuario)*

```bash
git add src/components/auth/TermsConsentModal.tsx src/components/auth/TermsConsentModal.scss src/components/auth/sign-in-buttons/SignInGoogleButton.tsx src/components/auth/sign-in-buttons/SignInAppleButton.tsx
git commit -m "feat(auth): require terms acceptance for new social sign-in users"
```

---

## Task 9: QA final

**Files:** ninguno — sólo verificación end-to-end.

- [ ] **Step 1: Arrancar dev**

```bash
npm run dev
```

- [ ] **Step 2: Páginas legales accesibles**

- `/legal/terms` → muestra título "Términos de uso" + "Última actualización: 2026-05-24" + 8 secciones numeradas.
- `/legal/privacy` → muestra título "Política de privacidad" + 7 secciones.
- Footer: clic en "Aviso legal" navega a `/legal/terms` sin recargar. Clic en "Política de privacidad" navega a `/legal/privacy`.
- "Política de cookies" sigue siendo `#` (sin navegación).

- [ ] **Step 3: Registro email/password con consentimiento**

- Pestaña "Registrarse" en `/auth`.
- Sin marcar el checkbox: pulsa "Registrarse" → error "Debes aceptar los términos para continuar" inline.
- Los dos links del checkbox abren páginas legales en pestaña nueva.
- Marca el checkbox, completa el form con un email no usado, pulsa registrar.
- Email de verificación enviado. En Firestore: documento `Users/{uid}` contiene `acceptedTermsAt` (ISO) + `acceptedTermsVersion: "v1"`.

- [ ] **Step 4: Sign-in social (Google) primera vez**

- Borra tu doc en `Users/{uid}` desde Firebase Console (para simular "primera vez").
- Clic en "Continuar con Google".
- Aparece el modal de consentimiento. Sin marcar checkbox → botón "Aceptar y continuar" deshabilitado.
- Click en "Cancelar" → modal se cierra, sesión cerrada (vuelves a estado no autenticado).
- Vuelve a clicar "Continuar con Google" → modal aparece otra vez (porque el doc sigue sin existir).
- Marca el checkbox y pulsa "Aceptar y continuar" → modal cierra, sesión activa. Firestore: doc creado con `acceptedTermsAt` + `acceptedTermsVersion`.

- [ ] **Step 5: Sign-in social siguiente vez**

- Cierra sesión y vuelve a hacer clic en "Continuar con Google" con la misma cuenta.
- El modal **NO** debe aparecer. El usuario entra directamente.

- [ ] **Step 6: i18n**

Cambia el idioma del navegador a inglés. Todas las cadenas (checkbox, modal, páginas legales) deben mostrarse en inglés.

- [ ] **Step 7: Dark theme**

Activa el dark mode. Modal, checkbox y páginas legales mantienen contraste correcto (todo usa tokens semánticos).

- [ ] **Step 8: Mobile**

DevTools → 375px ancho. Modal cabe sin overflow horizontal. Checkbox no rompe el wrap del texto. Páginas legales legibles.

- [ ] **Step 9: Accesibilidad rápida**

- Tab a través del checkbox → outline visible.
- En el modal: foco entra al abrir, ESC cierra el modal (si no está procesando).
- Lector de pantalla (opcional): el modal anuncia su título; los links del checkbox son navegables.

---

## Done criteria

La feature está completa cuando:
1. ✅ Páginas `/legal/terms` y `/legal/privacy` renderizan contenido placeholder en ES y EN.
2. ✅ Footer enlaza correctamente a esas dos páginas.
3. ✅ Registro email/password exige el checkbox y persiste `acceptedTermsAt` + `acceptedTermsVersion`.
4. ✅ Sign-in social muestra el modal **solo para usuarios nuevos** (Auth nuevo O sin perfil en Firestore).
5. ✅ Tras aceptar, el perfil se crea con los campos de consentimiento.
6. ✅ Tras cancelar, el usuario queda deslogueado.
7. ✅ `npm run lint` no introduce errores nuevos.
8. ✅ `npm run build` pasa.
9. ✅ Todo funciona en dark theme y en mobile.

---

## Riesgos durante la implementación

- **`<Trans>` con tags personalizados** (Task 5, Task 7): si la traducción aparece con los tags literales (`<terms>...`) en lugar de los enlaces, revisa que el `i18nKey` y los nombres de los componentes (`terms`, `privacy`) coincidan exactamente con los tags del string en JSON.
- **`returnObjects: true`** (Task 3): si TypeScript se queja, asegúrate del cast `as LegalSection[]`. react-i18next devuelve `unknown` o `string` por defecto.
- **Cuenta huérfana en Firebase Auth** (Task 8): si tras cancelar el modal el usuario reentra, el helper `userProfileExists` debe devolver `false` y volver a mostrar el modal. Si esto no ocurre, hay un bug en el helper o en su uso.
- **`auth__terms-link` ya existente**: si por algún motivo esa clase ya está definida en otro SCSS, los estilos pueden chocar. La búsqueda inicial no la encuentra, pero conviene verificar con `grep` antes de añadirla.
