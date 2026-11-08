// Agrega al AndroidManifest los permisos que necesita Oído+ (micrófono, ubicación).
// Uso (después de "npx cap add android"):  npm run android:setup
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';

if (!existsSync(manifestPath)) {
  console.error('No existe la carpeta android/. Primero ejecuta: npx cap add android');
  process.exit(1);
}

const lines = [
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-feature android:name="android.hardware.microphone" android:required="false" />'
];

let xml = readFileSync(manifestPath, 'utf8');
const missing = lines.filter((line) => !xml.includes(line.match(/android:name="([^"]+)"/)[1]));

if (missing.length === 0) {
  console.log('El AndroidManifest ya tenía todos los permisos.');
} else {
  const block = missing.map((line) => `    ${line}`).join('\n') + '\n';
  xml = xml.replace(/\n(\s*)<\/manifest>/, `\n${block}$1</manifest>`);
  writeFileSync(manifestPath, xml);
  console.log(`Listo: se agregaron ${missing.length} líneas al AndroidManifest.`);
}
