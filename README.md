# Sistema de Reservas – Restaurante La Terraza

Este sistema permite gestionar reservas del restaurante evitando sobre-reservas, controlando capacidad por mesa y aplicando reglas especiales para Salones VIP.
La API permite consultar disponibilidad, crear reservas, confirmar/cancelar y administrar mesas por área respetando límites definidos.

### El objetivo principal es eliminar errores actuales como:

- Doble asignación de mesa en el mismo horario.
- Uso incorrecto de mesas grandes para grupos pequeños.
- Confusión con disponibilidad VIP.

## 🌍 URL pública
https://TU-DEPLOY-AQUI.com

## 🚀 Cómo correr el proyecto localmente
npm install
npm run dev


## 🧪 Cómo probar

### Health check
GET /health

Debe responder:

200 OK
{
  "status": "ok"
}

### Swagger / OpenAPI

Disponible en:

/docs
/openapi.yaml

## 🏗 Áreas del restaurante

- Terraza (máx 8 mesas)
- Patio (máx 7 mesas)
- Lobby (máx 6 mesas)
- Bar (máx 5 mesas)
- Salones VIP (máx 3 mesas)

## 🍽 Capacidades disponibles

Mesas estándar:
- 2 personas
- 4 personas
- 6 personas
- 8 personas

### VIP:

- Mesa redonda → 10 personas
- Mesa cuadrada A → 4 personas
- Mesa cuadrada B → 4 personas
- A + B → 6 personas (solo si se combinan)

## 📏 Reglas importantes

- Capacidad siempre redondea hacia arriba.
  - 7 personas → mesa 8
  - 3 personas → mesa 4
- No se permiten solapes por mesa.
- Si una reserva termina exactamente cuando otra empieza → es válido.
- VIP no permite agregar más de 3 mesas.
- Terraza/Patio/Lobby/Bar no pueden superar su máximo definido.

## 📌 Estados de reserva

- Pending
- Confirmed
- Cancelled

## 📦 Estructura del proyecto
/data
  seed.json
  sample_requests.json
/documents
  ERD.md
  SEQUENCE.md
  EDGE_CASES.md
  APROACH.md
/node_modules
/tests
README.md
openapi.yaml
server.ts

## 🧪 Tests incluidos

Unit tests:

- No permite solape.
- Normalización de capacidad.

Integration test:

- Crear reserva → consultar disponibilidad → verificar bloqueo.

## ⚠ Limitaciones actuales

- No se combinan mesas fuera de VIP.
- No hay autenticación.
- No hay pagos integrados.