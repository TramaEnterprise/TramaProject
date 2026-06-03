# Footer global — Design Spec

**Fecha:** 2026-05-24
**Estado:** Aprobado por el usuario, pendiente plan de implementación.

## Objetivo

Añadir un footer presente en **todas las páginas** de la app que coincida visualmente con la imagen de referencia: cuatro columnas de enlaces (Social, Empresa, Legal, Apoyo) y el nombre de marca "trama" en tipografía editorial grande alineado a la derecha.

## Decisiones tomadas durante el brainstorming

| Pregunta | Decisión |
|---|---|
| Destino de los enlaces | Placeholders con `href="#"`. Se conectarán a páginas reales o URLs sociales cuando existan. |
| Alcance | Aparece en **todas** las páginas, incluida `/auth`. Se monta una sola vez en `AppShell`. |
| Marca "trama" gigante | Grande pero **completa** (sin recortar). El footer crece lo necesario verticalmente. |

## Arquitectura

### Nuevos archivos
- `src/components/layout/Footer.tsx` — componente.
- `src/components/layout/Footer.scss` — estilos BEM siguiendo el patrón de `Navbar.scss`.

### Archivos a modificar
- `src/App.tsx` — montar `<Footer />` en `AppShell`, después de `<main>` y antes de `<AppToaster />`.
- `src/plugins/i18n/locales/es/footer.json` — reemplazar el contenido andamiado por las columnas/enlaces de la imagen.
- `src/plugins/i18n/locales/en/footer.json` — equivalente en inglés.

No se tocan rutas ni layouts: como `App` es el route element raíz y todas las páginas son children de él, el footer hereda visibilidad universal automáticamente.

## Markup

```tsx
<footer className="footer">
  <div className="footer__inner">
    <nav className="footer__columns" aria-label={t("footer.aria.nav")}>
      <section className="footer__column">
        <h3 className="footer__heading">{t("footer.columns.social")}</h3>
        <ul className="footer__list">
          <li>
            <a href="#" className="footer__link" target="_blank" rel="noreferrer noopener">
              {t("footer.links.instagram")}
            </a>
          </li>
          {/* facebook, tiktok, x */}
        </ul>
      </section>
      {/* Empresa, Legal, Apoyo (internos: sin target/rel) */}
    </nav>
    <div className="footer__brand-mark" aria-hidden="true">
      {t("footer.brandMark")}
    </div>
  </div>
  <div className="footer__bottom">
    <small className="footer__copyright">
      {t("footer.copyright", { year: new Date().getFullYear() })}
    </small>
  </div>
</footer>
```

### Decisiones de markup
- Enlaces de la columna **Social** llevan `target="_blank" rel="noreferrer noopener"` para que cuando reemplacemos `#` por URLs externas no haya que tocar el JSX.
- Enlaces internos (Empresa/Legal/Apoyo) son `<a href="#">` por ahora. Cuando las páginas existan se migran a `<Link>` de react-router. No se añaden TODOs en el código — el spec sirve de registro.
- El `footer__brand-mark` es decorativo (`aria-hidden="true"`). El nombre de marca ya es accesible vía el navbar y el copyright.
- Headings `<h3>` para no competir con `<h1>`/`<h2>` de las páginas.

## Contenido i18n

**`es/footer.json`** (sobreescribe el actual):
```json
{
  "footer": {
    "brandMark": "trama",
    "copyright": "© {{year}} Trama · Todos los derechos reservados",
    "aria": {
      "nav": "Pie de página"
    },
    "columns": {
      "social": "Social",
      "company": "Empresa",
      "legal": "Legal",
      "support": "Apoyo"
    },
    "links": {
      "instagram": "Instagram",
      "facebook": "Facebook",
      "tiktok": "TikTok",
      "x": "X",
      "contact": "Contacto",
      "about": "Sobre nosotros",
      "privacy": "Política de privacidad",
      "legalNotice": "Aviso legal",
      "cookies": "Política de cookies",
      "supportContact": "Contacto",
      "sponsorship": "Patrocinio"
    }
  }
}
```

**`en/footer.json`** (equivalente):
```json
{
  "footer": {
    "brandMark": "trama",
    "copyright": "© {{year}} Trama · All rights reserved",
    "aria": {
      "nav": "Footer"
    },
    "columns": {
      "social": "Social",
      "company": "Company",
      "legal": "Legal",
      "support": "Support"
    },
    "links": {
      "instagram": "Instagram",
      "facebook": "Facebook",
      "tiktok": "TikTok",
      "x": "X",
      "contact": "Contact",
      "about": "About us",
      "privacy": "Privacy policy",
      "legalNotice": "Legal notice",
      "cookies": "Cookie policy",
      "supportContact": "Contact",
      "sponsorship": "Sponsorship"
    }
  }
}
```

