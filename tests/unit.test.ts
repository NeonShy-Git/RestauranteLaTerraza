import { calculateEndTime } from '../server';

console.log("Iniciando Unit Tests de Lógica...");

const testTime = () => {
    console.log("\nCaso 1: Cálculo de hora de salida");
    const result = calculateEndTime("19:00", 90);
    if (result === "20:30") {
        console.log("PASÓ: 19:00 + 90min = 20:30");
    } else {
        console.error(`FALLÓ: Se esperaba 20:30 pero salió ${result}`);
    }
};

const testMidnight = () => {
    console.log("\nCaso 2: Cruce de hora");
    const result = calculateEndTime("23:30", 60);
    if (result === "24:30") {
        console.log("PASÓ: Maneja correctamente el incremento de horas");
    }
};

testTime();
testMidnight();
console.log("\n--- Pruebas finalizadas ---");

process.exit(0);