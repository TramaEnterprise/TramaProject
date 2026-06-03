# Sistema de notificaciones (v1: eventos sociales de follow)

**Date:** 2026-05-20
**Branch:** feat-notifications
**Related specs:** [2026-05-16-follow-system-functions.md](./2026-05-16-follow-system-functions.md)

---

## Overview

En el navbar hay un icono de campana sin funcionalidad. Esta spec lo activa: al pulsarlo se abre un **dropdown** (mismo patrón visual que `ProfileMenu`) con la lista de notificaciones del usuario autenticado. En v1 las notificaciones modelan únicamente eventos del sistema de follow:

- **follow** — alguien empezó a seguirme (mi perfil es público y alguien pulsó "Seguir").
- **follow_request** — alguien me ha pedido seguirme (mi perfil es privado). La notificación lleva botones **Aceptar / Rechazar** inline.
- **follow_request_accepted** — yo solicité seguir a un perfil privado y el dueño aceptó. Solo informativa.

Cada item se puede **borrar** individualmente. Borrar es solo descartar el aviso: no afecta al grafo de follow. Si el item era una solicitud pendiente y se borra sin Aceptar/Rechazar, la solicitud sigue viva en `followRequests` y se puede atender desde el `FollowRequestsModal` existente.

El badge de no leídas se actualiza en tiempo real (Firestore `onSnapshot`). Al abrir el dropdown se marcan todas como leídas en una sola escritura batch.

---

## Decisiones de diseño (justificación)

### Por qué una colección propia (no derivar de `followers` / `followRequests`)

Una notificación tiene atributos propios que no son derivables del grafo: estado **leído/no leído**, **dismissable** sin afectar al dato canónico, y un **tipo** que puede crecer (likes, comentarios, listas compartidas…) sin tocar el modelo de follow. Derivar de `followers` haría imposible borrar un aviso de "X te ha seguido" sin destruir la arista. Modelar `read` en `followers` mezcla concerns (es un edge del grafo, no un evento). Por eso: subcolección dedicada.

### Por qué Cloud Functions escriben las notificaciones (atomicidad)

El sistema de follow ya ejecuta sus escrituras cross-documento (aristas + contadores) dentro de un `batch` en `followUser` / `acceptFollowRequest`. Inyectar el `batch.set` de la notificación en ese mismo batch garantiza que **arista, contador y notificación van juntos o ninguno**. Si lo hiciera el cliente tras invocar la función, una caída de red entre las dos llamadas dejaría una arista sin notificación o una notificación sin arista (UX engañosa).

### Por qué `sendFollowRequest` sigue siendo cliente (con escritura doble)

`sendFollowRequest` ya hoy es escritura de cliente sobre `Users/{target}/followRequests/{requester}` con regla de creación estricta — el spec del follow lo justifica (no hay contadores cross-doc en juego). Mantener el mismo enfoque para la notificación de `follow_request`: el solicitante crea ambos docs en serie con una regla similar para `notifications`. Si la segunda escritura falla, queda una solicitud sin notificación — degradación aceptable: el target la verá en el `FollowRequestsModal`. Migrar `sendFollowRequest` a Cloud Function por atomicidad perfecta queda como mejora futura.

### Por qué `unsubscribe`-based realtime y no fetch al abrir

Necesitamos un **badge de no leídas** que se actualice cuando llega un evento aunque la pestaña esté abierta. Con fetch‑on‑open el badge no existiría (o requeriría polling). Un `onSnapshot` por sesión autenticada es barato (una sola conexión persistente) y deja todo el flujo (lista + badge) sincronizado de una sola fuente. Vivir en un **Context** y no en la Navbar evita reabrir el socket al desmontar/remontar el header.

### Por qué "borrar = descartar" (no "borrar = rechazar")

