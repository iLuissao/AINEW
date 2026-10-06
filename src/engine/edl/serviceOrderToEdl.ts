import { ElectricalModel, ElectricalNode, ElectricalConnection } from './edlTypes';
import { EdlParser } from './edlParser';

export interface ServiceOrderInput {
  clientName?: string;
  projectName?: string;
  location?: string;
  rpu?: string;
  modulesBrand?: string;
  moduleModel?: string;
  modulePowerW?: number;
  totalModules?: number;
  modulesPerString?: number;
  numberOfStrings?: number;
  inverterManufacturer?: string;
  inverterModel?: string;
  inverterPowerKw?: number;
  acVoltageV?: number;
  phasesCount?: number;
  acBreakerRatingA?: number;
  mainBreakerRatingA?: number;
  dcRouteLengthM?: number;
  acRouteLengthM?: number;
  rawText?: string;
  hasBattery?: boolean;
  batteryCapacityKwh?: number;
  systemArchitecture?: 'string' | 'microinverter' | 'hybrid_storage';
}

/**
 * Semantic Engine: Transforms raw / structured Service Orders into formal EDL representation.
 */
export class ServiceOrderToEdl {
  public static compileFromOrder(input: ServiceOrderInput): { model: ElectricalModel; edlCode: string } {
    const clientName = input.clientName || 'ABARROTES CASCA';
    const projectName = input.projectName || 'Sistema Fotovoltaico Interconectado CFE';
    const location = input.location || 'A RODRIGUEZ LEYVA MZ1 LT5 AMPLIACION SANTO TOMAS, EDO. MEX.';
    const rpu = input.rpu || '148231100137';

    const modulePower = input.modulePowerW || 650;
    const totalModules = input.totalModules || 18;
    const numStrings = input.numberOfStrings || (totalModules > 12 ? 2 : 1);
    const modulesPerStr = input.modulesPerString || Math.ceil(totalModules / numStrings);
    const moduleBrand = input.modulesBrand || 'LONGI';
    const moduleModel = input.moduleModel || 'Hi-MO X6 LR7-72HVHF 650M';

    const invMfg = input.inverterManufacturer || 'Growatt';
    const invModel = input.inverterModel || (totalModules >= 18 ? 'MIN 11400TL-XH-US' : 'MIN 5000TL-X');
    const invPowerKw = input.inverterPowerKw || (totalModules >= 18 ? 11.4 : 5.0);
    const acVoltage = input.acVoltageV || 220;
    const phases = input.phasesCount || (acVoltage === 220 ? 2 : 3);

    // Protections calculation
    const stringIsc = 15.29;
    const dcFuseRating = Math.ceil(stringIsc * 1.56); // 20A or 25A
    const acCurrentA = (invPowerKw * 1000) / (acVoltage * (phases === 3 ? 1.732 : 1));
    const acBreakerRating = input.acBreakerRatingA || (totalModules >= 18 ? 60 : 30);
    const mainBreakerRating = input.mainBreakerRatingA || Math.max(100, Math.ceil(acBreakerRating * 1.5));

    const dcLength = input.dcRouteLengthM || 25;
    const acLength = input.acRouteLengthM || 3;

    const model: ElectricalModel = {
      systemId: 'PV_SYS_' + clientName.replace(/[^A-Za-z0-9]/g, '_').toUpperCase(),
      systemName: projectName,
      systemType: input.hasBattery ? 'HYBRID_STORAGE' : 'GRID_TIED',
      standard: 'NOM-001-SEDE-2012',
      metadata: {
        clientName,
        projectAddress: location,
        rpu,
        drafter: 'Ing. Proyectista Certificado',
        engineer: 'Ing. David Marroquín García',
        date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
      },
      nodes: {},
      connections: [],
    };

    // LEVEL 0: GENERATION (Strings)
    for (let s = 1; s <= numStrings; s++) {
      const strId = `STR0${s}`;
      const strPower = modulesPerStr * modulePower;
      const strVoc = modulesPerStr * 53.9;

      model.nodes[strId] = {
        id: strId,
        type: 'PV_STRING',
        name: `Cadena Fotovoltaica ${s} (${modulesPerStr}x ${modulePower}W)`,
        manufacturer: moduleBrand,
        model: moduleModel,
        powerW: strPower,
        voltageV: strVoc,
        currentA: stringIsc,
        domain: 'DC',
        level: 0,
        subComponentsCount: modulesPerStr,
        ports: EdlParser.generateDefaultPortsForType('PV_STRING', strId),
        notes: `Generador ${s}: G${(s - 1) * modulesPerStr + 1} a G${s * modulesPerStr}`,
      };

      // LEVEL 1: DC PROTECTION (Fuse per string)
      const fuseId = `FUSE0${s}`;
      model.nodes[fuseId] = {
        id: fuseId,
        type: 'FUSE',
        name: `Fusible gPV ${dcFuseRating}A (String ${s})`,
        manufacturer: 'Bussmann / Littelfuse',
        model: '10x38 1000V DC',
        currentA: dcFuseRating,
        voltageV: 1000,
        domain: 'DC',
        level: 1,
        ports: EdlParser.generateDefaultPortsForType('FUSE', fuseId),
      };

      // Connect String to Fuse
      model.connections.push({
        id: `CONN_${strId}_${fuseId}`,
        fromNodeId: strId,
        fromPortId: 'DC+',
        toNodeId: fuseId,
        toPortId: 'IN',
        domain: 'DC',
        conductor: {
          system: 'DC',
          conductorsCount: 2,
          gauge: '10 AWG (1x6mm²)',
          material: 'Cu',
          insulation: 'PV-Wire 1.5kV',
          lengthM: 2,
          conduitTradeSize: '25mm (1")',
          conduitType: 'PG',
          voltageDropPercent: 0.04,
          circuitTag: 1,
        },
      });
    }

    // LEVEL 1: DC DISCONNECT SWITCH
    const dcDiscId = 'DISC_DC01';
    model.nodes[dcDiscId] = {
      id: dcDiscId,
      type: 'DC_DISCONNECT',
      name: 'Desconectador Rotativo DC 3P 32A@1000V',
      manufacturer: 'Socom / Kraus&Naimer',
      model: 'Rotary Switch 1000V',
      poles: 3,
      currentA: 32,
      voltageV: 1000,
      domain: 'DC',
      level: 1,
      ports: EdlParser.generateDefaultPortsForType('DC_DISCONNECT', dcDiscId),
      notes: 'NOM Art. 690-13 / 690-15',
    };

    // Connect Fuses to DC Disconnect
    for (let s = 1; s <= numStrings; s++) {
      model.connections.push({
        id: `CONN_FUSE0${s}_DISC`,
        fromNodeId: `FUSE0${s}`,
        fromPortId: 'OUT',
        toNodeId: dcDiscId,
        toPortId: 'IN',
        domain: 'DC',
      });
    }

    // LEVEL 2: INVERTER
    const invId = 'INV01';
    model.nodes[invId] = {
      id: invId,
      type: 'INVERTER',
      name: `Inversor Interconectado ${invPowerKw}kW`,
      manufacturer: invMfg,
      model: invModel,
      powerW: invPowerKw * 1000,
      voltageV: acVoltage,
      currentA: parseFloat(acCurrentA.toFixed(1)),
      phasesCount: phases,
      domain: 'HYBRID',
      level: 2,
      ports: EdlParser.generateDefaultPortsForType('INVERTER', invId),
      notes: 'Inversor Centralizado DC/AC con MPPT',
    };

    // Connect DC Disconnect to Inverter
    model.connections.push({
      id: `CONN_DISC_INV`,
      fromNodeId: dcDiscId,
      fromPortId: 'OUT',
      toNodeId: invId,
      toPortId: 'DC+',
      domain: 'DC',
      conductor: {
        system: 'DC',
        conductorsCount: 2,
        gauge: '10 AWG (1x6mm²)',
        material: 'Cu',
        insulation: 'PV-Wire 1.5kV',
        lengthM: dcLength,
        conduitTradeSize: '25mm (1")',
        conduitType: 'PG',
        voltageDropPercent: 0.65,
        circuitTag: 2,
      },
    });

    // Optional Battery if requested
    if (input.hasBattery) {
      const batId = 'BAT01';
      model.nodes[batId] = {
        id: batId,
        type: 'BATTERY',
        name: `Batería LiFePO4 ${input.batteryCapacityKwh || 10}kWh`,
        manufacturer: 'Growatt / BYD',
        model: 'ARK-2.5H / LFP High Voltage',
        powerW: (input.batteryCapacityKwh || 10) * 1000,
        voltageV: 400,
        domain: 'DC',
        level: 2,
        ports: EdlParser.generateDefaultPortsForType('BATTERY', batId),
      };
      model.connections.push({
        id: `CONN_BAT_INV`,
        fromNodeId: batId,
        fromPortId: 'DC+',
        toNodeId: invId,
        toPortId: 'DC+',
        domain: 'DC',
      });
    }

    // LEVEL 3: AC BREAKER (PV Protection)
    const acBrkId = 'BRK_AC01';
    model.nodes[acBrkId] = {
      id: acBrkId,
      type: 'AC_BREAKER',
      name: `Interruptor Termomagnético ${phases}x${acBreakerRating}A`,
      manufacturer: 'Square D / Schneider Electric',
      model: `QO${phases}${acBreakerRating}`,
      poles: phases,
      currentA: acBreakerRating,
      voltageV: acVoltage,
      domain: 'AC',
      level: 3,
      ports: EdlParser.generateDefaultPortsForType('AC_BREAKER', acBrkId),
      notes: 'Protección contra sobrecorriente inversor FV',
    };

    // Connect Inverter to AC Breaker
    model.connections.push({
      id: `CONN_INV_BRK`,
      fromNodeId: invId,
      fromPortId: 'OUT',
      toNodeId: acBrkId,
      toPortId: 'IN',
      domain: 'AC',
      conductor: {
        system: 'AC',
        conductorsCount: phases + 1,
        gauge: acBreakerRating > 40 ? '6 AWG' : '8 AWG',
        material: 'Cu',
        insulation: 'THHW-LS 90°C',
        lengthM: acLength,
        conduitTradeSize: '25mm (1")',
        conduitType: 'PG',
        voltageDropPercent: 0.22,
        circuitTag: 3,
      },
    });

    // LEVEL 4: POINT OF INTERCONNECTION
    const interId = 'INTERCONN01';
    model.nodes[interId] = {
      id: interId,
      type: 'INTERCONNECTION_POINT',
      name: 'Punto de Interconexión Eléctrica',
      domain: 'AC',
      voltageV: acVoltage,
      level: 4,
      ports: EdlParser.generateDefaultPortsForType('INTERCONNECTION_POINT', interId),
    };

    model.connections.push({
      id: `CONN_BRK_INTER`,
      fromNodeId: acBrkId,
      fromPortId: 'OUT',
      toNodeId: interId,
      toPortId: 'IN',
      domain: 'AC',
      conductor: {
        system: 'AC',
        conductorsCount: phases + 1,
        gauge: acBreakerRating > 40 ? '6 AWG' : '8 AWG',
        material: 'Cu',
        insulation: 'THHW-LS 90°C',
        lengthM: 1,
        conduitTradeSize: '25mm (1")',
        conduitType: 'PG',
        voltageDropPercent: 0.05,
        circuitTag: 4,
      },
    });

    // LEVEL 5: LOAD (Carga del domicilio)
    const loadId = 'LOAD01';
    model.nodes[loadId] = {
      id: loadId,
      type: 'LOAD',
      name: 'Carga del Domicilio (Tablero de Distribución)',
      domain: 'AC',
      voltageV: acVoltage,
      level: 5,
      ports: EdlParser.generateDefaultPortsForType('LOAD', loadId),
    };

    model.connections.push({
      id: `CONN_INTER_LOAD`,
      fromNodeId: interId,
      fromPortId: 'OUT_LOAD',
      toNodeId: loadId,
      toPortId: 'IN',
      domain: 'AC',
    });

    // LEVEL 3 (General): MAIN SERVICE BREAKER
    const mainBrkId = 'BRK_MAIN01';
    model.nodes[mainBrkId] = {
      id: mainBrkId,
      type: 'MAIN_BREAKER',
      name: `Interruptor General 3x${mainBreakerRating}A`,
      manufacturer: 'Square D',
      poles: 3,
      currentA: mainBreakerRating,
      voltageV: acVoltage,
      domain: 'AC',
      level: 3,
      ports: EdlParser.generateDefaultPortsForType('MAIN_BREAKER', mainBrkId),
    };

    model.connections.push({
      id: `CONN_INTER_MAINBRK`,
      fromNodeId: interId,
      fromPortId: 'OUT_GRID',
      toNodeId: mainBrkId,
      toPortId: 'IN',
      domain: 'AC',
    });

    // LEVEL 6: METER (Wattorímetro CFE)
    const meterId = 'METER01';
    model.nodes[meterId] = {
      id: meterId,
      type: 'METER',
      name: 'Medidor Wattorímetro Bidireccional CFE',
      manufacturer: 'CFE Calibrado',
      domain: 'AC',
      voltageV: acVoltage,
      level: 6,
      ports: EdlParser.generateDefaultPortsForType('METER', meterId),
      notes: 'Medición neta 4 cuadrantes',
    };

    model.connections.push({
      id: `CONN_MAINBRK_METER`,
      fromNodeId: mainBrkId,
      fromPortId: 'OUT',
      toNodeId: meterId,
      toPortId: 'IN',
      domain: 'AC',
    });

    // LEVEL 7: GRID (Red CFE)
    const gridId = 'GRID_CFE';
    model.nodes[gridId] = {
      id: gridId,
      type: 'GRID',
      name: 'Red Eléctrica de Distribución CFE',
      voltageV: acVoltage,
      domain: 'AC',
      level: 7,
      ports: EdlParser.generateDefaultPortsForType('GRID', gridId),
      notes: `Acometida Aérea ${phases === 3 ? 'Trifásica' : 'Bifásica'} 60Hz`,
    };

    model.connections.push({
      id: `CONN_METER_GRID`,
      fromNodeId: meterId,
      fromPortId: 'OUT',
      toNodeId: gridId,
      toPortId: 'IN',
      domain: 'AC',
    });

    const edlCode = EdlParser.serialize(model);
    return { model, edlCode };
  }
}
