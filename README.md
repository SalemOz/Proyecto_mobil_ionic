# Oído+ (versión híbrida: Ionic + Angular + Capacitor)

App móvil para personas con pérdida auditiva en un solo oído. El teléfono capta el sonido del
ambiente con el micrófono y lo reproduce **solo por el oído sano** a través de audífonos.

Proyecto final de *Programación de Dispositivos Móviles* (USCO).

**Equipo:** Yhoan Sebastian Tamayo Vargas · Delia Del Pilar Valencia Conde

---

## 1. ¿Qué hace la app?

| Pantalla | Archivo | Qué hace |
| --- | --- | --- |
| Formulario inicial | `pages/onboarding` | Pide el nombre y el oído afectado (con validación). Solo aparece la primera vez. |
| Inicio | `pages/home` | Activa/desactiva la amplificación, volumen, modo de ambiente, nivel de sonido en vivo y clima actual con sugerencia de modo. |
| Bienestar | `pages/wellness` | Información de salud en español sobre audición (MedlinePlus): temas sugeridos, buscador y enlace a la fuente. |
| Historial | `pages/history` | Lista de sesiones de uso (fecha, duración, oído y modo). |
| Ajustes | `pages/settings` | Editar perfil (con foto), ayuda, acerca de, borrar historial y cerrar sesión. |

Las pestañas Inicio / Historial / Ajustes están en `pages/tabs` (`ion-tabs` + Angular Router).

## 2. Cómo funciona el audio

Se usa la **Web Audio API** dentro del WebView de Capacitor (no hace falta un plugin nativo de audio):

```
micrófono → ganancia (volumen × modo) → limitador → panorama (todo al oído sano) → audífonos
```

- `getUserMedia` captura el micrófono con eco, supresión de ruido y control automático **desactivados**
  (se quiere el sonido del entorno tal cual).
- Si el oído afectado es el **izquierdo**, el sonido sale solo por el canal **derecho** (`pan = +1`) y viceversa.
- **Volumen** (0–100 %) y **modo de ambiente** (Bajo / Medio / Alto) cambian la ganancia en vivo.
- Un **limitador** (`DynamicsCompressor`) evita picos fuertes.
- Un `AnalyserNode` alimenta la barra de nivel de sonido.
- Mientras amplifica, `@capacitor-community/keep-awake` mantiene la pantalla encendida.
- Cada vez que se detiene, se guarda una sesión en el historial.

Código: `src/app/services/audio.service.ts`.

## 3. API pública y GPS

