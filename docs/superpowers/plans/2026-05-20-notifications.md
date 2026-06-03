# Sistema de notificaciones — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activar el icono de campana del navbar para que abra un dropdown con notificaciones del sistema de follow (nuevo seguidor, solicitud entrante, solicitud aceptada), con badge de no leídas en tiempo real y acciones de aceptar/rechazar/borrar.

**Architecture:** Subcolección `Users/{uid}/notifications` que escriben las Cloud Functions de follow (`followUser` y `acceptFollowRequest`) — para atomicidad con aristas y contadores — y `sendFollowRequest` desde cliente (con regla Firestore estricta espejando la de `followRequests`). Un `NotificationsContext` mantiene un `onSnapshot` por sesión autenticada; el `NotificationsBell` consume `unreadCount` para pintar el badge y abre el `NotificationsDropdown` (mismo patrón visual que `ProfileMenu`).

**Tech Stack:** React 19 + TypeScript, Firestore + Cloud Functions (Node), `httpsCallable`, `onSnapshot`, react-i18next con `<Trans>`, SCSS (tokens del repo), lucide-react.

**Convención sobre commits y verificación:**
- **No hay test suite** en el proyecto (CLAUDE.md). Cada tarea termina con una **verificación manual** explícita (consola de Firestore, consola del navegador, dev server).
- **No se incluyen `git commit` automáticos.** El usuario controla los commits. Al final de cada tarea aparece un mensaje de commit **sugerido** que el usuario puede usar o ignorar.

**Especificación de referencia:** [docs/superpowers/specs/2026-05-20-notifications-design.md](../specs/2026-05-20-notifications-design.md)

---

## Estructura de ficheros

**Nuevos:**
- `src/services/firebase/firebaseNotifications.ts` — operaciones Firestore (puras, sin React).
- `src/context/notifications_init.ts` — declara el `Context` y el tipo.
- `src/context/NotificationsContext.tsx` — Provider con listener y mutaciones optimistas.
- `src/hooks/useNotifications.ts` — wrapper de `useContext`.
- `src/components/notifications/NotificationsBell.tsx` — botón con badge.
- `src/components/notifications/NotificationsDropdown.tsx` — desplegable.
- `src/components/notifications/NotificationItem.tsx` — una fila.
- `src/components/notifications/Notifications.scss` — estilos del bell + dropdown + item.
- `src/plugins/i18n/locales/es/notifications.json`
- `src/plugins/i18n/locales/en/notifications.json`

**Modificados:**
- `functions/src/follows.ts` — helper + escrituras de notificación en `followUser` y `acceptFollowRequest`.
- `src/types/UserProfile.ts` — tipos `NotificationType` y `Notification`.
- `src/services/firebase/firebaseFollows.ts` — extender `sendFollowRequest` y `rejectFollowRequest`.
- `src/context/AuthContext` (consumido, no modificado) — usado por el nuevo provider.
- `src/App.tsx` — montar `<NotificationsProvider>`.
- `src/components/layout/Navbar.tsx` — sustituir el botón Bell.
- `src/components/layout/Navbar.scss` — añadir `&__bell-wrap` (si hace falta) — pero todo el SCSS específico vive en `Notifications.scss`.
- `src/plugins/i18n/i18n.ts` — registrar las nuevas `notifications.json` en el namespace `translation`.
- **Firestore Rules** (consola Firebase) — bloque `notifications`.

---

## Task 1 — Cloud Functions: extender `followUser` y `acceptFollowRequest`

**Files:**
- Modify: `functions/src/follows.ts`

- [ ] **Step 1: Añadir helper `buildActorPayload` al inicio del módulo**

Justo después de los imports y antes de `const REGION`:

```ts
async function buildActorPayload(
  db: admin.firestore.Firestore,
  actorUid: string
): Promise<{
  actorUid: string;
  actorName: string;
  actorUsername: string;
  actorPhotoUrl: string;
}> {
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

- [ ] **Step 2: Extender `followUser` para que cree la notificación `follow` en el target**

Localizar el bloque actual de `followUser` (líneas 10-48 aproximadamente). Sustituirlo entero por:

```ts
export const followUser = onCall({ region: REGION }, async (request) => {
  const followerId = request.auth?.uid;
  if (!followerId) {
    throw new HttpsError("unauthenticated", "Sesión requerida");
  }
  const targetId = request.data?.targetUid as string | undefined;
  if (!targetId || targetId === followerId) {
    throw new HttpsError("invalid-argument", "targetUid inválido");
  }

  const db = admin.firestore();
  const targetSnap = await db.doc(`Users/${targetId}`).get();
  if (!targetSnap.exists) {
    throw new HttpsError("not-found", "Usuario no encontrado");
  }
  if (targetSnap.data()?.isPublic === false) {
    throw new HttpsError(
      "failed-precondition",
      "Perfil privado: usa una solicitud"
    );
  }

  const followingRef = db.doc(`Users/${followerId}/following/${targetId}`);
  if ((await followingRef.get()).exists) {
    return { ok: true }; // idempotente: no crear notificación duplicada
  }

  const actor = await buildActorPayload(db, followerId);
  const ts = admin.firestore.FieldValue.serverTimestamp();
  const inc = admin.firestore.FieldValue.increment(1);
  const notifRef = db.collection(`Users/${targetId}/notifications`).doc();

  const batch = db.batch();
  batch.set(followingRef, { createdAt: ts });
  batch.set(db.doc(`Users/${targetId}/followers/${followerId}`), {
    createdAt: ts,
  });
  batch.update(db.doc(`Users/${followerId}`), { followingCount: inc });
  batch.update(db.doc(`Users/${targetId}`), { followersCount: inc });
  batch.set(notifRef, {
    type: "follow",
    ...actor,
    createdAt: ts,
    read: false,
  });
  await batch.commit();
  return { ok: true };
});
```

- [ ] **Step 3: Extender `acceptFollowRequest` para limpiar huérfanas y notificar al solicitante**

Sustituir entero el bloque actual de `acceptFollowRequest` (líneas 77-115 aproximadamente) por:

```ts
export const acceptFollowRequest = onCall(
  { region: REGION },
  async (request) => {
    const targetId = request.auth?.uid; // el que acepta = dueño del perfil
    if (!targetId) {
      throw new HttpsError("unauthenticated", "Sesión requerida");
    }
    const requesterId = request.data?.requesterUid as string | undefined;
    if (!requesterId) {
      throw new HttpsError("invalid-argument", "requesterUid inválido");
    }

    const db = admin.firestore();
    const reqRef = db.doc(`Users/${targetId}/followRequests/${requesterId}`);
    if (!(await reqRef.get()).exists) {
      throw new HttpsError("not-found", "No hay solicitud de ese usuario");
    }

    // Notificación huérfana que el solicitante creó en la bandeja del target.
    // En el camino idempotente solo limpiamos esto + la solicitud.
    const staleSnap = await db
      .collection(`Users/${targetId}/notifications`)
      .where("type", "==", "follow_request")
      .where("actorUid", "==", requesterId)
      .get();

    const followingRef = db.doc(`Users/${requesterId}/following/${targetId}`);
    if ((await followingRef.get()).exists) {
      const cleanup = db.batch();
      staleSnap.docs.forEach((d) => cleanup.delete(d.ref));
      cleanup.delete(reqRef);
      await cleanup.commit();
      return { ok: true };
    }

    const actor = await buildActorPayload(db, targetId); // el que acepta es el actor
    const ts = admin.firestore.FieldValue.serverTimestamp();
    const inc = admin.firestore.FieldValue.increment(1);
    const notifRef = db
      .collection(`Users/${requesterId}/notifications`)
      .doc();

    const batch = db.batch();
    batch.set(followingRef, { createdAt: ts });
    batch.set(db.doc(`Users/${targetId}/followers/${requesterId}`), {
      createdAt: ts,
    });
    batch.update(db.doc(`Users/${requesterId}`), { followingCount: inc });
    batch.update(db.doc(`Users/${targetId}`), { followersCount: inc });
    batch.set(notifRef, {
      type: "follow_request_accepted",
      ...actor,
      createdAt: ts,
      read: false,
    });
    batch.delete(reqRef);
    staleSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return { ok: true };
  }
);
```

> No tocar `unfollowUser`. No genera ni borra notificaciones en v1.

- [ ] **Step 4: Build local de las funciones**

```bash
cd functions && npm run build
```

**Expected:** sin errores TypeScript. `lib/follows.js` regenerado.

- [ ] **Step 5: Deploy de las dos funciones modificadas**

```bash
firebase deploy --only functions:followUser,functions:acceptFollowRequest
```

**Expected:** "Deploy complete!" en consola. Mensaje "functions[europe-west1-followUser] Successful update" y equivalente para `acceptFollowRequest`.

- [ ] **Step 6: Verificación manual end-to-end de funciones**

Usar dos cuentas reales (A y B) o emulator. Desde la consola del navegador autenticado:

1. **Caso público:** sesión como B, en `Users/A.isPublic = true`, invocar:
   ```js
   firebase.functions().httpsCallable('followUser')({ targetUid: '<A_uid>' });
   ```
   Inspeccionar en Firebase Console → Firestore:
   - `Users/{B}/following/{A}` existe.
   - `Users/{A}/followers/{B}` existe.
   - `Users/{A}.followersCount` subió en 1.
   - `Users/{A}/notifications/<random>` existe con `type: "follow"`, `actorUid: B`, `read: false`, denormalizados poblados.

2. **Doble-click intencional:** invocar `followUser` una segunda vez con los mismos parámetros. Comprobar que **NO** se creó una segunda notificación (idempotencia OK).

3. **Caso aceptación con limpieza:** dejar A público para C (vía consola, set `isPublic=false` en A), invocar `sendFollowRequest` desde C (no hay aún notificación porque la regla cliente todavía no existe — saltarse esta parte si Task 2/3 no están). Si tu setup actual ya tiene un `followRequests/{C}` manualmente creado, sesión como A:
   ```js
   firebase.functions().httpsCallable('acceptFollowRequest')({ requesterUid: '<C_uid>' });
   ```
   Comprobar:
   - Aristas creadas y contadores +1.
   - `Users/{A}/followRequests/{C}` borrado.
   - `Users/{C}/notifications/<random>` con `type: "follow_request_accepted"`, `actorUid: A`.

> Si en este punto aún no hay regla para `notifications`, las notificaciones se siguen creando porque las Cloud Functions corren como admin y se saltan reglas.

**Commit sugerido (si decides commitear):**
```
feat(functions): emitir notificaciones de follow y follow_request_accepted