El usuario pidió "borrar una notificación una vez vista". Asociar "borrar" a "rechazar la solicitud" haría perder solicitudes por accidente cuando el usuario solo quería ocultar el aviso. Aceptar y Rechazar son acciones explícitas con su propio botón en el item de tipo `follow_request`; "Borrar" es un tercer botón con semántica de descarte. La solicitud sobrevive en `followRequests` y se puede resolver desde el `FollowRequestsModal`.

### Por qué el bell vive solo en desktop en v1

`NavbarMini` (móvil) no tiene icono de perfil ni espacio diseñado para acciones contextuales. Añadir notificaciones en móvil implica decidir UX (modal pantalla completa, hoja inferior, página dedicada) y rediseñar la navegación. Queda fuera de scope para v1. Toda la lógica (Context, servicio, dropdown) queda reutilizable cuando se aborde.

---

## Modelo de datos

### `Users/{uid}/notifications/{notifId}` — NUEVO

```ts
type NotificationType =
  | "follow"
  | "follow_request"
  | "follow_request_accepted";

type Notification = {
  id: string;                  // doc id de Firestore (no almacenado en el body)
  type: NotificationType;
  actorUid: string;            // quien dispara el evento
  // Denormalizados para pintar sin lecturas extra:
  actorName: string;
  actorUsername: string;
  actorPhotoUrl: string;
  createdAt: Timestamp;
  read: boolean;
};
```

El doc ID lo genera Firestore (`addDoc` / `collection().doc()`). No reutilizamos `actorUid` como ID porque el mismo actor puede generar varios eventos a lo largo del tiempo (sigue → bloqueo → vuelve a seguir).

**Sin cambios** en `following`, `followers`, `followersCount`, `followingCount`, `followRequests`.

### Índices

Ninguno extra. Queries:

- `orderBy("createdAt","desc")` — cubierto por el índice por defecto.
- `where("read","==",false)` (para el batch de marcar todas como leídas) — Firestore generará el índice compuesto la primera vez que se ejecute (lo avisa en la consola).
- `where("type","==","follow_request").where("actorUid","==",X)` (limpieza huérfana) — idem.

---

## Reglas Firestore — cambios

Bloque nuevo dentro de `match /Users/{uid}`:

```
match /notifications/{notifId} {
  allow read: if isOwner(uid);

  // Crear: dos casos legítimos desde cliente.
  //   (a) el dueño puede crear en su propia bandeja (no se usa hoy pero deja
  //       la puerta abierta a marcar manualmente).
  //   (b) un tercero crea SOLO una notificación type='follow_request' que
  //       apunta a sí mismo (espejo del caso sendFollowRequest, ya
  //       autorizado en followRequests).
  allow create: if isOwner(uid)
                || (
                  isSignedIn()
                  && request.auth.uid == request.resource.data.actorUid
                  && request.resource.data.type == "follow_request"
                  && request.resource.data.read == false
                );

  // Actualizar: solo el dueño, y solo el campo read pasando a true.
  allow update: if isOwner(uid)
                && request.resource.data.diff(resource.data).affectedKeys()
                     .hasOnly(["read"])
                && request.resource.data.read == true;

  // Borrar: solo el dueño.
  allow delete: if isOwner(uid);
}
```

Notas:

- Las notificaciones de tipo `follow` y `follow_request_accepted` las escribe **siempre la Cloud Function (admin)**, así que se saltan estas reglas. La regla `create` solo habilita el caso cliente, restringido a `follow_request`.
- La restricción `affectedKeys().hasOnly(["read"])` evita que un cliente reescriba `actorUid`/`type`/`createdAt` y disfrace la notificación tras crearla.

---

## Cloud Functions (`functions/src/follows.ts`)

Helper privado al módulo:

```ts
async function buildActorPayload(db: Firestore, actorUid: string) {
  const snap = await db.doc(`Users/${actorUid}`).get();
  const d = snap.data() ?? {};
  return {
    actorUid,
    actorName: (d.name as string) ?? "",
    actorUsername: (d.username as string) ?? "",
    actorPhotoUrl: (d.profilePhotoUrl as string) ?? "",
  };
}
```

