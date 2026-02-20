import express from 'express';
import cors from 'cors';
import { Request, Response } from 'express';


interface Table {
  id: string;
  areaId: string;
  capacity: number;
  type: 'STANDARD' | 'CIRCULAR' | 'VIP_SQUARE';
}

interface Area {
  id: string;
  name: string;
  maxTables: number;
}

interface Reservation {
  id: string;
  tableId: string;
  areaId: string;
  partySize: number;
  date: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

const app = express();
app.use(cors({
  origin: [
    "http://localhost:3000",   // React/Vite
    "http://localhost:5173",   // Vite default
    "http://localhost:4200"    // Angular
  ],
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

let areas: Area[] = [];
let tables: Table[] = [];
let reservations: Reservation[] = [];

export const calculateEndTime = (start: string, duration: number): string => {
  
  const minutosperhour = 60;
  const [hours, minutes] = start.split(':').map(Number);
  const totalMinutes = hours * minutosperhour + minutes + duration;
  const endHours = Math.floor(totalMinutes / minutosperhour);
  const endMinutes = totalMinutes % minutosperhour;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

const seedData = () => {
  const config = [
    { id: 'TERRACE', caps: [2, 2, 4, 4, 6, 6, 8, 8] },
    { id: 'PATIO', caps: [2, 2, 4, 4, 6, 6, 8] },
    { id: 'LOBBY', caps: [2, 2, 4, 4, 6, 6] },
    { id: 'BAR', caps: [2, 2, 2, 4, 4] }
  ];

  config.forEach(conf => {
    areas.push({ id: conf.id, name: conf.id.charAt(0) + conf.id.slice(1).toLowerCase(), maxTables: conf.caps.length });
    conf.caps.forEach((cap, i) => {
      tables.push({ id: `${conf.id}-${i + 1}`, areaId: conf.id, capacity: cap, type: 'STANDARD' });
    });
  });

  areas.push({ id: 'VIP', name: 'Salones VIP', maxTables: 3 });
  tables.push({ id: 'VIP-REDONDA', areaId: 'VIP', capacity: 10, type: 'CIRCULAR' });
  tables.push({ id: 'VIP-A', areaId: 'VIP', capacity: 4, type: 'VIP_SQUARE' });
  tables.push({ id: 'VIP-B', areaId: 'VIP', capacity: 4, type: 'VIP_SQUARE' });

  tables.push({ id: 'VIP-AB', areaId: 'VIP', capacity: 6, type: 'VIP_SQUARE' });

  console.log("Seed actualizado con las capacidades exactas del gerente.");
};

const Capacity = (size: number): number => {
  if (size <= 2) return 2;
  if (size <= 4) return 4;
  if (size <= 6) return 6;
  if (size <= 8) return 8;
  if (size <= 10) return 10;
  return size;
}

app.post('/seed', (req: Request, res: Response) => {
  areas = [];
  tables = [];
  reservations = [];
  seedData();
  res.status(200).json({ message: "Datos reiniciados y cargados exitosamente" });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/areas', (req: Request, res: Response) => {
  const response = areas.map(area => ({
    ...area,
    currentTableCount: tables.filter(t => t.areaId === area.id).length
  }));
  res.json(response);
});

app.post('/areas/:areaId/tables', (req: Request, res: Response) => {
  const { areaId }  = req.params;

  if (typeof areaId !== 'string') {
    return res.status(400).json({ error: "Invalid Area ID" });
  }
  
  const { capacity, type } = req.body;

  const area = areas.find(a => a.id === areaId);
  if (!area) return res.status(404).json({ error: "Área no encontrada" });

  const currentTables = tables.filter(t => t.areaId === areaId && !t.id.includes('-AB'));
  if (currentTables.length >= area.maxTables) {
    return res.status(409).json({ error: `Límite de mesas alcanzado para ${area.name} (Máx: ${area.maxTables})` });
  }

  const newTable: Table = {
    id: `${areaId}-${currentTables.length + 1}`,
    areaId,
    capacity,
    type: type || 'STANDARD'
  };

  tables.push(newTable);
  res.status(201).json(newTable);
});

app.get('/availability', (req: Request, res: Response) => {
  const { partySize, date, startTime, duration, areaId } = req.query;
  
  if (!partySize || !date || !startTime || !duration || !areaId) {
    return res.status(400).json({ error: "Faltan parámetros requeridos (partySize, date, startTime, duration, areaId)" });
  }

  const pSize = Number(partySize);
  const dur = Number(duration);
  const endTime = calculateEndTime(startTime as string, dur);

  const candidateTables = tables.filter(t => t.areaId === areaId && t.capacity >= pSize);

  const availableTables = candidateTables.filter(table => {
    const hasOverlap = reservations.some(r => {
      if (r.date !== date || r.status === 'CANCELLED') return false;
      const isVipCollision = 
        (table.id === 'VIP-AB' && (r.tableId === 'VIP-A' || r.tableId === 'VIP-B')) ||
        (r.tableId === 'VIP-AB' && (table.id === 'VIP-A' || table.id === 'VIP-B'));

      if (r.tableId !== table.id && !isVipCollision) return false;

      return (startTime < r.endTime && endTime > r.startTime);
    });

    return !hasOverlap;
  });
  
  if (availableTables.length === 0) {
    return res.status(200).json({ 
      available: false, 
      message: "No hay mesas disponibles para ese tamaño de grupo u horario." 
    });
  }

  res.status(200).json({
    available: true,
    suggestedTables: availableTables.sort((a, b) => a.capacity - b.capacity)
  });
});


app.post('/reservations', (req: Request, res: Response) => {
  const { partySize, date, startTime, duration, areaId } = req.body;

  const requestDate = new Date(date);
  if (isNaN(requestDate.getTime()) || requestDate < new Date(new Date().setHours(0,0,0,0))) {
    return res.status(422).json({ error: "La fecha debe ser hoy o una fecha futura." });
  }

  const idealCap = Capacity(partySize);

  const candidateTables = tables
    .filter(t => t.areaId === areaId && t.capacity >= idealCap)
    .sort((a, b) => a.capacity - b.capacity);

  if (candidateTables.length === 0) {
    return res.status(422).json({ error: "No hay mesa disponible para esa capacidad en esta área." });
  }

  const endTime = calculateEndTime(startTime, duration);
  let assignedTable: Table | null = null;

  for (const table of candidateTables) {
    const isOverlapping = reservations.some(r => {
      if (r.date !== date || r.status === 'CANCELLED') return false;
      const isVipCollision = 
        (table.id === 'VIP-AB' && (r.tableId === 'VIP-A' || r.tableId === 'VIP-B')) ||
        (r.tableId === 'VIP-AB' && (table.id === 'VIP-A' || table.id === 'VIP-B'));

        if (r.tableId !== table.id && !isVipCollision) return false;
    return (startTime < r.endTime && endTime > r.startTime);
    });

    if (!isOverlapping) {
      assignedTable = table;
      break;
    }
  }

  if (!assignedTable) {
    return res.status(409).json({ error: "No hay disponibilidad para el horario solicitado." });
  }

  const newReservation: Reservation = {
    id: `res_${Math.random().toString(36).substr(2, 9)}`,
    tableId: assignedTable.id,
    areaId,
    partySize,
    date,
    startTime,
    endTime,
    status: 'CONFIRMED'
  };
  
  reservations.push(newReservation);
  res.status(201).json(newReservation);
});

app.patch('/reservations/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const resIndex = reservations.findIndex(r => r.id === id);
  if (resIndex === -1) return res.status(404).json({ error: "Reserva no encontrada" });

  if (status !== 'CONFIRMED' && status !== 'CANCELLED') {
    return res.status(400).json({ error: "Estado no permitido. Use CONFIRMED o CANCELLED" });
  }

  reservations[resIndex].status = status;
  res.json(reservations[resIndex]);
});

app.get('/reservations', (req: Request, res: Response) => {
  const { date, areaId } = req.query;
  let filtered = reservations;

  if (date) filtered = filtered.filter(r => r.date === date);
  if (areaId) filtered = filtered.filter(r => r.areaId === areaId);

  res.json(filtered);
});

app.get('/', (req, res) => {
  res.send('Bienvenido a la API de La Terraza. El servidor está encendido y listo.');
});

seedData();
const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
app.listen(Number(PORT), '0.0.0.0', () => {
    //Agregar servidor en Render y actualizar URL en openapi.yaml
  console.log(`Servidor corriendo en Localhost:${PORT}`);
});

