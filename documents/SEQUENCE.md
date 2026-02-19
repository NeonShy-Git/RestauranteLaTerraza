# Diagramas de Secuencia - API La Terraza

Este documento describe el flujo de comunicación entre el Cliente, la API y la capa de datos.

---

## 1. Secuencia – POST /reservations (Creación de Reserva)

Este flujo garantiza que ninguna mesa se asigne doble y que se respete la capacidad óptima.

```mermaid
sequenceDiagram
    participant C as Cliente
    participant S as API Server
    participant D as Base de Datos (Memoria)

    C->>S: POST /reservations (datos reserva)
    Note over S: 1. Valida fecha futura (Evita 422)
    Note over S: 2. Normaliza capacidad (partySize -> mesa ideal)
    
    S->>D: Buscar mesas del AreaId
    D-->>S: Lista de mesas candidatas
    
    loop Validación de disponibilidad
        S->>D: Verificar solapes y colisión VIP (A+B)
        D-->>S: Mesa libre / Mesa ocupada
    end

    alt Mesa encontrada
        S->>D: Guardar reserva (Status: PENDING)
        S-->>C: 201 Created (ID Reserva + Mesa)
    else No hay mesas
        S-->>C: 409 Conflict / 422 No disponible
    end