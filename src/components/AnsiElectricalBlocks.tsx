import React from 'react';

/**
 * ANSI / IEEE Standard Electrical CAD Blocks & Symbols
 * Conforms to IEEE Std 315 / ANSI Y32.2 (Graphic Symbols for Electrical and Electronics Diagrams)
 * and Mexican CFE / UVIE NOM-001-SEDE single-line schematic standards.
 */

export interface BlockMetadata {
  id: string;
  name: string;
  standard: string;
  description: string;
  category: 'generation' | 'protection' | 'conversion' | 'metering' | 'grounding' | 'enclosure';
}

export const ANSI_BLOCKS_CATALOG: BlockMetadata[] = [
  {
    id: 'ansi-pv-module',
    name: 'Módulo Fotovoltaico (Generador Solar)',
    standard: 'IEEE 315 / IEC 60617',
    description: 'Bloque unitario con polaridad DC, marco metálico y borne de puesta a tierra.',
    category: 'generation',
  },
  {
    id: 'ansi-inverter',
    name: 'Inversor DC/AC (Convertidor Estático)',
    standard: 'IEEE 315 Clause 9.5 / ANSI Y32.2',
    description: 'Símbolo de bloque dividido diagonalmente con entradas DC y salida AC senoidal.',
    category: 'conversion',
  },
  {
    id: 'ansi-breaker',
    name: 'Interruptor Termomagnético (Disyuntor)',
    standard: 'IEEE 315 Clause 13.5 (Circuit Breaker)',
    description: 'Contactos mecánicos con disparador térmico y magnético de sobrecorriente.',
    category: 'protection',
  },
  {
    id: 'ansi-fuse',
    name: 'Fusible DC / Cartucho GPV',
    standard: 'IEEE 315 Clause 13.1 (Fuse)',
    description: 'Elemento fusible limitador de corriente para protección de cadenas en cajas combinadoras.',
    category: 'protection',
  },
  {
    id: 'ansi-rotary-switch',
    name: 'Desconectador de Perilla / Seccionador DC',
    standard: 'IEEE 315 Clause 13.3 (Disconnect Switch)',
    description: 'Medio de desconexión bajo carga con accionamiento rotativo y bloqueo LOTO.',
    category: 'protection',
  },
  {
    id: 'ansi-meter',
    name: 'Medidor Wattorímetro Bidireccional',
    standard: 'IEEE 315 Clause 10.4 (Integrating Meter)',
    description: 'Contador de energía activa y reactiva de 4 cuadrantes para interconexión a la red.',
    category: 'metering',
  },
  {
    id: 'ansi-ground',
    name: 'Puesta a Tierra (Electrodo / SPT)',
    standard: 'IEEE 315 Clause 3.9 / NOM-001 Art. 250',
    description: 'Símbolo de tierra física para carcasas, marcos de paneles y electrodo Cooperweld.',
    category: 'grounding',
  },
  {
    id: 'ansi-cfe-grid',
    name: 'Red de Distribución Eléctrica CFE',
    standard: 'IEEE 315 Clause 2.1 (AC Source)',
    description: 'Fuente de corriente alterna de suministro público con tensión nominal y frecuencia 60Hz.',
    category: 'generation',
  },
];

// 1. Símbolo de Puesta a Tierra (Ground) ANSI/IEEE
export const SvgGroundSymbol: React.FC<{ x: number; y: number; color?: string; scale?: number }> = ({
  x,
  y,
  color = '#16a34a',
  scale = 1,
}) => (
  <g transform={`translate(${x}, ${y}) scale(${scale})`}>
    <line x1={0} y1={0} x2={0} y2={10} stroke={color} strokeWidth={2} />
    <line x1={-10} y1={10} x2={10} y2={10} stroke={color} strokeWidth={2.5} />
    <line x1={-6} y1={14} x2={6} y2={14} stroke={color} strokeWidth={2} />
    <line x1={-2} y1={18} x2={2} y2={18} stroke={color} strokeWidth={1.5} />
  </g>
);

