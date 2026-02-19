async function runSimpleTest() {
    const URL = `http://localhost:${process.env.PORT || 3000}`;
    console.log("--- Iniciando Pruebas Básicas ---");
    const health = await fetch(`${URL}/health`);
    console.log("Salud del servidor:", health.status === 200 ? "OK" : "Error");

    const seed = await fetch(`${URL}/seed`, { method: 'POST' });
    console.log("Carga de datos iniciales:", seed.status === 200 ? "OK" : "Error");

    const res = await fetch(`${URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            partySize: 2,
            date: "2026-12-01",
            startTime: "20:00",
            duration: 90,
            areaId: "TERRACE"
        })
    });
    console.log("Creación de reserva:", res.status === 201 ? "OK" : "Error");

    const areas = await fetch(`${URL}/areas`);
    console.log("Consulta de áreas:", areas.status === 200 ? "OK" : "Error");

    console.log("--- Pruebas Finalizadas ---");
}

runSimpleTest();