- **API REST pública:** [Open-Meteo](https://open-meteo.com/) (sin clave). Se consulta con `HttpClient`:
  `GET https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
- **GPS (plugin de Capacitor):** `@capacitor/geolocation` obtiene la ubicación para consultar el clima.
  Si el usuario no da permiso, se usa Neiva por defecto.
- **Información de salud (MedlinePlus):** la pestaña *Bienestar* consulta la API pública de MedlinePlus (Biblioteca Nacional de Medicina de EE. UU., sin clave) con `db=healthTopicsSpanish`. Responde en XML, que se convierte a texto en `parseTopics()`. Los resultados se guardan 24 h (lo pide la política de uso) y se indica la fuente. Código: `src/app/services/health.service.ts`.
- **Sugerencia automática:** con lluvia, tormenta o viento fuerte, la app sugiere el modo **Alto**
  (esos ruidos tapan los sonidos del entorno); con clima despejado sugiere **Bajo**.

Código: `src/app/services/weather.service.ts`.

## 4. Estructura

```
src/app/
├── app.ts / app.config.ts / app.routes.ts   # arranque, proveedores y rutas
├── guards.ts                                # formulario solo la primera vez
├── models.ts                                # tipos: Profile, Session, Weather...
├── validators.ts                            # validación del nombre
├── services/
│   ├── storage.service.ts                   # perfil, ajustes e historial (almacenamiento local)
│   ├── camera.service.ts                    # foto de perfil (Camera + Filesystem)
│   ├── audio.service.ts                     # motor de audio (Web Audio)
│   ├── weather.service.ts                   # GPS + Open-Meteo
│   └── health.service.ts                    # MedlinePlus (información de salud)
└── pages/ onboarding · tabs · home · wellness · history · settings   # .ts / .html / .scss
scripts/android-setup.mjs                    # agrega permisos al AndroidManifest
capacitor.config.ts                          # appId co.edu.usco.oidoplus, webDir www
```

## 5. Datos guardados

Todo queda en el teléfono (`localStorage` del WebView): `oido.profile`, `oido.settings`, `oido.sessions`
(máximo 100 sesiones). No se envía ningún dato personal a internet; solo las coordenadas viajan
a Open-Meteo para obtener el clima.

La **foto de perfil** es la única excepción: se guarda como archivo JPEG en el almacenamiento privado
de la app (`Directory.Data` de `@capacitor/filesystem`) y en `oido.profile` solo queda su nombre
(`avatar`). La imagen nunca se guarda en Base64 dentro de `localStorage`.

## 6. Foto de perfil (Camera + Filesystem)

- **Plugin:** `@capacitor/camera` con la API moderna desde la 8.1: `Camera.takePhoto()` para la cámara
y `Camera.chooseFromGallery()` para la galería (los antiguos `getPhoto()` / `pickImages()` no se usan).
Ionic muestra las dos opciones con `ActionSheetController`; no hay plugins de menús adicionales.
- **Plugin:** `@capacitor/filesystem` (solo para esta funcionalidad). Camera entrega la foto en una
ruta temporal de la caché, así que se copia a `Directory.Data`, el almacenamiento privado de la app.
Se guarda una sola foto (`avatar-<marca de tiempo>.jpg`), se borra la anterior al reemplazarla y al
cerrar sesión. Para mostrarla se obtiene la ruta con `Filesystem.getUri()` y se convierte con
`Capacitor.convertFileSrc()`, de modo que sigue disponible después de cerrar y abrir la app.
- **Servicio:** `src/app/services/camera.service.ts` (`CameraService`). Expone `avatarUrl` y `busy`
como signals. `SettingsPage` solo abre el menú, actualiza el avatar y muestra los avisos
(permiso denegado o error) mediante `UiService`; ninguna página habla directo con los plugins.
- **Funcionamiento del avatar:** se toca el círculo de Ajustes → Tomar una foto / Elegir de la galería.
Si ya hay una foto guardada, el menú incluye **Eliminar foto**, que la quita sin cerrar sesión y sin
tocar el nombre, el oído ni el historial (después de confirmar).
Mientras se procesa se muestra un indicador; si no hay foto (o el usuario cancela) se mantiene la
inicial del nombre. `Profile.avatar` es opcional, así que los perfiles anteriores siguen funcionando.
- **Sincronizar Android:** después de compilar la web, una sola vez por cada cambio:

```bash
ionic build                  # o: npx ng build
npx cap sync android         # copia www/ y registra los plugins nativos
npx cap open android         # Android Studio; espera el Gradle Sync
```

`cap sync` agrega automáticamente `@capacitor/camera` y `@capacitor/filesystem` al proyecto Android.
No hace falta agregar permisos al `AndroidManifest.xml`: Camera abre la app de cámara del sistema y
Filesystem escribe en el almacenamiento privado de la aplicación.

## 7. Instalación y ejecución

Requisitos: Node.js, Ionic CLI (`npm i -g @ionic/cli`), Android Studio con JDK 21.

```bash
npm install                  # instala dependencias
npm start                    # probar en el navegador (http://localhost:4200)
npm test                     # pruebas unitarias (32)

ionic build                  # compila la web en www/   (equivale a: npx ng build)
npx cap add android          # solo la primera vez
npm run android:setup        # agrega permisos de micrófono y ubicación
npx cap sync android         # copia la web al proyecto Android
npx cap open android         # abre Android Studio
```

Regla de oro: cada vez que cambies código, repite `ionic build` y `npx cap sync android`.

### Generar el APK
Android Studio → **Build › Generate App Bundles or APKs › Generate APKs** → *locate*.
El archivo queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

## 8. Permisos de Android

| Permiso | Para qué |
| --- | --- |
| `RECORD_AUDIO` | Capturar el sonido del ambiente |
| `MODIFY_AUDIO_SETTINGS` | Ajustes de audio |
| `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` | Ubicación para el clima |
| `INTERNET` | Consultar Open-Meteo |

Los permisos de micrófono y ubicación se piden al usuario la primera vez que se usan.
La foto de perfil no agrega permisos propios: la cámara se abre con la app del sistema y la imagen
queda en el almacenamiento privado de Oído+.

## 9. Lista de pruebas en el teléfono

1. Abrir la app: aparece el formulario. Probar nombre vacío, `admin`, `Ana123` → muestra error.
2. Elegir oído y continuar: llega a Inicio con el saludo correcto.
3. Conectar audífonos y activar **Amplificación**: aceptar permiso de micrófono; la barra de nivel se mueve.
4. Comprobar que el sonido sale **solo por el oído sano** (tapar/hablar cerca del micrófono).
5. Cambiar volumen y modo: el sonido cambia en vivo. Cambiar el oído en Ajustes: cambia de lado.
6. Desactivar: aparece una sesión nueva en **Historial**.
7. Cerrar la app por completo y abrirla: no pide el formulario y conserva perfil e historial.
8. Clima: aceptar ubicación (muestra "Tu ubicación (GPS)"); negarla (muestra Neiva por defecto).
9. Pestaña **Bienestar**: carga «Pérdida de audición»; tocar otro tema y buscar uno propio; «Leer en MedlinePlus» abre el navegador.
10. Ajustes → **Cerrar sesión**: vuelve al formulario y borra los datos.
11. Ajustes → tocar el avatar → **Tomar una foto** y **Elegir de la galería**: la foto se ve recortada
    en el círculo (guardar un cambio de nombre u oído no la borra).
12. Cancelar la cámara o negar el permiso: se conserva la foto anterior (o la inicial) y aparece un aviso.
13. Tocar el avatar → **Eliminar foto**: confirmar y volver a la inicial; nombre, oído e historial siguen igual.
14. Cerrar la app por completo y abrirla: la foto de perfil sigue ahí; al cerrar sesión vuelve la inicial.

## 10. Limitaciones conocidas

- **Retraso (latencia):** el audio pasa por el WebView, así que hay un pequeño retraso entre el sonido real y
  el que se escucha. Con audífonos con cable es menor; con Bluetooth aumenta.
- **Usar audífonos:** sin audífonos, el parlante del teléfono realimenta el micrófono (pitido).
- **Audífonos Bluetooth:** al abrir el micrófono, Android pone el audio en «modo comunicación»: los botones de volumen
  pasan a controlar el volumen de llamada (más bajo) y el Bluetooth cambia al perfil de manos libres, que es **mono**.
  En mono no existen canales izquierdo y derecho, así que no se puede enviar el sonido a un solo oído.
  Por eso se recomiendan **audífonos con cable**. Una solución completa para Bluetooth requeriría un plugin nativo de audio.
- **Segundo plano:** la captura funciona con la app abierta (la pantalla se mantiene encendida mientras amplifica).
  Seguir captando con la app minimizada requeriría un servicio nativo en primer plano.
- No es un dispositivo médico ni reemplaza un audífono; es una ayuda de conciencia del entorno.

## 11. Relación con la rúbrica

| Entrega | Cumplimiento |
| --- | --- |
| Tercer corte (Ionic + Angular) | `IonCard`, `IonList`, formularios reactivos validados, `HttpClient` a Open-Meteo |
| Avance (Capacitor) | Sincronización con Android Studio + uso funcional de **GPS** (`@capacitor/geolocation`) |
| Evaluación final | App funcionando, código fuente completo y APK instalado en un teléfono real |