### `followUser` — añadir notif `follow` al target

Inmediatamente antes de `batch.commit()`, después de los `set/update` de aristas y contadores:

```ts
const actor = await buildActorPayload(db, followerId);
const notifRef = db.collection(`Users/${targetId}/notifications`).doc();
batch.set(notifRef, {
  type: "follow",
  ...actor,
  createdAt: ts,
  read: false,
});
```

El early-return idempotente actual (si ya existe la arista de following) **no** crea notificación. Evita duplicados al doble-click.

### `acceptFollowRequest` — limpiar huérfana + notificar al solicitante

Dos cambios:

**1.** En ambos caminos (idempotente y normal), limpiar la notificación de tipo `follow_request` que el solicitante había creado en la bandeja del target (queda huérfana tras aceptar):

```ts
const stale = await db.collection(`Users/${targetId}/notifications`)
  .where("type", "==", "follow_request")
  .where("actorUid", "==", requesterId)
  .get();
stale.docs.forEach((d) => batch.delete(d.ref));
```

**2.** En el camino principal (aristas creadas), añadir notificación al solicitante:

```ts
const actor = await buildActorPayload(db, targetId);   // actor = el que aceptó
const notifRef = db.collection(`Users/${requesterId}/notifications`).doc();
batch.set(notifRef, {
  type: "follow_request_accepted",
  ...actor,
  createdAt: ts,
  read: false,
});
```

En el camino idempotente ("ya seguía") solo se limpia la huérfana — no se crea `follow_request_accepted` duplicada.

### `unfollowUser` — sin cambios

No notificamos unfollows.

### `sendFollowRequest` — sigue siendo cliente

No cambia la función (sigue siendo escritura de cliente). Lo que cambia es el servicio cliente, que ahora hace dos escrituras en serie: `followRequests` y `notifications` (§ Cambios en el cliente).

### Despliegue

`firebase deploy --only functions:followUser,functions:acceptFollowRequest`. Mantiene `region: europe-west1` (ya configurado).

---

## Cambios en el cliente

### Tipos — `src/types/UserProfile.ts`

Añadir `NotificationType` y `Notification` al final del archivo, junto a `FollowRequest`.

### Nuevo servicio — `src/services/firebase/firebaseNotifications.ts`

```ts
getNotifications(uid: string, maxResults = 50): Promise<Notification[]>
subscribeToNotifications(uid: string, onChange: (items: Notification[]) => void): Unsubscribe
markAllAsRead(uid: string): Promise<void>
deleteNotification(uid: string, notifId: string): Promise<void>
createFollowRequestNotification(targetUid: string, actor: UserMinimal): Promise<void>
```

- `subscribeToNotifications` envuelve `onSnapshot(query(collection(...), orderBy("createdAt","desc"), limit(50)))` y devuelve el `unsubscribe` de Firestore. `limit(50)` defensivo: si una bandeja crece a cientos por bug, no bajamos la cuota del usuario en una sola sesión.
- `markAllAsRead`: `getDocs(query(..., where("read","==",false)))` → `writeBatch` con `update(ref, {read:true})` para cada uno. No requiere los docs como retorno.
- `deleteNotification`: `deleteDoc(doc(db,"Users",uid,"notifications",notifId))`.
- `createFollowRequestNotification`: `addDoc(...)` con `serverTimestamp()` y `read:false`. Lo invoca `firebaseFollows.sendFollowRequest`.

### `firebaseFollows.ts` — extender 3 funciones