followUser y acceptFollowRequest crean ahora un doc en
Users/{target}/notifications dentro del mismo batch que aristas y
contadores, garantizando atomicidad. acceptFollowRequest limpia
adicionalmente cualquier notificacion huerfana de tipo follow_request.
```

---

## Task 2 — Reglas Firestore: bloque `notifications`

**Files:**
- Modify: reglas Firestore en consola Firebase (no hay `firestore.rules` versionado en el repo).

- [ ] **Step 1: Localizar el match `Users/{uid}` en las reglas actuales**

Firebase Console → Firestore → Reglas. Buscar el `match /Users/{uid} { ... }`. Dentro de él hay ya bloques para `following`, `followers`, `followRequests`, `blocked`.

- [ ] **Step 2: Añadir el bloque `notifications` justo después del bloque `followRequests`**

Pegar:

```
match /notifications/{notifId} {
  allow read: if isOwner(uid);

  allow create: if isOwner(uid)
                || (
                  isSignedIn()
                  && request.auth.uid == request.resource.data.actorUid
                  && request.resource.data.type == "follow_request"
                  && request.resource.data.read == false
                );

  allow update: if isOwner(uid)
                && request.resource.data.diff(resource.data).affectedKeys()
                     .hasOnly(["read"])
                && request.resource.data.read == true;

  allow delete: if isOwner(uid);
}
```

- [ ] **Step 3: Publicar las reglas**

Botón "Publicar" en la consola. Esperar el banner "Las reglas se han publicado".

- [ ] **Step 4: Verificación manual de seguridad — spot-checks desde el navegador**

Logueado como B, abrir devtools console. Ejecutar uno a uno (sustituir UIDs reales):

```js
const { setDoc, doc, serverTimestamp, updateDoc } = await import("firebase/firestore");
const { db } = await import("@/services/firebase/firebaseInit");

// 1) B intenta crear una notif tipo "follow" en la bandeja de A -> DENEGADO
await setDoc(
  doc(db, "Users", "<A_uid>", "notifications", "test1"),
  { type: "follow", actorUid: "<B_uid>", actorName: "", actorUsername: "", actorPhotoUrl: "", createdAt: serverTimestamp(), read: false }
).catch((e) => console.log("OK denegado:", e.code));

// 2) B intenta crear una notif tipo "follow_request" suplantando a C -> DENEGADO
await setDoc(
  doc(db, "Users", "<A_uid>", "notifications", "test2"),
  { type: "follow_request", actorUid: "<C_uid>", actorName: "", actorUsername: "", actorPhotoUrl: "", createdAt: serverTimestamp(), read: false }
).catch((e) => console.log("OK denegado:", e.code));

// 3) B crea una notif tipo "follow_request" siendo el propio actor -> OK
await setDoc(
  doc(db, "Users", "<A_uid>", "notifications", "test3"),
  { type: "follow_request", actorUid: "<B_uid>", actorName: "B", actorUsername: "b", actorPhotoUrl: "", createdAt: serverTimestamp(), read: false }
);
console.log("OK creada test3");
```

Logueado como A (dueño), ejecutar:

```js
// 4) A actualiza solo el campo read a true -> OK
await updateDoc(doc(db, "Users", "<A_uid>", "notifications", "test3"), { read: true });
console.log("OK marcada leída");

// 5) A intenta cambiar type junto con read -> DENEGADO
await updateDoc(
  doc(db, "Users", "<A_uid>", "notifications", "test3"),
  { read: true, type: "follow" }
).catch((e) => console.log("OK denegado:", e.code));

// 6) A intenta poner read a false -> DENEGADO
await updateDoc(
  doc(db, "Users", "<A_uid>", "notifications", "test3"),
  { read: false }
).catch((e) => console.log("OK denegado:", e.code));
```

Borrar el doc de prueba: `await deleteDoc(doc(db, "Users", "<A_uid>", "notifications", "test3"))`.

**Expected:** los 5 chequeos imprimen "OK denegado" o "OK creada/marcada" según corresponda. Si alguno difiere, revisar la regla.

**Commit sugerido (si decides commitear el spec y/o snapshots de reglas):**
Las reglas no están versionadas en el repo; este paso no tiene commit asociado a menos que decidamos versionarlas (fuera de scope).

---

## Task 3 — Tipos y servicio cliente

**Files:**
- Modify: `src/types/UserProfile.ts`
- Create: `src/services/firebase/firebaseNotifications.ts`
- Modify: `src/services/firebase/firebaseFollows.ts`

- [ ] **Step 1: Añadir tipos `NotificationType` y `Notification` a `src/types/UserProfile.ts`**

Añadir al final del archivo, después del `ActivityItem`:

```ts
export type NotificationType =
  | "follow"
  | "follow_request"
  | "follow_request_accepted";

export type Notification = {
  id: string;
  type: NotificationType;
  actorUid: string;
  actorName: string;
  actorUsername: string;
  actorPhotoUrl: string;
  createdAt: Timestamp;
  read: boolean;
};
```

`Timestamp` ya está importado al inicio del archivo (`import type { Timestamp } from "firebase/firestore";`).

- [ ] **Step 2: Crear `src/services/firebase/firebaseNotifications.ts`**

Contenido íntegro:

```ts
// src/services/firebase/firebaseNotifications.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebaseInit";
import type { Notification, UserMinimal } from "@/types/UserProfile";

const COL = (uid: string) => collection(db, "Users", uid, "notifications");

/** Una lectura puntual de las 50 más recientes. */
export async function getNotifications(
  uid: string,
  maxResults = 50
): Promise<Notification[]> {
  const snap = await getDocs(
    query(COL(uid), orderBy("createdAt", "desc"), limit(maxResults))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Notification, "id">) }));
}

/** Listener tiempo real. Devuelve la función de unsubscribe. */
export function subscribeToNotifications(
  uid: string,
  onChange: (items: Notification[]) => void
): Unsubscribe {
  return onSnapshot(
    query(COL(uid), orderBy("createdAt", "desc"), limit(50)),
    (snap) => {
      onChange(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Notification, "id">),
        }))
      );
    }
  );
}

