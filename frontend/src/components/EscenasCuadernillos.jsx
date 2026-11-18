import { Fragment } from "react";
import EscenaScroll, { Caja, Cil, Giro, Pieza } from "./EscenaScroll.jsx";

/* Escenas 3D de los cuadernillos de 1° año (lámpara articulada) y 2° año
   (sensor de proximidad infrarrojo). Los textos salen de cada cuadernillo.
   Medidas en píxeles de la escena: y negativo es hacia arriba y el piso está en y = 55. */

const PINES = {
  backgroundImage: "radial-gradient(circle, #e8cf6a 0 1.5px, transparent 2.1px)",
  backgroundSize: "7px 7px",
};
const TORNILLO = { backgroundImage: "radial-gradient(circle, #cfd3d8 0 4.5px, #1d4ea8 5.5px)" };
const CIRCUITO = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px)",
  backgroundSize: "7px 7px",
};
const BANDAS_H = {
  backgroundImage:
    "repeating-linear-gradient(90deg, transparent 0 4px, #8a3b12 4px 6px, transparent 6px 9px, #1c1c1c 9px 11px, transparent 11px 14px, #c4302b 14px 16px, transparent 16px)",
};
const BANDAS_V = {
  backgroundImage:
    "repeating-linear-gradient(0deg, transparent 0 4px, #8a3b12 4px 6px, transparent 6px 9px, #1c1c1c 9px 11px, transparent 11px 14px, #c4302b 14px 16px, transparent 16px)",
};
const RESISTENCIA = "#d9b77a";

/* ============================================================
   2° año · Sensor de proximidad por luz infrarroja
   ============================================================ */

const SENSOR = [
  {
    id: "ir",
    nombre: "Par infrarrojo: emisor y receptor",
    texto:
      "El LED infrarrojo emite una luz invisible hacia el frente. El fotodiodo, de encapsulado oscuro, capta únicamente el rebote de esa luz cuando un objeto se acerca.",
    etiqueta: ["Par infrarrojo", "Emisor y fotodiodo de 5 mm"],
    vec: [70, -340, 0],
    base: [94, 32, 0],
    ancla: [94, 12, 0],
    zoom: 3.6,
  },
  {
    id: "barra",
    nombre: "Barra de 10 LEDs amarillos",
    texto:
      "Entrega la respuesta visual del sensor: los LEDs se encienden de forma secuencial a medida que el objeto se acerca y el voltaje sube.",
    etiqueta: ["Barra de 10 LEDs", "Indica la distancia"],
    vec: [0, -290, -30],
    base: [0, 26, -40],
    ancla: [0, 0, -40],
    zoom: 2.2,
  },
  {
    id: "rojo",
    nombre: "LED rojo (ON)",
    texto: "Se ilumina cuando la tecla de encendido está activada: indica que el dispositivo está operativo.",
    etiqueta: ["LED rojo", "Indicador de encendido"],
    vec: [-40, -240, 0],
    base: [-92, 28, -10],
    ancla: [-92, 12, -10],
    zoom: 4.0,
  },
  {
    id: "integrado",
    nombre: "Circuito integrado LM3914 y zócalo",
    texto:
      "Es el cerebro del indicador: mide el nivel de voltaje que recibe y decide cuántos LEDs de la barra debe encender. El zócalo de 18 pines protege al chip del calor al soldar.",
    etiqueta: ["LM3914", "Zócalo DIL de 18 pines"],
    vec: [0, -195, 0],
    base: [-5, 32, 0],
    ancla: [-5, 18, 0],
    zoom: 3.0,
  },
  {
    id: "transistor",
    nombre: "Transistor NPN BC337 y resistencias",
    texto:
      "El transistor amplifica la pequeña corriente del fotodiodo y la convierte en un voltaje apto para el integrado. Las resistencias limitan la corriente y calibran la sensibilidad.",
    etiqueta: ["Transistor y resistencias", "Amplifican y calibran"],
    vec: [40, -150, 40],
    base: [30, 36, 12],
    ancla: [30, 24, 12],
    zoom: 2.6,
  },
  {
    id: "alimentacion",
    nombre: "Borneras y diodo rectificador",
    texto:
      "Las borneras azules conectan la alimentación (9 V o 12 V) sin soldar los cables a la placa. El diodo protege al circuito si la batería se conecta al revés.",
    etiqueta: ["Borneras y diodo", "Alimentación protegida"],
    vec: [-40, -105, 40],
    base: [-68, 34, 24],
    ancla: [-68, 20, 24],
    zoom: 2.8,
  },
  {
    id: "placa",
    nombre: "Placa PCB de 5 × 10 cm",
    texto:
      "Sostiene y conecta todos los componentes mediante pistas de cobre. Se diseña, se transfiere con plancha, se graba en cloruro férrico y se perfora en el taller.",
    etiqueta: ["Placa PCB", "5 × 10 cm"],
    vec: [0, -60, 0],
    base: [0, 43, 0],
    ancla: [0, 36, 40],
    zoom: 1.7,
  },
  {
    id: "gabinete",
    nombre: "Gabinete contenedor",
    texto:
      "Caja impresa en 3D (o de madera o MDF) con las perforaciones alineadas para la barra de LEDs y las ventanas del par infrarrojo.",
    etiqueta: ["Gabinete", "Impreso en 3D"],
    vec: [0, 50, 0],
    base: [0, 30, 0],
    ancla: [0, 14, 69],
    zoom: 1.6,
  },
];