- **`sendFollowRequest(targetUid)`**: tras el `setDoc(...followRequests)` actual, llamar `await createFollowRequestNotification(targetUid, profile)`. Si la segunda falla queda solicitud sin notificación (aceptable — el target la atiende desde el modal de solicitudes).
- **`rejectFollowRequest(requesterUid)`**: tras el `deleteDoc(...followRequests)`, best‑effort `getDocs + deleteDoc` sobre la notificación huérfana de tipo `follow_request` y `actorUid == requesterUid` en la propia bandeja del usuario autenticado.
- **`cancelFollowRequest(targetUid)`**: tras el `deleteDoc(...followRequests)` en el target, **no podemos** borrar la notificación huérfana en la bandeja del target (no somos owner de su `notifications`). Aceptamos esta degradación en v1: la notificación quedará viva hasta que el target la descarte o atienda. Documentar en código.

> Alternativa para `cancelFollowRequest`: ampliar la regla `delete` de `notifications` para permitir al `actorUid` borrar su propia notificación de tipo `follow_request`. Se descarta por v1 — añade complejidad y abre superficie de regla. Volver a evaluar si en uso real molesta.

### Nuevo contexto — `src/context/notifications_init.ts` + `NotificationsContext.tsx`

Mismo split que el resto (`auth_init.ts` / `AuthContext.tsx`).

`notifications_init.ts` exporta el `Context` y el tipo `NotificationsContextValue`:

```ts
type NotificationsContextValue = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  acceptRequest: (actorUid: string) => Promise<void>;
  rejectRequest: (actorUid: string) => Promise<void>;
};
```

`NotificationsContext.tsx`:

- `useAuth()` para obtener `user?.uid`.
- `useEffect` que abre `subscribeToNotifications` cuando hay uid, guarda el `unsubscribe`, y limpia el array al hacer logout.
- `unreadCount` derivado con `useMemo` (`notifications.filter(n => !n.read).length`).
- `markAllRead()`: optimista (mapea `read:true` en estado) + `markAllAsRead(uid)`. Rollback si falla.
- `remove(id)`: optimista (filter out) + `deleteNotification(uid, id)`. Rollback si falla.
- `acceptRequest(actorUid)`: optimista (filter out la notif) + `acceptFollowRequest(actorUid)` del módulo de follows.
- `rejectRequest(actorUid)`: optimista + `rejectFollowRequest(actorUid)` (ya limpia su huérfana cliente-side tras Batch 3).

### Hook — `src/hooks/useNotifications.ts`

Wrapper trivial `useContext(NotificationsContext)`, lanza si se usa fuera del provider. Mismo patrón que `useAuth` / `useShelf`.

### Montaje del provider — `src/App.tsx`

Añadir `<NotificationsProvider>` debajo de `<AuthProvider>` (necesita `user.uid`), junto al `<ShelfProvider>` ya existente. El orden exacto se confirma al implementar leyendo el JSX actual.

### UI — nuevos componentes en `src/components/notifications/`

#### `NotificationsBell.tsx`

Sustituye al `<button>` actual con `<Bell />` en `Navbar.tsx:64-66`:

```tsx
const { unreadCount } = useNotifications();
const [open, setOpen] = useState(false);
return (
  <div className="navbar__bell-wrap">
    <button
      className="navbar__btn-icon"
      onClick={() => setOpen(o => !o)}
      aria-haspopup="true"
      aria-expanded={open}
      aria-label={t("navbar.notifications")}
    >
      <Bell />
      {unreadCount > 0 && (
        <span className="navbar__bell-badge">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
    {open && <NotificationsDropdown onClose={() => setOpen(false)} />}
  </div>
);
```

#### `NotificationsDropdown.tsx`

Mismo patrón que `ProfileMenu`:

- `useEffect` al montar → `markAllRead()` (única escritura masiva del flujo).
- `useEffect` con listeners `mousedown` (click-fuera) y `keydown` (Escape) — copiar de `ProfileMenu.tsx:19-32`.
- Render: header con título; lista con `loading` / `empty` / items.
- Lista interna con `max-height: 70vh; overflow-y: auto`.

#### `NotificationItem.tsx`

Props: `notification: Notification`, `onClose: () => void`.