/** Marca todas las notificaciones no leídas del usuario como leídas (batch). */
export async function markAllAsRead(uid: string): Promise<void> {
  const snap = await getDocs(query(COL(uid), where("read", "==", false)));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function deleteNotification(
  uid: string,
  notifId: string
): Promise<void> {
  await deleteDoc(doc(db, "Users", uid, "notifications", notifId));
}

/** Invocada por sendFollowRequest. Crea la notif tipo follow_request en la bandeja del target. */
export async function createFollowRequestNotification(
  targetUid: string,
  actor: UserMinimal
): Promise<void> {
  await addDoc(COL(targetUid), {
    type: "follow_request",
    actorUid: actor.uid,
    actorName: actor.name,
    actorUsername: actor.username,
    actorPhotoUrl: actor.profilePhotoUrl,
    createdAt: serverTimestamp(),
    read: false,
  });
}

/**
 * Borra (best-effort) la notif huérfana de tipo follow_request que dejó
 * el actor en la propia bandeja del usuario autenticado. Usado tras
 * rejectFollowRequest. No lanza si no hay nada que borrar.
 */
export async function deleteOwnFollowRequestNotifFrom(
  uid: string,
  actorUid: string
): Promise<void> {
  const snap = await getDocs(
    query(
      COL(uid),
      where("type", "==", "follow_request"),
      where("actorUid", "==", actorUid)
    )
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
```

- [ ] **Step 3: Extender `sendFollowRequest` en `src/services/firebase/firebaseFollows.ts`**

En el archivo `src/services/firebase/firebaseFollows.ts`, sustituir la función `sendFollowRequest` (líneas 49-64 aproximadamente) por:

```ts
/** Enviar una solicitud de seguimiento a un perfil privado. */
export async function sendFollowRequest(targetUid: string): Promise<void> {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Sesión requerida");

  const profile = await getUserMinimal(me);
  if (!profile) throw new Error("Perfil del solicitante no encontrado");

  await setDoc(doc(db, "Users", targetUid, "followRequests", me), {
    requesterUid: me,
    createdAt: serverTimestamp(),
    requesterName: profile.name,
    requesterUsername: profile.username,
    requesterPhotoUrl: profile.profilePhotoUrl,
  });

  // Best-effort: si falla, queda solicitud sin notif (degradación documentada).
  try {
    await createFollowRequestNotification(targetUid, profile);
  } catch (err) {
    console.warn("[sendFollowRequest] notif create failed", err);
  }
}
```

Y añadir el import al inicio del archivo, junto con los demás:

```ts
import { createFollowRequestNotification, deleteOwnFollowRequestNotifFrom } from "./firebaseNotifications";
```

- [ ] **Step 4: Extender `rejectFollowRequest` para borrar la notif huérfana propia**

En el mismo `firebaseFollows.ts`, sustituir `rejectFollowRequest` (líneas 72-76 aproximadamente) por:

```ts
export async function rejectFollowRequest(requesterUid: string): Promise<void> {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Sesión requerida");
  await deleteDoc(doc(db, "Users", me, "followRequests", requesterUid));
  // Best-effort: limpiar la notif huérfana en mi propia bandeja.
  try {
    await deleteOwnFollowRequestNotifFrom(me, requesterUid);
  } catch (err) {
    console.warn("[rejectFollowRequest] notif cleanup failed", err);
  }
}
```

> `cancelFollowRequest` **no** se modifica: el cliente no es dueño de la bandeja del target, así que no puede borrar su notif huérfana. Documentado como degradación de v1.

- [ ] **Step 5: Type check y arranque del dev server**

```bash
npm run build
```

**Expected:** termina sin errores TS.

```bash
npm run dev
```

**Expected:** Vite arranca. No hay errores en consola del navegador al cargar la app.

- [ ] **Step 6: Verificación manual en consola del navegador**

Logueado, abrir devtools y ejecutar (importa dinámico):

```js
const m = await import("@/services/firebase/firebaseNotifications");
const { auth } = await import("@/services/firebase/firebaseInit");
const uid = auth.currentUser.uid;

// Lectura puntual
console.log(await m.getNotifications(uid));

// Listener
const unsub = m.subscribeToNotifications(uid, (items) => console.log("snap:", items));
// (deja correr; al recibir cualquier follow desde otra cuenta debería imprimir un nuevo snap)
// Para parar:
// unsub();
```

Luego, desde una cuenta B (en privado o haz un follow real público hacia A), verificar:
- La consola imprime el nuevo snapshot.
- Si la cuenta target es privada y B llama a `sendFollowRequest`, en Firestore aparece **una solicitud** y **una notificación** `follow_request` con los campos denormalizados.
- Si A rechaza esa solicitud (via `FollowRequestsModal` existente, que sigue funcionando), tanto la solicitud como la notificación huérfana se borran.

**Commit sugerido:**
```
feat(notifications): tipo Notification + firebaseNotifications.ts + integracion en follows

Anade tipos NotificationType/Notification, modulo firebaseNotifications
con get/subscribe/markAllAsRead/delete/create/cleanup, y extiende
sendFollowRequest (crea notif follow_request) y rejectFollowRequest
(limpia su notif huerfana) sin tocar firmas publicas.
```

---

## Task 4 — Context + hook + mount

**Files:**
- Create: `src/context/notifications_init.ts`
- Create: `src/context/NotificationsContext.tsx`
- Create: `src/hooks/useNotifications.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Crear `src/context/notifications_init.ts`**

Contenido íntegro:

```ts
import { createContext } from "react";
import type { Notification } from "@/types/UserProfile";

export type NotificationsContextType = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  acceptRequest: (actorUid: string) => Promise<void>;
  rejectRequest: (actorUid: string) => Promise<void>;
};

export const NotificationsContext =
  createContext<NotificationsContextType | null>(null);
```

- [ ] **Step 2: Crear `src/context/NotificationsContext.tsx`**

Contenido íntegro:

```tsx
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebase/firebaseInit";
import {
  deleteNotification,
  markAllAsRead,
  subscribeToNotifications,
} from "@/services/firebase/firebaseNotifications";
import {
  acceptFollowRequest as acceptFollowRequestFn,
  rejectFollowRequest as rejectFollowRequestFn,
} from "@/services/firebase/firebaseFollows";
import type { Notification } from "@/types/UserProfile";
import { NotificationsContext } from "./notifications_init";

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [uid, setUid] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Track current uid
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUid(fbUser?.uid ?? null);
      if (!fbUser) {
        setNotifications([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to notifications when uid is set
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const unsub = subscribeToNotifications(uid, (items) => {
      setNotifications(items);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAllRead = async () => {
    if (!uid) return;
    if (unreadCount === 0) return;
    // Optimista: marca todas como read=true localmente.
    const rollback = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllAsRead(uid);
    } catch (err) {
      console.error("[notifications] markAllRead failed", err);
      setNotifications(rollback);
    }
  };

  const remove = async (id: string) => {
    if (!uid) return;
    const rollback = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(uid, id);
    } catch (err) {
      console.error("[notifications] remove failed", err);
      setNotifications(rollback);
    }
  };

  const acceptRequest = async (actorUid: string) => {
    if (!uid) return;
    const rollback = notifications;
    setNotifications((prev) =>
      prev.filter(
        (n) => !(n.type === "follow_request" && n.actorUid === actorUid)
      )
    );
    try {
      await acceptFollowRequestFn(actorUid);
    } catch (err) {
      console.error("[notifications] acceptRequest failed", err);
      setNotifications(rollback);
    }
  };

  const rejectRequest = async (actorUid: string) => {
    if (!uid) return;
    const rollback = notifications;
    setNotifications((prev) =>
      prev.filter(
        (n) => !(n.type === "follow_request" && n.actorUid === actorUid)
      )
    );
    try {
      await rejectFollowRequestFn(actorUid);
    } catch (err) {
      console.error("[notifications] rejectRequest failed", err);
      setNotifications(rollback);
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAllRead,
        remove,
        acceptRequest,
        rejectRequest,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
```

- [ ] **Step 3: Crear `src/hooks/useNotifications.ts`**

Contenido íntegro:

```ts
import { useContext } from "react";
import {
  NotificationsContext,
  type NotificationsContextType,
} from "@/context/notifications_init";

export function useNotifications(): NotificationsContextType {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return ctx;
}
```

- [ ] **Step 4: Montar `<NotificationsProvider>` en `src/App.tsx`**

En `src/App.tsx`, añadir el import y envolver `<AppShell />`. El orden importa: necesita estar **dentro** de `<AuthProvider>` (depende de la sesión) y **dentro** de `<ShelfProvider>` no es necesario, pero ponerlo junto al `<ShelfProvider>` mantiene la coherencia visual.

Sustituir:

```tsx
import { ShelfProvider } from "./context/ShelfContext";
```

por:

```tsx
import { ShelfProvider } from "./context/ShelfContext";
import { NotificationsProvider } from "./context/NotificationsContext";
```

Y sustituir el bloque del return de `App`:

```tsx
          <AuthProvider>
            <ShelfProvider>
              <AppShell />
            </ShelfProvider>
          </AuthProvider>
```

por:

```tsx
          <AuthProvider>
            <ShelfProvider>
              <NotificationsProvider>
                <AppShell />
              </NotificationsProvider>
            </ShelfProvider>
          </AuthProvider>
```

- [ ] **Step 5: Type check + dev server**

```bash
npm run build
```

**Expected:** sin errores TS.

```bash
npm run dev
```

**Expected:** la app carga sin errores. Si hay sesión iniciada, en React DevTools debería aparecer `NotificationsProvider` con `notifications` rellenándose desde Firestore.

- [ ] **Step 6: Verificación manual del listener**

1. Abrir la app logueado como A.
2. En devtools React, inspeccionar `NotificationsProvider`. Confirmar que `notifications` se rellena con las notifs reales (creadas en Task 1/3) y `unreadCount` refleja las `read==false`.
3. En otra ventana (modo incógnito), loguearse como B y seguir a A (público) → en la ventana de A, sin recargar, `notifications` debe actualizarse al instante con un nuevo item al principio.
4. Logout A → `notifications` se vacía y `unreadCount` pasa a 0.

**Commit sugerido:**
```
feat(notifications): contexto realtime + hook useNotifications

NotificationsProvider abre un onSnapshot por sesion autenticada y
expone notifications/unreadCount/loading mas operaciones optimistas
(markAllRead, remove, acceptRequest, rejectRequest). Montado en App.tsx
debajo de AuthProvider y ShelfProvider.
```

---

## Task 5 — UI: i18n, dropdown, item, bell, badge

**Files:**
- Create: `src/plugins/i18n/locales/es/notifications.json`
- Create: `src/plugins/i18n/locales/en/notifications.json`
- Modify: `src/plugins/i18n/i18n.ts`
- Create: `src/components/notifications/NotificationItem.tsx`
- Create: `src/components/notifications/NotificationsDropdown.tsx`
- Create: `src/components/notifications/NotificationsBell.tsx`
- Create: `src/components/notifications/Notifications.scss`
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Crear `src/plugins/i18n/locales/es/notifications.json`**

Contenido íntegro:

```json
{
  "notifications": {
    "title": "Notificaciones",
    "empty": "No tienes notificaciones",
    "loading": "Cargando...",
    "ariaBell": "Notificaciones",
    "ariaOpen": "Abrir notificaciones",
    "ariaUnread": "{{count}} notificaciones sin leer",
    "types": {
      "follow": "<1>{{name}}</1> ha empezado a seguirte",
      "follow_request": "<1>{{name}}</1> quiere seguirte",
      "follow_request_accepted": "<1>{{name}}</1> ha aceptado tu solicitud"
    },
    "actions": {
      "accept": "Aceptar",
      "reject": "Rechazar",
      "delete": "Borrar",
      "acceptAria": "Aceptar solicitud",
      "rejectAria": "Rechazar solicitud",
      "deleteAria": "Borrar notificación"
    },
    "time": {
      "secondsAgo": "Ahora",
      "minutesAgo": "Hace {{value}} min",
      "hoursAgo": "Hace {{value}} h",
      "daysAgo": "Hace {{value}} d"
    }
  }
}
```

> El formato `<1>{{name}}</1>` es la sintaxis de `<Trans>` de react-i18next: el `<1>` referencia al primer hijo (un `<strong>`) en el JSX que renderiza el componente.

- [ ] **Step 2: Crear `src/plugins/i18n/locales/en/notifications.json`**

Contenido íntegro:

```json
{
  "notifications": {
    "title": "Notifications",
    "empty": "You have no notifications",
    "loading": "Loading...",
    "ariaBell": "Notifications",
    "ariaOpen": "Open notifications",
    "ariaUnread": "{{count}} unread notifications",
    "types": {
      "follow": "<1>{{name}}</1> started following you",
      "follow_request": "<1>{{name}}</1> wants to follow you",
      "follow_request_accepted": "<1>{{name}}</1> accepted your follow request"
    },
    "actions": {
      "accept": "Accept",
      "reject": "Decline",
      "delete": "Delete",
      "acceptAria": "Accept request",
      "rejectAria": "Decline request",
      "deleteAria": "Delete notification"
    },
    "time": {
      "secondsAgo": "Just now",
      "minutesAgo": "{{value}}m ago",
      "hoursAgo": "{{value}}h ago",
      "daysAgo": "{{value}}d ago"
    }
  }
}
```

- [ ] **Step 3: Registrar las nuevas JSON en `src/plugins/i18n/i18n.ts`**

Añadir los imports junto a los existentes (mantener el orden alfabético por idioma):

```ts
import enNotifications from "./locales/en/notifications.json";
// ...
import esNotifications from "./locales/es/notifications.json";
```

Y dentro de `resources.en.translation` y `resources.es.translation`, añadir el spread:

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
  },
},
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
  },
},
```

- [ ] **Step 4: Crear `src/components/notifications/NotificationItem.tsx`**

Contenido íntegro:

```tsx
import { useNavigate } from "react-router";
import { useTranslation, Trans } from "react-i18next";
import type { TFunction } from "i18next";
import { Check, X } from "lucide-react";
import type { Notification } from "@/types/UserProfile";
import { useNotifications } from "@/hooks/useNotifications";

