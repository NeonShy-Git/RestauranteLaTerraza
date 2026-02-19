import express from 'express';
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

  const candidateTables = tables
    .filter(t => t.areaId === areaId && t.capacity >= partySize)
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
    status: 'PENDING'
  };
  
  reservations.push(newReservation);
  res.status(201).json(newReservation);
});

seedData();
const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
app.listen(Number(PORT), '0.0.0.0', () => {
    //Agregar servidor en Render y actualizar URL en openapi.yaml
  console.log(`Servidor corriendo en https://restaurantelaterraza-production.up.railway.app`);
});