- Avatar (mismo placeholder de la inicial que `FollowRequestsModal`).
- Texto resuelto vía `<Trans>` de `react-i18next` (para soportar `<strong>` en el nombre): `t(\`notifications.types.${notification.type}\`, { name: actorName || actorUsername || t('profile.userFallback') })`.
- `timeAgo(createdAt, t)` — reutilizar helper de `ActivityItem`.
- Acciones según tipo:
  - `follow_request` → botones `Aceptar` (icono `Check`) y `Rechazar` (icono `X`) inline → llaman a `acceptRequest` / `rejectRequest` del context.
  - `follow`, `follow_request_accepted` → un único botón `×` para `remove(id)`.
- Click en el cuerpo (no en los botones) → `navigate('/profile/' + actorUid)` + `onClose()`.
- Estado no-leído: clase modificadora con `background: var(--color-neutral-alpha-muted)`.

### SCSS

Archivo `src/components/notifications/notifications.scss` (o uno por componente, según patrón del repo verificado al implementar — `ProfileMenu.scss` está junto al `.tsx`). Reutiliza la estructura visual de `profile-menu`:

- `position: absolute; top: calc(100% + var(--space-3)); right: 0;`
- `min-width: 380px` (más texto por línea que el menú de perfil).
- `max-height: 70vh; overflow-y: auto` en la lista interna.
- `::before` con la flecha del dropdown (igual que `profile-menu`).
- Animación `dropdownIn` (ya definida; extraer a mixin si no lo está).

Item con `display: grid; grid-template-columns: 40px 1fr auto;` para alinear avatar / texto / acciones.

Badge en bell:

```
position: absolute;
top: 4px; right: 4px;
min-width: 18px; height: 18px;
padding: 0 5px;
font-size: var(--text-xs);
font-weight: var(--weight-bold);
background: var(--color-error);
color: white;
border-radius: var(--radius-pill);
```

### i18n — `src/plugins/i18n/locales/{es,en}/notifications.json`

```json
{
  "notifications": {
    "title": "Notificaciones",
    "empty": "No tienes notificaciones",
    "loading": "Cargando...",
    "types": {
      "follow": "<strong>{{name}}</strong> ha empezado a seguirte",
      "followRequest": "<strong>{{name}}</strong> quiere seguirte",
      "followRequestAccepted": "<strong>{{name}}</strong> ha aceptado tu solicitud"
    },
    "actions": {
      "accept": "Aceptar",
      "reject": "Rechazar",
      "delete": "Borrar",
      "acceptAria": "Aceptar solicitud",
      "rejectAria": "Rechazar solicitud",
      "deleteAria": "Borrar notificación"
    }
  }
}
```

Equivalente en `en/`. Añadir el archivo al merge del namespace en el loader de i18n (verificar al implementar).

### Cambios en `Navbar.tsx`

Sustituir:

```tsx
- <button className="navbar__btn-icon" type="button" aria-label={t("navbar.notifications")}>
-   <Bell />
- </button>
+ {isAuthenticated && <NotificationsBell />}
```

Solo se muestra si hay sesión.

### `FollowRequestsModal` existente

**Sin cambios** en v1. Sigue siendo la vista canónica de "todas las solicitudes pendientes", útil cuando el usuario descartó las notificaciones pero las solicitudes siguen vivas. Sus llamadas a `acceptFollowRequest` / `rejectFollowRequest` ya están alineadas con el nuevo flujo (las funciones limpian huérfanas).

---

## Plan por batches

| # | Batch | Contenido |
|---|-------|-----------|
| 1 | Cloud Functions | helper `buildActorPayload`; extender `followUser` y `acceptFollowRequest`; build + deploy |
| 2 | Reglas | bloque `notifications` con create/update/delete restringidos |
| 3 | Tipo + servicio cliente | `Notification` en types; `firebaseNotifications.ts`; extender `sendFollowRequest`/`rejectFollowRequest` |
| 4 | Context + hook | `notifications_init.ts`, `NotificationsContext.tsx`, `useNotifications.ts`, montaje en `App.tsx` |
| 5 | UI dropdown + badge | `NotificationsBell`, `NotificationsDropdown`, `NotificationItem`, SCSS, i18n, sustitución en `Navbar.tsx` |

