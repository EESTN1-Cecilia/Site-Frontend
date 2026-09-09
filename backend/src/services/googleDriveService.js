const { google } = require('googleapis');
const { Readable } = require('stream');

// Singleton que encapsula la Google Drive API v3 usando una service account.
// Scope mínima: drive.file (solo archivos que la cuenta creó o a los que se le compartió).
class ServicioGoogleDrive {
  constructor() {
    const clavePrivada = process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') // el .env llega con \n escapado
      : undefined;

    const autenticacion = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: clavePrivada,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    this.drive = google.drive({ version: 'v3', auth: autenticacion });
  }

  // Sube un buffer (el PDF ya validado) a la carpeta indicada; NO recibe rutas del cliente.
  async subirArchivo(buffer, nombreArchivo, carpetaId, tipoMime) {
    const respuesta = await this.drive.files.create({
      resource: {
        name: nombreArchivo,
        parents: [carpetaId],
      },
      media: {
        mimeType: tipoMime,
        body: Readable.from(buffer),
      },
      fields: 'id, name, webViewLink',
    });

    return respuesta.data;
  }

  async eliminarArchivo(idArchivo) {
    await this.drive.files.delete({ fileId: idArchivo });
  }
}

// Se exporta una única instancia (compartida por todo el proceso).
module.exports = new ServicioGoogleDrive();
