# Entidades

## Área

- id (UUID)
- name (string)
- maxTables (int)

## Relación:

- Un área tiene muchas mesas.

## Mesa

- id (UUID)
- areaId (FK)
- capacity (int)
- vipType (NULL | ROUND | SQUARE_A | SQUARE_B)

### Relación:

- Una mesa pertenece a un área.
- Una mesa puede tener muchas reservas.

## Reserva

- id (UUID)
- tableIds (array)
- areaId (FK)
- date
- startTime
- endTime
- partySize
- normalizedCapacity
- durationMinutes
- status

## Índices recomendados

- (tableId, date, startTime)
- (date, areaId)

## Notas importantes

- No se permite solape por mesa.
- VIP A + B bloquea ambas.
- Capacidad siempre redondea hacia arriba.