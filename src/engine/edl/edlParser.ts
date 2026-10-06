import {
  ElectricalModel,
  ElectricalNode,
  ElectricalConnection,
  ElectricalElementType,
  DomainType,
  ElectricalPort,
} from './edlTypes';

/**
 * EDL (Electrical Diagram Language) Parser & Serializer
 * Human-readable DSL for defining single-line electrical systems deterministically.
 */

export class EdlParser {
  /**
   * Serialize an ElectricalModel into clean EDL DSL source code.
   */
  public static serialize(model: ElectricalModel): string {
    const lines: string[] = [];

    lines.push(`// ========================================================`);
    lines.push(`// EDL (Electrical Diagram Language) Specification`);
    lines.push(`// System: ${model.systemName} (${model.systemType})`);
    lines.push(`// Standard: ${model.standard}`);
    lines.push(`// ========================================================`);
    lines.push(``);
    lines.push(`SYSTEM ${model.systemId || 'PV_SYSTEM'} {`);
    lines.push(`    NAME "${model.systemName}";`);
    lines.push(`    TYPE ${model.systemType};`);
    lines.push(`    STANDARD "${model.standard}";`);

    if (model.metadata.clientName) {
      lines.push(`    CLIENT "${model.metadata.clientName}";`);
    }
    if (model.metadata.projectAddress) {
      lines.push(`    ADDRESS "${model.metadata.projectAddress}";`);
    }
    if (model.metadata.rpu) {
      lines.push(`    RPU "${model.metadata.rpu}";`);
    }
    lines.push(``);

    // Group nodes by level / type
    const sortedNodes = Object.values(model.nodes).sort((a, b) => a.level - b.level);

    for (const node of sortedNodes) {
      lines.push(`    ${node.type} ${node.id} {`);
      lines.push(`        NAME "${node.name}";`);
      if (node.manufacturer) lines.push(`        MANUFACTURER "${node.manufacturer}";`);
      if (node.model) lines.push(`        MODEL "${node.model}";`);
      if (node.powerW !== undefined) lines.push(`        POWER ${node.powerW}W;`);
      if (node.voltageV !== undefined) lines.push(`        VOLTAGE ${node.voltageV}V;`);
      if (node.currentA !== undefined) lines.push(`        CURRENT ${node.currentA}A;`);
      if (node.poles !== undefined) lines.push(`        POLES ${node.poles};`);
      if (node.phasesCount !== undefined) lines.push(`        PHASES ${node.phasesCount};`);
      if (node.subComponentsCount !== undefined) lines.push(`        UNITS_COUNT ${node.subComponentsCount};`);
      if (node.notes) lines.push(`        NOTES "${node.notes}";`);

      // Custom parameters if present
      if (node.customParams) {
        for (const [k, v] of Object.entries(node.customParams)) {
          if (typeof v === 'string') lines.push(`        ${k.toUpperCase()} "${v}";`);
          else if (typeof v === 'number' || typeof v === 'boolean') lines.push(`        ${k.toUpperCase()} ${v};`);
        }
      }

      lines.push(`    }`);
      lines.push(``);
    }

    lines.push(`    // ================= CONNECTIONS =================`);
    for (const conn of model.connections) {
      let condStr = '';
      if (conn.conductor) {
        const c = conn.conductor;
        const attrs: string[] = [];
        if (c.conductorsCount) attrs.push(`CONDUCTORS=${c.conductorsCount}`);
        if (c.gauge) attrs.push(`GAUGE="${c.gauge}"`);
        if (c.insulation) attrs.push(`INSULATION="${c.insulation}"`);
        if (c.lengthM) attrs.push(`LENGTH=${c.lengthM}m`);
        if (c.conduitTradeSize) attrs.push(`CONDUIT="${c.conduitTradeSize}"`);
        if (c.circuitTag) attrs.push(`TAG="(${c.circuitTag})"`);
        if (attrs.length > 0) {
          condStr = ` [${attrs.join(', ')}]`;
        }
      }

      lines.push(`    CONNECT ${conn.fromNodeId}.${conn.fromPortId} -> ${conn.toNodeId}.${conn.toPortId}${condStr};`);
    }

    lines.push(`}`);
    return lines.join('\n');
  }

