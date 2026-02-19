# Edge Cases - Sistema de Reservas La Terraza

Este documento detalla cómo la API gestiona los casos borde y las reglas de negocio críticas solicitadas por la gerencia.

---

### 1. Gestión de Capacidad e Inteligencia de Asignación
* **Escenario:** Reserva para 7 personas en el área `TERRACE`.
* **Regla de Amigo:** "Reserva 7 personas → se asigna mesa 8".
* **Explicación Técnica:** El sistema filtra mesas con `capacity >= 7` y aplica un `.sort()` ascendente para asignar la mesa de 8, evitando desperdiciar una mesa de 10 o rechazar al cliente.
* **Resultado:** **Éxito (201 Created).**

### 2. Validación de Tiempo (Pasado y Futuro)
* **Escenario:** Intento de reserva con fecha anterior a la actual.
* **Regla de Amigo:** "Reserva en el pasado → 422".
* **Explicación Técnica:** Se valida la propiedad `date` contra el reloj del servidor antes de procesar la búsqueda de mesas.
* **Resultado:** **Error 422 (Unprocessable Entity).**

### 3. Sincronía de Turnos (Back-to-Back)
* **Escenario:** Una reserva termina a las 19:30 y la siguiente empieza a las 19:30 en la misma mesa.
* **Regla de Amigo:** "Reserva termina exactamente cuando otra empieza → permitido".
* **Explicación Técnica:** La lógica de solapamiento usa comparadores no inclusivos para los límites de tiempo.
* **Resultado:** **Permitido (201 Created).**

### 4. Colisión y Fusión VIP
* **Escenario:** Reserva para 6 personas en VIP.
* **Regla de Amigo:** "Reserva VIP 6 personas → usa A+B".
* **Explicación Técnica:** El sistema utiliza la mesa virtual `VIP-AB`. Si `VIP-A` o `VIP-B` están ocupadas individualmente, el sistema bloquea la unión.
* **Resultado:** **Asignación de mesa unificada.**

### 5. Límites Físicos por Área
* **Escenario:** Intentar agregar una mesa 9 en la Terraza o exceder la capacidad máxima de la mesa más grande.
* **Regla de Amigo:** "Intentar exceder límite de mesas por área → 409 / No hay mesa suficiente → 422".
* **Explicación Técnica:** El sistema valida contra los límites del `seed.json`. Si no hay mesa que soporte el `partySize`, se rechaza antes de buscar disponibilidad.
* **Resultado:** **Error 409 o 422 según el caso.**

### 6. Solapamiento Parcial de Horarios
* **Escenario:** Una mesa está ocupada de 18:00 a 19:30. Se intenta reservar de 19:00 a 20:30.
* **Regla de Amigo:** "Solape parcial → 409".
* **Explicación Técnica:** Se detecta intersección de intervalos mediante la fórmula: `(Start1 < End2) AND (End1 > Start2)`.
* **Resultado:** **Error 409 (Conflict).**

### 7. Gestión de Cancelaciones
* **Escenario:** Intentar confirmar una reserva ya cancelada o re-usar el espacio.
* **Regla de Amigo:** "Cancelación libera disponibilidad / Confirmar cancelada → 409".
* **Explicación Técnica:** Las reservas con `status: 'CANCELLED'` son ignoradas por el motor de búsqueda de disponibilidad, permitiendo que el espacio sea re-asignado inmediatamente.
* **Resultado:** **Disponibilidad actualizada en tiempo real.**

### 8. Integridad de Mesas Especiales
* **Escenario:** Intentar forzar una mesa extra en la zona VIP que no sea la circular o las cuadradas.
* **Regla de Amigo:** "Intentar agregar mesa extra en VIP → 409".
* **Explicación Técnica:** El sistema restringe la creación de nuevas entidades de mesa si el conteo actual es igual al `maxTables` definido para el área VIP.
* **Resultado:** **Error 409 (Conflict).**