function timeAgo(
  timestamp: { toDate: () => Date } | null | undefined,
  t: TFunction
): string {
  if (!timestamp) return "";
  const now = Date.now();
  const then = timestamp.toDate().getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return t("notifications.time.secondsAgo");
  if (diff < 3600) {
    return t("notifications.time.minutesAgo", { value: Math.floor(diff / 60) });
  }
  if (diff < 86400) {
    return t("notifications.time.hoursAgo", { value: Math.floor(diff / 3600) });
  }
  return t("notifications.time.daysAgo", { value: Math.floor(diff / 86400) });
}

type Props = {
  notification: Notification;
  onClose: () => void;
};

export default function NotificationItem({ notification, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { remove, acceptRequest, rejectRequest } = useNotifications();

  const displayName =
    notification.actorName ||
    notification.actorUsername ||
    t("profile.userFallback");

  const goToProfile = () => {
    onClose();
    navigate(`/profile/${notification.actorUid}`);
  };

  const isRequest = notification.type === "follow_request";

  return (
    <div
      className={
        "notification-item" + (notification.read ? "" : " notification-item--unread")
      }
    >
      <button
        type="button"
        className="notification-item__body"
        onClick={goToProfile}
      >
        {notification.actorPhotoUrl ? (
          <img
            className="notification-item__avatar"
            src={notification.actorPhotoUrl}
            alt={displayName}
          />
        ) : (
          <div className="notification-item__avatar notification-item__avatar--placeholder">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="notification-item__info">
          <p className="notification-item__text">
            <Trans
              i18nKey={`notifications.types.${notification.type}`}
              values={{ name: displayName }}
              components={[<strong />]}
            />
          </p>
          <span className="notification-item__time">
            {timeAgo(notification.createdAt, t)}
          </span>
        </div>
      </button>

      <div className="notification-item__actions">
        {isRequest ? (
          <>
            <button
              type="button"
              className="notification-item__btn notification-item__btn--accept"
              onClick={() => acceptRequest(notification.actorUid)}
              aria-label={t("notifications.actions.acceptAria")}
            >
              <Check size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="notification-item__btn notification-item__btn--reject"
              onClick={() => rejectRequest(notification.actorUid)}
              aria-label={t("notifications.actions.rejectAria")}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="notification-item__btn notification-item__btn--delete"
            onClick={() => remove(notification.id)}
            aria-label={t("notifications.actions.deleteAria")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Crear `src/components/notifications/NotificationsDropdown.tsx`**

Contenido íntegro:

```tsx
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationItem from "./NotificationItem";

type Props = {
  onClose: () => void;
};

export default function NotificationsDropdown({ onClose }: Props) {
  const { t } = useTranslation();
  const { notifications, loading, markAllRead } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  // Mark all as read on open
  useEffect(() => {
    markAllRead();
    // intencionado: solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click-outside + Escape (mismo patrón que ProfileMenu)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div className="notifications-dropdown" ref={ref} role="menu">
      <div className="notifications-dropdown__header">
        <h2 className="notifications-dropdown__title">
          {t("notifications.title")}
        </h2>
      </div>

      <div className="notifications-dropdown__list">
        {loading && (
          <p className="notifications-dropdown__state">
            {t("notifications.loading")}
          </p>
        )}
        {!loading && notifications.length === 0 && (
          <p className="notifications-dropdown__state">
            {t("notifications.empty")}
          </p>
        )}
        {!loading &&
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onClose={onClose} />
          ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Crear `src/components/notifications/NotificationsBell.tsx`**

Contenido íntegro:

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationsDropdown from "./NotificationsDropdown";
import "./Notifications.scss";

export default function NotificationsBell() {
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="navbar__bell-wrap">
      <button
        className="navbar__btn-icon"
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={
          unreadCount > 0
            ? t("notifications.ariaUnread", { count: unreadCount })
            : t("notifications.ariaBell")
        }
        onClick={() => setOpen((o) => !o)}
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="navbar__bell-badge" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && <NotificationsDropdown onClose={() => setOpen(false)} />}
    </div>
  );
}
```

- [ ] **Step 7: Crear `src/components/notifications/Notifications.scss`**

Contenido íntegro:

```scss
@use '../../styles/lib' as *;

/* ----- Bell wrap + badge (vive en el espacio del Navbar) ----- */
.navbar {
  &__bell-wrap {
    position: relative;
  }

  &__bell-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-main);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    line-height: 1;
    color: #fff;
    background: var(--color-error);
    border-radius: var(--radius-pill);
    pointer-events: none;
  }
}

/* ----- Dropdown (sigue el patron visual de .profile-menu) ----- */
.notifications-dropdown {
  position: absolute;
  top: calc(100% + var(--space-3));
  right: 0;
  min-width: 380px;
  max-width: 420px;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-medium);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card-hover);
  padding: var(--space-3);
  z-index: calc(var(--z-navbar) + 100);
  animation: dropdownIn 180ms cubic-bezier(0.34, 1.2, 0.64, 1) both;

  &::before {
    content: '';
    position: absolute;
    right: 11px;
    top: -5px;
    width: 10px;
    height: 10px;
    background: var(--color-bg-page);
    border-top: 1px solid var(--color-border-medium);
    border-left: 1px solid var(--color-border-medium);
    transform: rotate(45deg);
    pointer-events: none;
  }

  &__header {
    padding: var(--space-2) var(--space-3);
  }

  &__title {
    margin: 0;
    font-family: var(--font-editorial);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
  }

  &__list {
    max-height: 70vh;
    overflow-y: auto;
    margin-top: var(--space-2);
  }

  &__state {
    padding: var(--space-4) var(--space-3);
    text-align: center;
    color: var(--color-text-tertiary);
    font-size: var(--text-sm);
  }
}

/* ----- Item ----- */
.notification-item {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);

  &:hover {
    background: var(--color-neutral-alpha-muted);
  }

  &--unread {
    background: var(--color-neutral-alpha-muted);
  }

  &__body {
    display: grid;
    grid-template-columns: 40px 1fr;
    align-items: center;
    gap: var(--space-3);
    background: transparent;
    border: none;
    padding: 0;
    text-align: left;
    cursor: pointer;
    width: 100%;
    min-width: 0;
  }

  &__avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;

    &--placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-neutral-alpha-muted);
      color: var(--color-text-secondary);
      font-weight: var(--weight-bold);
    }
  }

  &__info {
    min-width: 0;
  }

  &__text {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    line-height: 1.3;

    strong {
      font-weight: var(--weight-semibold);
    }
  }

  &__time {
    display: block;
    margin-top: 2px;
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  &__btn {
    @include flex-center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 50%;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);

    &:hover {
      background: var(--color-neutral-alpha-muted);
      color: var(--color-text-primary);
    }

    &--accept:hover {
      color: var(--color-success, var(--color-text-primary));
    }

    &--reject:hover,
    &--delete:hover {
      color: var(--color-error);
    }
  }
}
```

> Si `--color-success` no existe en el theme, el fallback al text primary ya lo cubre. Validar al ver el componente en pantalla.

- [ ] **Step 8: Reemplazar el botón Bell en `src/components/layout/Navbar.tsx`**

Añadir el import (junto a los demás):

```tsx
import NotificationsBell from "@/components/notifications/NotificationsBell";
```

Sustituir el bloque actual:

```tsx
          <button className="navbar__btn-icon" type="button" aria-label={t("navbar.notifications")}>
            <Bell />
          </button>
```

por:

```tsx
          {isAuthenticated && <NotificationsBell />}
```

Eliminar el import `Bell` de `lucide-react` si ya no se usa en este archivo (sí se sigue usando dentro de `NotificationsBell`, pero allí ya tiene su propio import). Mantener el resto de los iconos (`Search`, `Plus`, `User`).

Línea actual del import:
```tsx
import { Search, Plus, Bell, User } from "lucide-react";
```
Pasa a:
```tsx
import { Search, Plus, User } from "lucide-react";
```

- [ ] **Step 9: Type check + dev server + verificación visual**

```bash
npm run build
```

**Expected:** sin errores TS.

```bash
npm run dev
```

Abrir en navegador, logueado:

1. La campana sale en la navbar. Si tienes notificaciones no leídas, el badge muestra el número (o "9+").
2. Click en la campana → se abre el dropdown con la lista. El badge debe desaparecer en cuanto se monta (efecto `markAllRead`).
3. Esperar ~1 s y refrescar Firestore en consola: las notifs no leídas pasaron a `read=true`.
4. Click en el cuerpo de un item → navega a `/profile/<actorUid>`, dropdown cerrado.
5. Click fuera del dropdown / `Escape` → se cierra.
6. Para un item de tipo `follow_request`: el item tiene dos botones (Check / X). Click en Check → desaparece optimista, en Firestore la solicitud y la notif huérfana se borran y se crean las aristas + `follow_request_accepted` en el otro usuario.
7. Para items `follow` o `follow_request_accepted`: el item tiene un solo botón (X). Click → desaparece optimista, en Firestore el doc se borra.
8. Cambiar idioma (si está disponible) → los textos del dropdown y del item se traducen.

- [ ] **Step 10: Verificación end-to-end completa**

Recorrer la matriz del spec sobre dos cuentas reales:

| Escenario | Resultado esperado |
|---|---|
| A público; B sigue a A | En A aparece notif `follow`, badge a 1 |
| A público; B sigue, B deja de seguir | Notif `follow` queda; badge ya estaba a 0 si A abrió el dropdown |
| A privado; B solicita seguir | En A aparece notif `follow_request` con Accept/Reject |
| A privado; B solicita, B cancela (desde su perfil) | Solicitud desaparece en Firestore; la notif queda viva en A (degradación documentada v1) |
| A privado; B solicita, A acepta | Notif desaparece en A; en B aparece `follow_request_accepted` |
| A privado; B solicita, A rechaza | Notif y solicitud desaparecen en A; B no recibe nada |
| A privado; B solicita, A borra la notif (X) | Notif desaparece en A; la solicitud sigue → A puede aún resolverla desde `FollowRequestsModal` (botón "Solicitudes" en ProfileHeader) |
| Doble-click rápido en Accept | El item desaparece (optimismo) y la función backend es idempotente — no se duplica nada |
| Logout y login con otra cuenta | El listener se reabre apuntando al nuevo uid |
| Badge >9 | Muestra "9+" |

**Commit sugerido:**
```
feat(notifications): UI dropdown + bell con badge + i18n

Anade NotificationsBell con badge de no leidas, NotificationsDropdown
(patron ProfileMenu, max-height: 70vh, marca-todas-leidas al abrir) y
NotificationItem (Trans para nombres en bold, botones Accept/Reject
inline para follow_request, X para los demas). Sustituye el boton Bell
estatico del Navbar y registra notifications.json en el loader i18n.
```

---

## Self-Review (post-write, pre-execution)

**Spec coverage** — repaso de cada sección del spec:

- ✅ Modelo de datos `NotificationType`/`Notification` → Task 3, Step 1.
- ✅ Reglas Firestore → Task 2, Steps 1–4.
- ✅ Cloud Functions: helper, extensión `followUser`, extensión `acceptFollowRequest`, idempotencia → Task 1, Steps 1–6.
- ✅ Servicio cliente `firebaseNotifications.ts` con todas las funciones declaradas → Task 3, Step 2.
- ✅ Extensión `sendFollowRequest`/`rejectFollowRequest` (incluida la justificación de NO tocar `cancelFollowRequest`) → Task 3, Steps 3–4.
- ✅ `NotificationsContext` + `useNotifications` + montaje en `App.tsx` → Task 4.
- ✅ UI: `NotificationsBell`, `NotificationsDropdown`, `NotificationItem`, SCSS reutilizando patrón ProfileMenu → Task 5, Steps 4–8.
- ✅ i18n con `<Trans>` y `<strong>` → Task 5, Steps 1–3 y NotificationItem.
- ✅ Marcar todas como leídas al abrir → Task 5, Step 5 (`useEffect` en `NotificationsDropdown`).
- ✅ Verificación end-to-end → Task 5, Step 10.
- ✅ Fuera de alcance (móvil, push, página dedicada, borrar todas, etc.): no se implementan — coherente con spec.

**Placeholder scan:** revisión pasada. No hay "TBD", "TODO" ni "implementar después". Hay un único "Validar al ver el componente en pantalla" sobre `--color-success` que es una verificación visual real, no un placeholder de implementación.

**Type consistency:** `NotificationsContextType` (con `T` final) se usa de forma uniforme en `notifications_init.ts`, `NotificationsContext.tsx` (via `Provider`) y `useNotifications.ts`. Las funciones del servicio (`getNotifications`, `subscribeToNotifications`, `markAllAsRead`, `deleteNotification`, `createFollowRequestNotification`, `deleteOwnFollowRequestNotifFrom`) tienen el mismo nombre en su definición (Task 3 Step 2) y en sus usos (Task 3 Steps 3–4, Task 4 Step 2). Los nombres de propiedades del context (`notifications`, `unreadCount`, `loading`, `markAllRead`, `remove`, `acceptRequest`, `rejectRequest`) son consistentes en el provider y en los consumidores (`NotificationsDropdown`, `NotificationItem`, `NotificationsBell`).

Una nota intencionada: el provider expone `markAllRead` (sin `As`), mientras que el servicio expone `markAllAsRead` (con `As`). Es deliberado — el primero es la acción de UI (optimista + rollback), el segundo es la primitiva Firestore. No es un bug, está documentado aquí.
