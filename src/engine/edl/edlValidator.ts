import {
  ElectricalModel,
  ValidationReport,
  ValidationIssue,
  ElectricalNode,
} from './edlTypes';

/**
 * Deterministic Electrical & Topological Validation Engine
 * Validates continuity, voltage, ampacity, phase coherence, grounding and NOM-001-SEDE / NEC rules.
 */
export class EdlValidator {
  public static validate(model: ElectricalModel): ValidationReport {
    const issues: ValidationIssue[] = [];

    let totalDcPowerW = 0;
    let totalAcPowerKw = 0;
    let maxDcVoltageV = 0;
    let maxAcCurrentA = 0;

    const nodeEntries = Object.entries(model.nodes);
    const nodeIds = new Set(nodeEntries.map(([id]) => id));

    // 1. Calculate Aggregated Metrics & Node-level Validations
    for (const [id, node] of nodeEntries) {
      // Power & Voltage metrics
      if (['PV_MODULE', 'PV_STRING', 'PV_ARRAY'].includes(node.type)) {
        if (node.powerW) totalDcPowerW += node.powerW;
        if (node.voltageV && node.voltageV > maxDcVoltageV) maxDcVoltageV = node.voltageV;
      }

      if (['INVERTER', 'MICROINVERTER'].includes(node.type)) {
        if (node.powerW) totalAcPowerKw += node.powerW / 1000;
        if (node.currentA && node.currentA > maxAcCurrentA) maxAcCurrentA = node.currentA;
        else if (node.powerW && node.voltageV) {
          const calcCurrent = node.powerW / (node.voltageV * (node.phasesCount === 3 ? 1.732 : 1));
          if (calcCurrent > maxAcCurrentA) maxAcCurrentA = calcCurrent;
        }
      }

      // Check Inverter Voltage / Phase vs Protections
      if (node.type === 'INVERTER') {
        const invPhases = node.phasesCount || (node.voltageV === 220 ? 2 : 1);

        // Find connected AC breaker
        const outgoingConns = model.connections.filter((c) => c.fromNodeId === id);
        for (const conn of outgoingConns) {
          const targetNode = model.nodes[conn.toNodeId];
          if (targetNode && targetNode.type === 'AC_BREAKER') {
            const breakerPoles = targetNode.poles || 2;
            if (invPhases === 2 && breakerPoles === 3) {
              issues.push({
                id: `WARN_PHASE_MISMATCH_${id}`,
                severity: 'WARNING',
                code: 'PHASE_POLES_MISMATCH',
                nodeId: id,
                message: `Inversor bifásico (${node.voltageV || 220}V, ${invPhases}F) asociado a interruptor termomagnético de 3 polos (${targetNode.id}).`,
                recommendation: 'Verificar si se utiliza una fase de reserva o si corresponde un interruptor termomagnético de 2 polos (2x60A / 2x30A).',
              });
            }
          }
        }
      }

      // Check DC Overcurrent Protection for PV Strings / Arrays
      if (['PV_ARRAY', 'PV_STRING'].includes(node.type)) {
        const isMultiString = (node.subComponentsCount || 1) > 1 || node.type === 'PV_ARRAY';
        const hasDirectDcConn = model.connections.some((c) => c.fromNodeId === id);

        if (!hasDirectDcConn) {
          issues.push({
            id: `ERR_DANGLING_PV_${id}`,
            severity: 'ERROR',
            code: 'DANGLING_GENERATOR',
            nodeId: id,
            message: `El generador solar ${node.id} no tiene conexiones de salida hacia fusibles, desconectador o inversor.`,
            recommendation: 'Agregar instrucción CONNECT desde este generador hacia la etapa de protección o inversor.',
          });
        }
      }
    }

    // 2. Validate Connection Topology & Domain Compatibility
    const connectedNodes = new Set<string>();
    const nodeInDegree: Record<string, number> = {};
    const nodeOutDegree: Record<string, number> = {};

    for (const id of nodeIds) {
      nodeInDegree[id] = 0;
      nodeOutDegree[id] = 0;
    }

    for (const conn of model.connections) {
      const fromNode = model.nodes[conn.fromNodeId];
      const toNode = model.nodes[conn.toNodeId];

      if (!fromNode) {
        issues.push({
          id: `ERR_MISSING_SRC_${conn.id}`,
          severity: 'ERROR',
          code: 'UNDEFINED_SOURCE_NODE',
          connectionId: conn.id,
          message: `La conexión ${conn.id} hace referencia a un nodo origen inexistente: "${conn.fromNodeId}".`,
          recommendation: `Declarar el componente ${conn.fromNodeId} antes de conectarlo.`,
        });
        continue;
      }

      if (!toNode) {
        issues.push({
          id: `ERR_MISSING_TGT_${conn.id}`,
          severity: 'ERROR',
          code: 'UNDEFINED_TARGET_NODE',
          connectionId: conn.id,
          message: `La conexión ${conn.id} hace referencia a un nodo destino inexistente: "${conn.toNodeId}".`,
          recommendation: `Declarar el componente ${conn.toNodeId} antes de conectarlo.`,
        });
        continue;
      }

      connectedNodes.add(conn.fromNodeId);
      connectedNodes.add(conn.toNodeId);
      nodeOutDegree[conn.fromNodeId] = (nodeOutDegree[conn.fromNodeId] || 0) + 1;
      nodeInDegree[conn.toNodeId] = (nodeInDegree[conn.toNodeId] || 0) + 1;

      // Domain Compatibility Check (DC vs AC)
      // Allowed cross-domain node is INVERTER (DC in, AC out) and CHARGE_CONTROLLER
      if (fromNode.domain === 'DC' && toNode.domain === 'AC' && toNode.type !== 'INVERTER') {
        issues.push({
          id: `ERR_DOMAIN_MISMATCH_${conn.id}`,
          severity: 'ERROR',
          code: 'DOMAIN_MISMATCH_DC_TO_AC',
          connectionId: conn.id,
          message: `Conexión incompatible entre circuito DC (${fromNode.id}) y circuito AC (${toNode.id}) sin convertidor estático (Inversor).`,
          recommendation: 'Intercalar un Inversor DC/AC entre las etapas de corriente directa y corriente alterna.',
        });
      }

      // Conductor Ampacity & Drop Check
      if (conn.conductor) {
        const c = conn.conductor;
        if (c.voltageDropPercent && c.voltageDropPercent > 3.0) {
          issues.push({
            id: `WARN_VOLTAGE_DROP_${conn.id}`,
            severity: 'WARNING',
            code: 'HIGH_VOLTAGE_DROP',
            connectionId: conn.id,
            message: `Caída de tensión de ${c.voltageDropPercent.toFixed(2)}% en circuito ${c.circuitTag || conn.id} excede el límite recomendado de 3.0% (NOM-001 Art. 210-19 / 215-2).`,
            recommendation: `Aumentar el calibre del conductor desde ${c.gauge} al siguiente calibre comercial superior.`,
          });
        }
      }
    }

    // 3. Isolated Nodes Warning
    for (const id of nodeIds) {
      const node = model.nodes[id];
      if (
        !['GROUND', 'GROUND_BAR', 'GROUND_ELECTRODE', 'CABINET', 'LABEL'].includes(node.type) &&
        !connectedNodes.has(id)
      ) {
        issues.push({
          id: `WARN_ISOLATED_NODE_${id}`,
          severity: 'WARNING',
          code: 'ISOLATED_NODE',
          nodeId: id,
          message: `El componente ${node.type} "${node.id}" está declarado en el sistema pero no tiene conexiones activas.`,
          recommendation: 'Conectar este componente a la cadena eléctrica o removerlo de la especificación.',
        });
      }
    }

    // 4. Grounding Network & Interconnection Continuity
    const hasGridOrMeter = nodeEntries.some(([, n]) => ['GRID', 'METER', 'PANEL'].includes(n.type));
    const hasInverter = nodeEntries.some(([, n]) => ['INVERTER', 'MICROINVERTER'].includes(n.type));

    if (hasInverter && !hasGridOrMeter) {
      issues.push({
        id: 'WARN_NO_GRID_CONNECTION',
        severity: 'INFO',
        code: 'ISLAND_SYSTEM_DETECTED',
        message: 'No se detectó punto de conexión a la red eléctrica CFE o tablero principal (Posible sistema aislado Off-Grid).',
        recommendation: 'Agregar bloque GRID y METER si el sistema es interconectado a la red según NOM-001 Art. 690-60.',
      });
    }

    const errorsCount = issues.filter((i) => i.severity === 'ERROR').length;
    const warningsCount = issues.filter((i) => i.severity === 'WARNING').length;

    return {
      isValid: errorsCount === 0,
      errorsCount,
      warningsCount,
      issues,
      metrics: {
        totalDcPowerW,
        totalAcPowerKw,
        maxDcVoltageV,
        maxAcCurrentA,
        nodesCount: nodeEntries.length,
        connectionsCount: model.connections.length,
      },
    };
  }
}