> Orden importante: Batch 1 (funciones desplegadas) va **antes** de Batch 3 — el cliente verá las notificaciones recién creadas por la función desde el inicio. Batch 2 (reglas) va **antes o junto** a Batch 3 — sin la regla, `sendFollowRequest` extendido falla al crear la notificación.

---

## Verificación end-to-end

| Escenario | Resultado esperado |
|---|---|
| A público; B sigue a A | Notif `follow` en A; badge sube; aristas y contadores OK |
| A público; B sigue, luego deja de seguir | Notif `follow` queda; sin notif extra; contadores vuelven |
| A privado; B solicita seguir | Notif `follow_request` en A con Aceptar/Rechazar |
| A privado; B solicita, B cancela | Solicitud desaparece de `followRequests`; la notif queda viva en A (degradación documentada v1) |
| A privado; B solicita, A acepta | Notif `follow_request` desaparece de A; B recibe `follow_request_accepted`; aristas y contadores OK |
| A privado; B solicita, A rechaza | Notif y solicitud desaparecen de A; B no recibe nada |
| A privado; B solicita, A borra la notif desde el bell | Notif desaparece de A; la solicitud sigue en `followRequests`; A puede resolverla desde `FollowRequestsModal` |
| Doble-click en Aceptar | Una sola escritura efectiva (idempotencia de la Cloud Function) |
| Logout / login con otra cuenta | El listener se desuscribe y reabre apuntando al nuevo uid |
| Bandeja con 50+ notifs | Carga las 50 más recientes; el resto no aparece (consciente; v1) |
| Badge >9 | Muestra "9+" |

Spot-checks de seguridad desde la consola del navegador:

- Cliente B intenta `setDoc(Users/A/notifications/x, { type:"follow", actorUid:"B", read:false, ... })` → **denegado** (la regla `create` solo permite `type:"follow_request"`).
- Cliente B intenta `setDoc(..., { type:"follow_request", actorUid:"C", read:false, ... })` → **denegado** (`actorUid` ≠ `request.auth.uid`).
- Cliente B intenta `setDoc(..., { type:"follow_request", actorUid:"B", read:false, ... })` → **OK**.
- Cliente A (dueño) hace `updateDoc(notifRef, { read:true })` → **OK**.
- Cliente A intenta `updateDoc(notifRef, { read:true, type:"follow" })` → **denegado** (`affectedKeys` debe ser exactamente `["read"]`).
- Cliente A intenta `updateDoc(notifRef, { read:false })` → **denegado** (la regla exige `read == true`).

---

## Fuera de alcance (v1)

- Notificaciones push (FCM) al móvil/PWA cuando la app está cerrada.
- Notificación al hacer unfollow o al ser bloqueado.
- Página dedicada `/notifications` con paginación y filtros por tipo.
- Botón "Borrar todas" / "Marcar todas como no leídas".
- Notificaciones de otros eventos (likes, comentarios en reseñas, libros recomendados, listas compartidas, etc.) — la arquitectura está preparada para añadirlos extendiendo `NotificationType`.
- Migrar `sendFollowRequest` a Cloud Function para atomicidad solicitud↔notificación.
- Borrar la notificación huérfana en la bandeja del target al cancelar una solicitud (hoy queda viva hasta que el target la descarte).
- Bell en `NavbarMini` móvil — requiere rediseño aparte de la barra inferior.
- Garbage-collection de notificaciones cuando se elimina la cuenta del actor (los campos denormalizados quedan "congelados").
- Agrupación de notificaciones ("X y otros 3 te han seguido") cuando llegan varias del mismo tipo en poco tiempo.