  /**
   * Parse EDL DSL source code into a structured ElectricalModel.
   */
  public static parse(sourceCode: string): ElectricalModel {
    const lines = sourceCode
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('//'));

    const model: ElectricalModel = {
      systemId: 'PV_SYSTEM',
      systemName: 'Sistema Fotovoltaico Paramétrico',
      systemType: 'GRID_TIED',
      standard: 'NOM-001-SEDE-2012',
      metadata: {
        clientName: '',
        projectAddress: '',
        rpu: '',
        date: new Date().toLocaleDateString('es-MX'),
      },
      nodes: {},
      connections: [],
    };

    let currentNode: ElectricalNode | null = null;

    for (const rawLine of lines) {
      const line = rawLine.replace(/;$/, '').trim();

      // System header
      const sysMatch = line.match(/^SYSTEM\s+([A-Za-z0-9_-]+)/i);
      if (sysMatch) {
        model.systemId = sysMatch[1];
        continue;
      }

      // Root attributes
      const nameMatch = line.match(/^NAME\s+"([^"]+)"/i);
      if (nameMatch && !currentNode) {
        model.systemName = nameMatch[1];
        continue;
      }
      const typeMatch = line.match(/^TYPE\s+([A-Za-z0-9_-]+)/i);
      if (typeMatch && !currentNode) {
        model.systemType = typeMatch[1] as any;
        continue;
      }
      const clientMatch = line.match(/^CLIENT\s+"([^"]+)"/i);
      if (clientMatch && !currentNode) {
        model.metadata.clientName = clientMatch[1];
        continue;
      }
      const addrMatch = line.match(/^ADDRESS\s+"([^"]+)"/i);
      if (addrMatch && !currentNode) {
        model.metadata.projectAddress = addrMatch[1];
        continue;
      }
      const rpuMatch = line.match(/^RPU\s+"([^"]+)"/i);
      if (rpuMatch && !currentNode) {
        model.metadata.rpu = rpuMatch[1];
        continue;
      }

      // Node start
      const nodeStartMatch = line.match(
        /^(PV_MODULE|PV_STRING|PV_ARRAY|FUSE|DC_DISCONNECT|SPD_DC|SPD_AC|INVERTER|MICROINVERTER|AC_COMBINER|AC_BREAKER|MAIN_BREAKER|DISCONNECT|METER|GRID|LOAD|PANEL|TRANSFORMER|GENERATOR|BATTERY|CHARGE_CONTROLLER|EV_CHARGER|GROUND|GROUND_BAR|GROUND_ELECTRODE|INTERCONNECTION_POINT|CABINET)\s+([A-Za-z0-9_-]+)\s*\{?/i
      );

      if (nodeStartMatch) {
        const type = nodeStartMatch[1].toUpperCase() as ElectricalElementType;
        const id = nodeStartMatch[2];
        const level = EdlParser.getDefaultLevelForType(type);
        const domain = EdlParser.getDefaultDomainForType(type);

        currentNode = {
          id,
          type,
          name: id,
          domain,
          level,
          ports: EdlParser.generateDefaultPortsForType(type, id),
          customParams: {},
        };
        continue;
      }

      // Inside a node block
      if (currentNode) {
        if (line.includes('}')) {
          model.nodes[currentNode.id] = currentNode;
          currentNode = null;
          continue;
        }

        const nodeNameMatch = line.match(/^NAME\s+"([^"]+)"/i);
        if (nodeNameMatch) {
          currentNode.name = nodeNameMatch[1];
          continue;
        }

        const mfgMatch = line.match(/^MANUFACTURER\s+"([^"]+)"/i);
        if (mfgMatch) {
          currentNode.manufacturer = mfgMatch[1];
          continue;
        }

        const modelMatch = line.match(/^MODEL\s+"([^"]+)"/i);
        if (modelMatch) {
          currentNode.model = modelMatch[1];
          continue;
        }

        const powerMatch = line.match(/^POWER\s+([0-9.]+)\s*(?:W|KW)?/i);
        if (powerMatch) {
          let p = parseFloat(powerMatch[1]);
          if (line.toUpperCase().includes('KW')) p *= 1000;
          currentNode.powerW = p;
          continue;
        }

        const voltMatch = line.match(/^VOLTAGE\s+([0-9.]+)\s*V?/i);
        if (voltMatch) {
          currentNode.voltageV = parseFloat(voltMatch[1]);
          continue;
        }

        const currMatch = line.match(/^CURRENT\s+([0-9.]+)\s*A?/i);
        if (currMatch) {
          currentNode.currentA = parseFloat(currMatch[1]);
          continue;
        }

        const polesMatch = line.match(/^POLES\s+([0-9]+)/i);
        if (polesMatch) {
          currentNode.poles = parseInt(polesMatch[1], 10);
          continue;
        }

        const phasesMatch = line.match(/^PHASES\s+([0-9]+)/i);
        if (phasesMatch) {
          currentNode.phasesCount = parseInt(phasesMatch[1], 10);
          continue;
        }

        const unitsMatch = line.match(/^UNITS_COUNT\s+([0-9]+)/i);
        if (unitsMatch) {
          currentNode.subComponentsCount = parseInt(unitsMatch[1], 10);
          continue;
        }

        const notesMatch = line.match(/^NOTES\s+"([^"]+)"/i);
        if (notesMatch) {
          currentNode.notes = notesMatch[1];
          continue;
        }

        // Generic Key-Value
        const kvMatch = line.match(/^([A-Za-z0-9_-]+)\s+(?:"([^"]+)"|([0-9.]+)|([A-Za-z0-9_-]+))/i);
        if (kvMatch && currentNode.customParams) {
          const key = kvMatch[1].toLowerCase();
          const val = kvMatch[2] || (kvMatch[3] ? parseFloat(kvMatch[3]) : kvMatch[4]);
          currentNode.customParams[key] = val;
        }
        continue;
      }

      // Connection parsing
      const connMatch = line.match(
        /^CONNECT\s+([A-Za-z0-9_-]+)(?:\.([A-Za-z0-9_+-]+))?\s*->\s*([A-Za-z0-9_-]+)(?:\.([A-Za-z0-9_+-]+))?(?:\s*\[(.*)\])?/i
      );

      if (connMatch) {
        const fromNodeId = connMatch[1];
        const fromPortId = connMatch[2] || 'OUT';
        const toNodeId = connMatch[3];
        const toPortId = connMatch[4] || 'IN';
        const attrBlock = connMatch[5] || '';

        const fromNode = model.nodes[fromNodeId];
        const toNode = model.nodes[toNodeId];
        const domain: DomainType = fromNode ? fromNode.domain : 'AC';

        // Parse attributes [GAUGE="10 AWG", LENGTH=15m, ...]
        let conductor: any = undefined;
        if (attrBlock) {
          conductor = {
            system: domain === 'DC' ? 'DC' : 'AC',
            conductorsCount: 2,
            gauge: '10 AWG',
            material: 'Cu',
            insulation: domain === 'DC' ? 'PV-Wire' : 'THHW-LS',
            lengthM: 10,
          };

          const gaugeM = attrBlock.match(/GAUGE\s*=\s*"([^"]+)"/i);
          if (gaugeM) conductor.gauge = gaugeM[1];

          const lenM = attrBlock.match(/LENGTH\s*=\s*([0-9.]+)\s*m?/i);
          if (lenM) conductor.lengthM = parseFloat(lenM[1]);

          const condCountM = attrBlock.match(/CONDUCTORS\s*=\s*([0-9]+)/i);
          if (condCountM) conductor.conductorsCount = parseInt(condCountM[1], 10);

          const insM = attrBlock.match(/INSULATION\s*=\s*"([^"]+)"/i);
          if (insM) conductor.insulation = insM[1];

          const conduitM = attrBlock.match(/CONDUIT\s*=\s*"([^"]+)"/i);
          if (conduitM) conductor.conduitTradeSize = conduitM[1];

          const tagM = attrBlock.match(/TAG\s*=\s*"([^"]+)"/i);
          if (tagM) conductor.circuitTag = tagM[1].replace(/[()]/g, '');
        }

        model.connections.push({
          id: `CONN_${fromNodeId}_${toNodeId}_${model.connections.length + 1}`,
          fromNodeId,
          fromPortId,
          toNodeId,
          toPortId,
          domain,
          conductor,
        });
      }
    }

    return model;
  }

  public static getDefaultLevelForType(type: ElectricalElementType): number {
    switch (type) {
      case 'PV_MODULE':
      case 'PV_STRING':
      case 'PV_ARRAY':
      case 'GENERATOR':
        return 0; // GENERACIÓN
      case 'FUSE':
      case 'DC_DISCONNECT':
      case 'SPD_DC':
      case 'CHARGE_CONTROLLER':
        return 1; // PROTECCIÓN DC
      case 'INVERTER':
      case 'MICROINVERTER':
      case 'BATTERY':
        return 2; // CONVERSIÓN & ALMACENAMIENTO
      case 'AC_BREAKER':
      case 'SPD_AC':
      case 'DISCONNECT':
      case 'AC_COMBINER':
        return 3; // PROTECCIÓN AC
      case 'INTERCONNECTION_POINT':
        return 4; // INTERCONEXIÓN
      case 'PANEL':
      case 'LOAD':
      case 'EV_CHARGER':
      case 'TRANSFORMER':
        return 5; // DISTRIBUCIÓN & CARGAS
      case 'METER':
        return 6; // MEDICIÓN
      case 'GRID':
        return 7; // RED DE SUMINISTRO
      case 'GROUND':
      case 'GROUND_BAR':
      case 'GROUND_ELECTRODE':
        return 8; // SPT
      default:
        return 4;
    }
  }

  public static getDefaultDomainForType(type: ElectricalElementType): DomainType {
    if (['PV_MODULE', 'PV_STRING', 'PV_ARRAY', 'FUSE', 'DC_DISCONNECT', 'SPD_DC', 'CHARGE_CONTROLLER'].includes(type)) {
      return 'DC';
    }
    if (['INVERTER', 'MICROINVERTER'].includes(type)) {
      return 'HYBRID';
    }
    if (['GROUND', 'GROUND_BAR', 'GROUND_ELECTRODE'].includes(type)) {
      return 'GROUND';
    }
    return 'AC';
  }

  public static generateDefaultPortsForType(type: ElectricalElementType, nodeId: string): Record<string, ElectricalPort> {
    const ports: Record<string, ElectricalPort> = {};

    switch (type) {
      case 'PV_ARRAY':
      case 'PV_STRING':
      case 'PV_MODULE':
        ports['DC+'] = { id: 'DC+', name: 'DC+', domain: 'DC', direction: 'OUTPUT', polarity: '+' };
        ports['DC-'] = { id: 'DC-', name: 'DC-', domain: 'DC', direction: 'OUTPUT', polarity: '-' };
        ports['PE'] = { id: 'PE', name: 'PE', domain: 'GROUND', direction: 'BIDIRECTIONAL', phase: 'PE' };
        break;

      case 'FUSE':
      case 'DC_DISCONNECT':
      case 'SPD_DC':
        ports['IN'] = { id: 'IN', name: 'IN', domain: 'DC', direction: 'INPUT' };
        ports['OUT'] = { id: 'OUT', name: 'OUT', domain: 'DC', direction: 'OUTPUT' };
        ports['PE'] = { id: 'PE', name: 'PE', domain: 'GROUND', direction: 'BIDIRECTIONAL', phase: 'PE' };
        break;

      case 'INVERTER':
        ports['DC+'] = { id: 'DC+', name: 'DC+', domain: 'DC', direction: 'INPUT', polarity: '+' };
        ports['DC-'] = { id: 'DC-', name: 'DC-', domain: 'DC', direction: 'INPUT', polarity: '-' };
        ports['AC_L1'] = { id: 'AC_L1', name: 'L1', domain: 'AC', direction: 'OUTPUT', phase: 'L1' };
        ports['AC_L2'] = { id: 'AC_L2', name: 'L2', domain: 'AC', direction: 'OUTPUT', phase: 'L2' };
        ports['AC_L3'] = { id: 'AC_L3', name: 'L3', domain: 'AC', direction: 'OUTPUT', phase: 'L3' };
        ports['AC_N'] = { id: 'AC_N', name: 'N', domain: 'AC', direction: 'OUTPUT', phase: 'N' };
        ports['OUT'] = { id: 'OUT', name: 'AC Out', domain: 'AC', direction: 'OUTPUT' };
        ports['PE'] = { id: 'PE', name: 'PE', domain: 'GROUND', direction: 'BIDIRECTIONAL', phase: 'PE' };
        break;

      case 'AC_BREAKER':
      case 'MAIN_BREAKER':
      case 'DISCONNECT':
        ports['IN'] = { id: 'IN', name: 'IN', domain: 'AC', direction: 'INPUT' };
        ports['OUT'] = { id: 'OUT', name: 'OUT', domain: 'AC', direction: 'OUTPUT' };
        ports['PE'] = { id: 'PE', name: 'PE', domain: 'GROUND', direction: 'BIDIRECTIONAL', phase: 'PE' };
        break;

      case 'METER':
        ports['IN'] = { id: 'IN', name: 'IN', domain: 'AC', direction: 'BIDIRECTIONAL' };
        ports['OUT'] = { id: 'OUT', name: 'OUT', domain: 'AC', direction: 'BIDIRECTIONAL' };
        ports['PE'] = { id: 'PE', name: 'PE', domain: 'GROUND', direction: 'BIDIRECTIONAL', phase: 'PE' };
        break;

      case 'GRID':
        ports['IN'] = { id: 'IN', name: 'IN', domain: 'AC', direction: 'OUTPUT' };
        ports['PE'] = { id: 'PE', name: 'PE', domain: 'GROUND', direction: 'BIDIRECTIONAL', phase: 'PE' };
        break;

      case 'LOAD':
      case 'PANEL':
      case 'EV_CHARGER':
        ports['IN'] = { id: 'IN', name: 'IN', domain: 'AC', direction: 'INPUT' };
        ports['PE'] = { id: 'PE', name: 'PE', domain: 'GROUND', direction: 'BIDIRECTIONAL', phase: 'PE' };
        break;

      case 'BATTERY':
        ports['DC+'] = { id: 'DC+', name: 'DC+', domain: 'DC', direction: 'BIDIRECTIONAL', polarity: '+' };
        ports['DC-'] = { id: 'DC-', name: 'DC-', domain: 'DC', direction: 'BIDIRECTIONAL', polarity: '-' };
        ports['PE'] = { id: 'PE', name: 'PE', domain: 'GROUND', direction: 'BIDIRECTIONAL', phase: 'PE' };
        break;

      case 'INTERCONNECTION_POINT':
        ports['IN'] = { id: 'IN', name: 'PV In', domain: 'AC', direction: 'INPUT' };
        ports['OUT_LOAD'] = { id: 'OUT_LOAD', name: 'To Load', domain: 'AC', direction: 'OUTPUT' };
        ports['OUT_GRID'] = { id: 'OUT_GRID', name: 'To Grid', domain: 'AC', direction: 'BIDIRECTIONAL' };
        break;

      default:
        ports['IN'] = { id: 'IN', name: 'IN', domain: 'AC', direction: 'INPUT' };
        ports['OUT'] = { id: 'OUT', name: 'OUT', domain: 'AC', direction: 'OUTPUT' };
        ports['PE'] = { id: 'PE', name: 'PE', domain: 'GROUND', direction: 'BIDIRECTIONAL', phase: 'PE' };
        break;
    }

    return ports;
  }
}