function ModeloSensor() {
  const g = (id) => SENSOR.find((p) => p.id === id);
  const leds = Array.from({ length: 10 }, (_, k) => -79.2 + k * 17.6);

  return (
    <>
      <Pieza id="gabinete" ancla={g("gabinete").ancla}>
        <Caja imp w={250} h={8} d={146} y={51} c="#26262b" />
        <Caja imp w={250} h={34} d={8} y={30} z={69} c="#26262b" />
        <Caja imp w={250} h={34} d={8} y={30} z={-69} c="#26262b" />
        <Caja imp w={8} h={34} d={130} x={-121} y={30} c="#26262b" />
        <Caja imp w={8} h={34} d={130} x={121} y={30} c="#26262b" />
      </Pieza>

      <Pieza id="placa" ancla={g("placa").ancla}>
        <Caja w={216} h={6} d={108} y={43} c="#1f8a4d" tex={CIRCUITO} />
        {[-100, 100].flatMap((x) =>
          [-46, 46].map((z) => <Caja key={`${x}${z}`} w={8} h={1} d={8} x={x} y={39.6} z={z} c="#0b3b22" />),
        )}
      </Pieza>

      <Pieza id="integrado" ancla={g("integrado").ancla}>
        <Caja w={70} h={8} d={26} x={-5} y={36} c="#1c1c1f" tex={PINES} />
        <Caja w={62} h={6} d={18} x={-5} y={29} c="#2a2a2e" eti="LM3914" />
        {[12, -12].map((z) => (
          <Caja key={z} w={56} h={3} d={3} x={-5} y={33} z={z} c="#c9ced4" />
        ))}
      </Pieza>

      <Pieza id="barra" ancla={g("barra").ancla}>
        <Caja w={176} h={8} d={10} y={36} z={-40} c="#1c1c1f" tex={PINES} />
        {leds.map((x) => (
          <Fragment key={x}>
            <Caja w={9} h={14} d={9} x={x} y={24} z={-40} c="#f5d90a" />
            <Caja w={7} h={4} d={7} x={x} y={14} z={-40} c="#ffe873" />
          </Fragment>
        ))}
      </Pieza>

      <Pieza id="rojo" ancla={g("rojo").ancla}>
        <Caja w={10} h={14} d={10} x={-92} y={32} z={-10} c="#e2321f" />
        <Caja w={8} h={4} d={8} x={-92} y={22} z={-10} c="#ff6a50" />
      </Pieza>

      <Pieza id="alimentacion" ancla={g("alimentacion").ancla}>
        <Caja w={28} h={14} d={20} x={-86} y={33} z={34} c="#1f5fd0" tex={TORNILLO} />
        <Caja w={28} h={14} d={20} x={-50} y={33} z={34} c="#1f5fd0" tex={TORNILLO} />
        <Caja w={16} h={5} d={5} x={-70} y={37.5} z={12} c="#1c1c1f" />
        <Caja w={3} h={5.4} d={5.4} x={-65} y={37.5} z={12} c="#d0d0d0" />
      </Pieza>

      <Pieza id="transistor" ancla={g("transistor").ancla}>
        <Caja w={14} h={10} d={12} x={50} y={35} z={24} c="#1c1c1f" />
        <Caja w={20} h={5} d={5} x={-8} y={37.5} z={36} c={RESISTENCIA} tex={BANDAS_H} />
        <Caja w={20} h={5} d={5} x={22} y={37.5} z={36} c={RESISTENCIA} tex={BANDAS_H} />
        <Caja w={20} h={5} d={5} x={-30} y={37.5} z={-27} c={RESISTENCIA} tex={BANDAS_H} />
        <Caja w={20} h={5} d={5} x={62} y={37.5} z={42} c={RESISTENCIA} tex={BANDAS_H} />
        <Caja w={5} h={5} d={20} x={72} y={37.5} z={-4} c={RESISTENCIA} tex={BANDAS_V} />
        <Caja w={5} h={5} d={20} x={82} y={37.5} z={-28} c={RESISTENCIA} tex={BANDAS_V} />
      </Pieza>

      <Pieza id="ir" ancla={g("ir").ancla}>
        <Caja w={9} h={12} d={9} x={94} y={34} z={-14} c="#e8f2f5" />
        <Caja w={7} h={4} d={7} x={94} y={26} z={-14} c="#f6fbfc" />
        <Caja w={9} h={12} d={9} x={94} y={34} z={14} c="#1a1a1d" />
        <Caja w={7} h={4} d={7} x={94} y={26} z={14} c="#2a2a2e" />
        {[-14, 14].map((z) => (
          <Caja key={z} w={2} h={6} d={2} x={94} y={39} z={z} c="#c9ced4" />
        ))}
      </Pieza>
    </>
  );
}