// 2. Símbolo de Fusible ANSI/IEEE
export const SvgFuseSymbol: React.FC<{
  x: number;
  y: number;
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  scale?: number;
}> = ({ x, y, label, orientation = 'horizontal', scale = 1 }) => {
  const isHoriz = orientation === 'horizontal';
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {isHoriz ? (
        <>
          <line x1={-25} y1={0} x2={-14} y2={0} stroke="#0f172a" strokeWidth={1.8} />
          <rect x={-14} y={-5} width={28} height={10} fill="#ffffff" stroke="#0f172a" strokeWidth={1.8} />
          <line x1={-14} y1={0} x2={14} y2={0} stroke="#0f172a" strokeWidth={1.2} />
          <line x1={14} y1={0} x2={25} y2={0} stroke="#0f172a" strokeWidth={1.8} />
        </>
      ) : (
        <>
          <line x1={0} y1={-25} x2={0} y2={-14} stroke="#0f172a" strokeWidth={1.8} />
          <rect x={-5} y={-14} width={10} height={28} fill="#ffffff" stroke="#0f172a" strokeWidth={1.8} />
          <line x1={0} y1={-14} x2={0} y2={14} stroke="#0f172a" strokeWidth={1.2} />
          <line x1={0} y1={14} x2={0} y2={25} stroke="#0f172a" strokeWidth={1.8} />
        </>
      )}
      {label && (
        <text
          x={0}
          y={isHoriz ? -9 : 0}
          dx={isHoriz ? 0 : 12}
          textAnchor={isHoriz ? 'middle' : 'start'}
          className="text-[9px] fill-slate-800 font-mono font-medium select-none"
        >
          {label}
        </text>
      )}
    </g>
  );
};

// 3. Símbolo de Interruptor Termomagnético (Circuit Breaker) ANSI/IEEE
export const SvgBreakerSymbol: React.FC<{
  x: number;
  y: number;
  poles?: number;
  ratingLabel?: string;
  scale?: number;
}> = ({ x, y, poles = 2, ratingLabel, scale = 1 }) => {
  const poleSpacing = 16;
  const height = (poles - 1) * poleSpacing + 28;
  const startY = -height / 2 + 14;

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Marco contenedor */}
      <rect
        x={-22}
        y={-height / 2}
        width={44}
        height={height}
        fill="#ffffff"
        stroke="#0f172a"
        strokeWidth={1.5}
        strokeDasharray="3 2"
      />

      {/* Polos individuales */}
      {Array.from({ length: poles }).map((_, i) => {
        const py = startY + i * poleSpacing;
        return (
          <g key={i}>
            {/* Terminal izquierda */}
            <line x1={-30} y1={py} x2={-16} y2={py} stroke="#0f172a" strokeWidth={1.8} />
            {/* Contacto interruptor con disparo térmico/magnético */}
            <circle cx={-12} cy={py} r={2} fill="#0f172a" />
            <line x1={-12} y1={py} x2={4} y2={py - 6} stroke="#0f172a" strokeWidth={1.8} />
            <path
              d={`M 4 ${py - 6} Q 8 ${py - 10} 12 ${py - 6}`}
              fill="none"
              stroke="#0f172a"
              strokeWidth={1.5}
            />
            <circle cx={12} cy={py} r={2} fill="#0f172a" />
            {/* Terminal derecha */}
            <line x1={12} y1={py} x2={30} y2={py} stroke="#0f172a" strokeWidth={1.8} />
          </g>
        );
      })}

      {/* Barra de acoplamiento mecánico si son 2 o más polos */}
      {poles > 1 && (
        <line
          x1={-3}
          y1={startY - 3}
          x2={-3}
          y2={startY + (poles - 1) * poleSpacing - 3}
          stroke="#0f172a"
          strokeWidth={1.2}
          strokeDasharray="2 2"
        />
      )}

      {ratingLabel && (
        <text
          x={0}
          y={-height / 2 - 6}
          textAnchor="middle"
          className="text-[10px] fill-slate-900 font-sans font-bold select-none"
        >
          {ratingLabel}
        </text>
      )}
    </g>
  );
};

