# Despliegue automático en server-tec1

Cada push a `main` → GitHub Actions (runner en el servidor) → construye el frontend,
actualiza el backend y lo reinicia. Cloudflare Tunnel expone todo en https://eestn1.com.

```
GitHub (push a main) ──► runner en server-tec1 ──► /var/www/eestn1 (frontend)
                                              └──► /opt/eestn1/backend (API, systemd)
Internet ► Cloudflare ► túnel ► nginx :80 ─┬─ /      → archivos del frontend
                                           └─ /api/  → backend :3000
```

Se hace una sola vez, en el servidor (usuario `septimo`).

## 1. Programas necesarios

```bash
sudo apt update
sudo apt install -y nginx rsync curl git build-essential python3
# Node 22 (si `node -v` no muestra v22 o superior):
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. Carpetas

```bash
sudo mkdir -p /opt/eestn1/backend/data /var/www/eestn1
sudo chown -R septimo:septimo /opt/eestn1 /var/www/eestn1
```

Copiá la base y el `.env` actuales a `/opt/eestn1/backend/` (`data/database.sqlite` y `.env`).
El `.env` del servidor debe tener, además de lo que ya usás:

```
PORT=3000
CORS_ORIGIN=https://eestn1.com
TRUST_PROXY=2
JWT_SECRET=<32+ caracteres aleatorios>
```

El deploy nunca pisa `.env` ni `data/`.

## 3. Servicio del backend y permiso de reinicio

Copiá `eestn1-backend.service` a `/etc/systemd/system/` y:

```bash
sudo systemctl daemon-reload
sudo systemctl enable eestn1-backend
echo 'septimo ALL=(root) NOPASSWD: /usr/bin/systemctl restart eestn1-backend' | sudo tee /etc/sudoers.d/eestn1-deploy
sudo chmod 440 /etc/sudoers.d/eestn1-deploy
```

(La primera vez el servicio todavía no tiene código: arrancará después del primer deploy.)

## 4. nginx

```bash
sudo cp nginx-eestn1.conf /etc/nginx/sites-available/eestn1
sudo ln -s /etc/nginx/sites-available/eestn1 /etc/nginx/sites-enabled/eestn1
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Runner de GitHub Actions

En GitHub: repo **Site-Frontend → Settings → Actions → Runners → New self-hosted runner → Linux x64**.
Ejecutá en el servidor los comandos que ahí aparecen (incluyen un token temporal propio del repo), y al
configurar:

- Etiquetas adicionales: `servidor-tec1`
- Luego instalalo como servicio: `sudo ./svc.sh install septimo && sudo ./svc.sh start`

Debe figurar como **Idle** (verde) en esa pantalla.

## 6. Cloudflare Tunnel

Zero Trust → Networking → Tunnels → tu túnel → **Public Hostname** (o Published application routes):

| Hostname | Servicio |
|---|---|
| `eestn1.com` | `HTTP` · `localhost:80` |
| `www.eestn1.com` | `HTTP` · `localhost:80` |

Al guardar, Cloudflare reemplaza el registro DNS de `eestn1.com` (hoy apunta a GitHub Pages) por el del túnel.
Ese es el momento del cambio: antes de hacerlo conviene haber corrido un deploy y probar el sitio por
`curl -H 'Host: eestn1.com' http://localhost` desde el servidor.

## 7. Primer deploy

Hacé un push a `main` o, en GitHub → Actions → "Desplegar en el servidor" → **Run workflow**.
Verificá: `systemctl status eestn1-backend` y `curl http://127.0.0.1:3000/api/health`.

## 8. Después del cambio

- Podés desactivar el workflow "Publicar frontend en GitHub Pages" (Actions → ⋯ → Disable workflow) y, en
  Settings → Pages, quitar el dominio personalizado.
- Hacé copia periódica de `/opt/eestn1/backend/data/database.sqlite`.