## Estilos (resumen)

Sigue las convenciones del proyecto: BEM, tokens semánticos (`--color-*`, `--space-*`, `--text-*`), mixin `from($bp-md)` para responsive mobile-first.

### Bloque
- `.footer` — fondo `--color-bg-page`, `border-top: 1px solid var(--color-border-outline)` (espejo del navbar), padding bloque `var(--space-16) 0 var(--space-8)`.

### Layout interno
- `.footer__inner` — `max-width: var(--max-width)`, `margin: 0 auto`, `padding: 0 var(--navbar-padding)`. En desktop: `display: grid; grid-template-columns: 1fr auto; align-items: end; gap: var(--space-12)`. Las columnas a la izquierda; el brand-mark gigante a la derecha, alineado por la base.

### Columnas
- `.footer__columns` — `display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: var(--space-10)`.
- `.footer__column` — sin estilo propio (contenedor semántico).
- `.footer__heading` — `font-family: var(--font-editorial)`, `font-size: var(--text-md)`, `font-weight: var(--weight-semibold)`, color `--color-text-primary`, `margin: 0 0 var(--space-4)`.
- `.footer__list` — `list-style: none`, `padding: 0`, `margin: 0`, `display: flex; flex-direction: column; gap: var(--space-2)`.
- `.footer__link` — `font-family: var(--font-main)`, `font-size: var(--text-sm)`, color `--color-text-secondary`, `text-decoration: none`. Hover → `color: var(--color-text-primary)`. `transition: color var(--transition-fast)`. Focus visible siguiendo el patrón del navbar.

### Marca gigante
- `.footer__brand-mark` — `font-family: var(--font-editorial)`, `font-weight: var(--weight-bold)`, color `--color-text-primary`, `line-height: 0.8` (evita espacio fantasma debajo), `letter-spacing: -0.04em`, `font-size: clamp(96px, 18vw, 260px)`, `align-self: end`, `user-select: none`.

### Bottom
- `.footer__bottom` — `max-width: var(--max-width)`, `margin: var(--space-10) auto 0`, `padding: var(--space-6) var(--navbar-padding) 0`, `border-top: 1px solid var(--color-border-subtle)`.
- `.footer__copyright` — `font-size: var(--text-xs)`, color `--color-text-tertiary`.

### Responsive
- `≤768px`: `.footer__inner` pasa a `grid-template-columns: 1fr` (la marca gigante baja debajo de las columnas). `.footer__columns` pasa a `grid-template-columns: repeat(2, 1fr); gap: var(--space-8)`. `.footer__brand-mark` baja a `font-size: clamp(72px, 22vw, 140px)` y se alinea a la derecha.
- `≤480px`: `.footer__columns` puede mantener 2 columnas (mejor que 1 sola para no alargar la página). Padding reducido.

### Dark theme
Sin reglas extra: todos los colores son tokens semánticos que ya cambian con `[data-theme="dark"]`.

## Integración en `App.tsx`

```tsx
function AppShell() {
  // …código actual sin cambios…
  return (
    <>
      <Navbar hidden={scrolled} />
      <NavbarMini visible={scrolled} />
      <main>
        <Outlet />
      </main>
      <Footer />
      <AppToaster />
    </>
  );
}
```

## Accesibilidad

- `<footer>` semántico (role implícito = `contentinfo`).
- `<nav aria-label>` para que asistivos puedan saltar al footer.
- Headings jerárquicos `<h3>`.
- Marca decorativa con `aria-hidden="true"`.
- Enlaces externos con `rel="noreferrer noopener"`.
- Foco visible vía outline (mismo patrón que `.navbar__link`).

## Fuera de alcance (explícito)

- Iconos SVG junto a los nombres de redes sociales.
- Selector de idioma o tema en el footer.
- Newsletter / suscripción.
- Ocultar el footer en `/auth` (descartado en brainstorming).
- Conectar los enlaces a páginas reales (se hará en PRs posteriores cuando esas páginas existan).
- Animaciones en hover más allá del cambio de color (mantener consistencia con el navbar).

## Riesgos conocidos

- **Footer en `/auth`**: el usuario eligió mostrarlo siempre, pero en pantallas pequeñas el formulario de login podría requerir scroll para ver el footer. No es un bug: es el comportamiento aprobado.
- **Marca gigante en pantallas estrechas**: `clamp()` evita overflow horizontal, pero conviene verificar visualmente en 320px de ancho.
- **El navbar se oculta a `≤640px`** ([Navbar.scss:272-274](src/components/layout/Navbar.scss#L272-L274)). El footer se mantiene visible en mobile — decisión coherente con "todas las páginas".