// 4. Símbolo de Inversor DC/AC ANSI/IEEE (Split Square)
export const SvgInverterSymbol: React.FC<{
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  manufacturerModel?: string;
  scale?: number;
}> = ({ x, y, width = 64, height = 74, label = 'I1', manufacturerModel, scale = 1 }) => {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Cuerpo principal del inversor */}
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill="#ffffff"
        stroke="#0f172a"
        strokeWidth={2}
      />
      {/* Línea diagonal divisoria ANSI */}
      <line
        x1={-width / 2}
        y1={height / 2}
        x2={width / 2}
        y2={-height / 2}
        stroke="#0f172a"
        strokeWidth={1.8}
      />

      {/* Símbolo DC (Lado superior izquierdo) */}
      <g transform="translate(-16, -16)">
        <line x1={-8} y1={-3} x2={8} y2={-3} stroke="#0f172a" strokeWidth={2} />
        <line x1={-8} y1={3} x2={8} y2={3} stroke="#0f172a" strokeWidth={1.5} strokeDasharray="3 2" />
      </g>

      {/* Símbolo AC Senoidal (Lado inferior derecho) */}
      <g transform="translate(16, 16)">
        <path
          d="M -10 0 Q -5 -8 0 0 T 10 0"
          fill="none"
          stroke="#0f172a"
          strokeWidth={2}
        />
      </g>

      {/* Identificador de equipo */}
      {label && (
        <text
          x={0}
          y={-height / 2 - 6}
          textAnchor="middle"
          className="text-[11px] fill-slate-900 font-sans font-extrabold select-none"
        >
          {label}
        </text>
      )}

      {/* Descripción del fabricante / modelo */}
      {manufacturerModel && (
        <text
          x={-width / 2 - 6}
          y={-12}
          textAnchor="end"
          className="text-[9px] fill-slate-800 font-sans font-medium select-none"
        >
          <tspan x={-width / 2 - 6} dy="0">Inversor de corriente</tspan>
          <tspan x={-width / 2 - 6} dy="11" fontWeight="bold">{manufacturerModel}</tspan>
        </text>
      )}
    </g>
  );
};

// 5. Símbolo de Desconectador de Perilla / Interruptor Rotativo ANSI
export const SvgRotaryDisconnectSymbol: React.FC<{
  x: number;
  y: number;
  size?: number;
  label?: string;
  scale?: number;
}> = ({ x, y, size = 32, label, scale = 1 }) => (
  <g transform={`translate(${x}, ${y}) scale(${scale})`}>
    <rect
      x={-size / 2}
      y={-size / 2}
      width={size}
      height={size}
      fill="#ffffff"
      stroke="#0f172a"
      strokeWidth={1.8}
    />
    <circle cx={0} cy={0} r={size / 2 - 5} fill="#ffffff" stroke="#0f172a" strokeWidth={1.8} />
    <circle cx={0} cy={0} r={3} fill="#0f172a" />
    <line x1={0} y1={-8} x2={0} y2={8} stroke="#0f172a" strokeWidth={2} />
    {label && (
      <text
        x={size / 2 + 6}
        y={3}
        textAnchor="start"
        className="text-[8.5px] fill-slate-800 font-sans select-none"
      >
        {label}
      </text>
    )}
  </g>
);