const CONFIG_SENSOR = {
  aria: "Sensor de proximidad en 3D: armado pieza por pieza",
  chip: "SENSOR EN 3D",
  piezas: SENSOR,
  Modelo: ModeloSensor,
  intro: {
    titulo: "Sensor de proximidad infrarrojo",
    texto:
      "Detecta la presencia de un objeto sin tocarlo y lo muestra en una barra de 10 LEDs. Bajá y lo desarmamos pieza por pieza.",
  },
  explosion: {
    titulo: "Vista explosionada",
    texto: "Todas las piezas separadas. Seguí bajando y el sensor se vuelve a armar.",
  },
  armado: {
    titulo: "Sensor armado",
    texto: "Placa, componentes y gabinete de nuevo en su lugar, listos para calibrar y probar.",
  },
  ayuda: "Seguí bajando con el scroll · o arrastrá el sensor para girarlo 360°",
  vista: [0, -75, 0],
  zoomVista: 1.6,
  eje: [0, 35, 0],
  zoomArmado: 1.5,
};

export function SensorScroll({ scroller = null }) {
  return <EscenaScroll config={CONFIG_SENSOR} scroller={scroller} />;
}

/* ============================================================
   1° año · Lámpara articulada
   ============================================================ */

const MADERA = "#d8a463";
const MADERA_CLARA = "#e3b878";

const LAMPARA = [
  {
    id: "cabezal",
    nombre: "Cabezal portalámparas",
    texto:
      "Se fabrica digitalmente por impresión 3D en material PLA. Aloja la placa con los diodos LED.",
    etiqueta: ["Cabezal", "Impreso en 3D · PLA"],
    vec: [90, -320, 0],
    base: [68, -180, 20],
    ancla: [68, -214, 20],
    zoom: 2.2,
  },
  {
    id: "placa",
    nombre: "Placa PCB de 50 × 50 con 8 LEDs",
    texto:
      "Circuito de baja tensión (5 V): 8 diodos LED de alta luminosidad, cada uno con su resistencia de 68 Ω para optimizar el consumo y la durabilidad.",
    etiqueta: ["Placa con 8 LEDs", "Resistencias de 68 Ω"],
    vec: [90, -230, 0],
    base: [68, -180, 52],
    ancla: [68, -212, 52],
    zoom: 2.6,
  },
  {
    id: "brazo",
    nombre: "Brazo articulado",
    texto:
      "Listón de pino de 20 × 20 mm. Se mueve libremente y conserva su posición gracias a la fricción de la unión.",
    etiqueta: ["Brazo", "Pino de 20 × 20 mm"],
    vec: [40, -170, 0],
    base: [3, -132, 20],
    ancla: [3, -150, 20],
    zoom: 1.7,
  },
  {
    id: "union",
    nombre: "Unión articulada",
    texto:
      "Un tornillo pasante con tuerca mariposa y arandelas de fricción regula la posición de los brazos y da estabilidad.",
    etiqueta: ["Tornillo y mariposa", "Arandelas de fricción"],
    vec: [-10, -120, 50],
    base: [-50, -95, 0],
    ancla: [-50, -112, 0],
    zoom: 3.2,
  },
  {
    id: "pilar",
    nombre: "Pilar de madera",
    texto: "Listón de pino de 20 × 20 mm: junto con la base forma la estructura principal de la lámpara.",
    etiqueta: ["Pilar", "Pino de 20 × 20 mm"],
    vec: [-10, -60, 0],
    base: [-50, -29, 0],
    ancla: [-50, -100, 0],
    zoom: 1.5,
  },
  {
    id: "electrica",
    nombre: "Mini switch y cable USB",
    texto:
      "El cable USB alimenta el circuito con 5 V y el mini switch deslizante lo enciende y lo apaga, mediante un conector macho de dos vías.",
    etiqueta: ["Switch y cable USB", "Alimentación de 5 V"],
    vec: [30, -25, 45],
    base: [70, 36, 0],
    ancla: [70, 24, 0],
    zoom: 2.2,
  },
  {
    id: "base",
    nombre: "Base de madera",
    texto:
      "Da apoyo y estabilidad a la lámpara. Se construye en el taller: trazado, corte, agujereado y lijado.",
    etiqueta: ["Base", "Madera"],
    vec: [0, 40, 0],
    base: [0, 48, 0],
    ancla: [0, 40, 50],
    zoom: 1.6,
  },
];

function ModeloLampara() {
  const g = (id) => LAMPARA.find((p) => p.id === id);
  /* Posiciones de los 8 LEDs: grilla de 3 × 3 sin el centro. */
  const posiciones = [-16, 0, 16].flatMap((x) => [-16, 0, 16].map((y) => [x, y])).filter(([x, y]) => x || y);
  const lateral = [-24, 24].flatMap((x) => [-21, -7, 7, 21].map((y) => [x, y]));

  return (
    <>
      <Pieza id="base" ancla={g("base").ancla}>
        <Caja w={210} h={14} d={130} y={48} c={MADERA} />
      </Pieza>

      <Pieza id="pilar" ancla={g("pilar").ancla}>
        <Caja w={20} h={140} d={20} x={-50} y={-29} c={MADERA_CLARA} />
      </Pieza>

      <Pieza id="union" ancla={g("union").ancla}>
        <Giro x={-50} y={-95} ry={90}>
          <Cil r={4} len={64} c="#b5bac0" lados={8} tapaC="#9aa1a9" />
          <Cil r={9} len={2} x={-14} c="#cfd3d8" lados={12} />
          <Cil r={9} len={2} x={14} c="#cfd3d8" lados={12} />
          <Cil r={8} len={4} x={-31} c="#9aa1a9" lados={10} />
          <Caja w={8} h={10} d={10} x={22} c="#c9ced4" />
          <Caja w={4} h={26} d={4} x={26} c="#c9ced4" />
        </Giro>
      </Pieza>

      <Pieza id="brazo" ancla={g("brazo").ancla}>
        <Giro x={-50} y={-95} z={20} rz={-35}>
          <Caja w={130} h={20} d={20} x={65} c={MADERA_CLARA} />
        </Giro>
      </Pieza>

      <Pieza id="cabezal" ancla={g("cabezal").ancla}>
        <Giro x={68} y={-180} z={20} rz={25}>
          <Caja imp w={66} h={52} d={66} c="#5e2a36" />
        </Giro>
      </Pieza>

      <Pieza id="placa" ancla={g("placa").ancla}>
        <Giro x={68} y={-180} z={20} rz={25}>
          <Caja w={56} h={56} d={4} z={36} c="#d49a3a" tex={CIRCUITO} />
          {posiciones.map(([x, y]) => (
            <Caja key={`${x},${y}`} w={8} h={8} d={9} x={x} y={y} z={42.5} c="#fff3b0" />
          ))}
          {lateral.map(([x, y]) => (
            <Caja key={`r${x},${y}`} w={3} h={9} d={3} x={x} y={y} z={39} c={RESISTENCIA} />
          ))}
        </Giro>
      </Pieza>

      <Pieza id="electrica" ancla={g("electrica").ancla}>
        <Caja w={16} h={8} d={10} x={40} y={37} z={30} c="#2a2a2e" />
        <Caja w={6} h={4} d={6} x={40} y={32} z={30} c="#f1f1f1" />
        <Caja w={12} h={6} d={6} x={40} y={38} z={-10} c="#1c1c1f" tex={PINES} />
        <Caja w={70} h={4} d={4} x={95} y={39} z={-30} c="#1c1c1f" />
        <Caja w={20} h={6} d={12} x={140} y={39} z={-30} c="#c4c9ce" />
      </Pieza>
    </>
  );
}

const CONFIG_LAMPARA = {
  aria: "Lámpara articulada en 3D: armado pieza por pieza",
  chip: "LÁMPARA EN 3D",
  piezas: LAMPARA,
  Modelo: ModeloLampara,
  intro: {
    titulo: "Lámpara articulada",
    texto:
      "Madera y piezas impresas en 3D, con un circuito de 8 LEDs que funciona a 5 V. Bajá y la desarmamos pieza por pieza.",
  },
  explosion: {
    titulo: "Vista explosionada",
    texto: "Todas las piezas separadas. Seguí bajando y la lámpara se vuelve a armar.",
  },
  armado: {
    titulo: "Lámpara armada",
    texto: "Base, pilar, brazo articulado y cabezal de nuevo en su lugar, listos para iluminar.",
  },
  ayuda: "Seguí bajando con el scroll · o arrastrá la lámpara para girarla 360°",
  vista: [10, -170, 0],
  zoomVista: 0.95,
  eje: [10, -95, 0],
  zoomArmado: 1.0,
};

export function LamparaScroll({ scroller = null }) {
  return <EscenaScroll config={CONFIG_LAMPARA} scroller={scroller} />;
}