// 6. Símbolo de Medidor Wattorímetro Bidireccional kWh ANSI
export const SvgKwhMeterSymbol: React.FC<{
  x: number;
  y: number;
  label?: string;
  scale?: number;
}> = ({ x, y, label = 'kWh', scale = 1 }) => (
  <g transform={`translate(${x}, ${y}) scale(${scale})`}>
    <rect
      x={-28}
      y={-22}
      width={56}
      height={44}
      fill="#ffffff"
      stroke="#0f172a"
      strokeWidth={1.8}
    />
    <text
      x={0}
      y={4}
      textAnchor="middle"
      className="text-[12px] fill-slate-900 font-mono font-bold tracking-tight select-none"
    >
      {label}
    </text>
  </g>
);

// 7. Símbolo de Red CFE (Suministro Eléctrico) ANSI
export const SvgCfeGridSymbol: React.FC<{
  x: number;
  y: number;
  radius?: number;
  scale?: number;
}> = ({ x, y, radius = 22, scale = 1 }) => (
  <g transform={`translate(${x}, ${y}) scale(${scale})`}>
    <circle cx={0} cy={0} r={radius} fill="#ffffff" stroke="#0f172a" strokeWidth={2} />
    <path
      d="M -11 3 Q -5.5 -6 0 3 T 11 3"
      fill="none"
      stroke="#0f172a"
      strokeWidth={2}
    />
    <text
      x={0}
      y={-radius - 5}
      textAnchor="middle"
      className="text-[11px] fill-slate-900 font-sans font-bold select-none"
    >
      CFE
    </text>
  </g>
);

// 8. Bloque Unitario de Módulo Solar Fotovoltaico (G1...Gn)
export const SvgPvModuleBlock: React.FC<{
  x: number;
  y: number;
  width?: number;
  height?: number;
  generatorId: string;
  modelName: string;
  powerW: number;
  scale?: number;
}> = ({
  x,
  y,
  width = 54,
  height = 68,
  generatorId,
  modelName,
  powerW,
  scale = 1,
}) => (
  <g transform={`translate(${x}, ${y}) scale(${scale})`}>
    {/* Marco del panel */}
    <rect
      x={-width / 2}
      y={-height / 2}
      width={width}
      height={height}
      fill="#ffffff"
      stroke="#0f172a"
      strokeWidth={1.5}
    />
    {/* Identificador G1..Gn */}
    <text
      x={0}
      y={-height / 2 + 14}
      textAnchor="middle"
      className="text-[10px] fill-slate-900 font-sans font-bold select-none"
    >
      {generatorId}
    </text>
    {/* Línea divisoria interior */}
    <line
      x1={-width / 2 + 4}
      y1={-height / 2 + 20}
      x2={width / 2 - 4}
      y2={-height / 2 + 20}
      stroke="#cbd5e1"
      strokeWidth={1}
    />
    {/* Modelo del panel */}
    <text
      x={0}
      y={-height / 2 + 31}
      textAnchor="middle"
      className="text-[8px] fill-slate-700 font-sans select-none"
    >
      {modelName.slice(0, 10)}
    </text>
    <text
      x={0}
      y={-height / 2 + 42}
      textAnchor="middle"
      className="text-[8px] fill-slate-700 font-sans select-none"
    >
      {modelName.slice(10, 20)}
    </text>
    {/* Potencia W */}
    <text
      x={0}
      y={-height / 2 + 58}
      textAnchor="middle"
      className="text-[9px] fill-slate-900 font-sans font-extrabold select-none"
    >
      {powerW}W
    </text>
  </g>
);

// 9. Callout / Marcador de Circuito (1), (2), (3)...
export const SvgCircuitTag: React.FC<{
  x: number;
  y: number;
  tagNumber: number | string;
  scale?: number;
}> = ({ x, y, tagNumber, scale = 1 }) => (
  <g transform={`translate(${x}, ${y}) scale(${scale})`}>
    <text
      x={0}
      y={0}
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[10px] fill-slate-900 font-sans font-bold select-none"
    >
      ({tagNumber})
    </text>
  </g>
);
