import {
  ElectricalModel,
  DetailLevel,
  LayoutGraph,
  LayoutNode,
  LayoutWire,
  LayoutPathPoint,
  ElectricalNode,
} from './edlTypes';

/**
 * Deterministic Topological Layout Engine
 * Converts graph nodes and connections into precise ANSI CAD coordinates,
 * orthogonal Manhattan wire paths, and visual layers.
 */
export class EdlLayoutEngine {
  public static computeLayout(model: ElectricalModel, detailLevel: DetailLevel = 'HIGH'): LayoutGraph {
    const canvasWidth = 1240;
    const canvasHeight = 820;

    const layoutNodes: LayoutNode[] = [];
    const layoutWires: LayoutWire[] = [];
    const annotations: LayoutGraph['annotations'] = [];

    // Categorize nodes by logical level
    const nodesByLevel: Record<number, ElectricalNode[]> = {
      0: [], // Gen (PV Arrays / Strings / Modules)
      1: [], // DC Prot (Fuses, DC Disconnect, SPD)
      2: [], // Conv (Inverters, Batteries)
      3: [], // AC Prot (Breakers, Disconnects)
      4: [], // Interconnection
      5: [], // Dist / Load
      6: [], // Meter
      7: [], // Grid
    };

    for (const node of Object.values(model.nodes)) {
      const lvl = node.level !== undefined ? Math.min(Math.max(node.level, 0), 7) : 4;
      if (!nodesByLevel[lvl]) nodesByLevel[lvl] = [];
      nodesByLevel[lvl].push(node);
    }

    // ==========================================
    // 1. POSITION LEVEL 0: PV GENERATORS (Top Left to Right)
    // ==========================================
    const genNodes = nodesByLevel[0];
    let pvY = 90;
    const pvStartX = 340;

    genNodes.forEach((node, gIdx) => {
      const stringCount = node.subComponentsCount || 9;
      const effectiveDisplayCount = detailLevel === 'LOW' ? 1 : detailLevel === 'MEDIUM' ? 3 : Math.min(stringCount, 9);
      const width = detailLevel === 'LOW' ? 120 : effectiveDisplayCount * 44 + 20;
      const height = 75;
      const x = pvStartX;
      const y = pvY + gIdx * 135;

      const subElements = [];
      if (detailLevel === 'HIGH') {
        for (let i = 0; i < effectiveDisplayCount; i++) {
          subElements.push({
            id: `${node.id}_M${i + 1}`,
            label: `G${gIdx * 9 + i + 1}`,
            x: x + i * 44,
            y: y,
            width: 38,
            height: 68,
          });
        }
      }

      layoutNodes.push({
        nodeId: node.id,
        x,
        y,
        width,
        height,
        level: 0,
        ports: {
          'DC+': { portId: 'DC+', x: x + width, y: y + 25, direction: 'RIGHT' },
          'DC-': { portId: 'DC-', x: x + width, y: y + 45, direction: 'RIGHT' },
          'OUT': { portId: 'OUT', x: x + width, y: y + 35, direction: 'RIGHT' },
          'PE': { portId: 'PE', x: x, y: y - 25, direction: 'TOP' },
        },
        subElements,
      });
    });

    // ==========================================
    // 2. POSITION LEVEL 1: DC PROTECTION (Combiner & Disconnect)
    // ==========================================
    const dcProtNodes = nodesByLevel[1];
    let dcProtX = 780;
    let dcProtY = 100;

    dcProtNodes.forEach((node, idx) => {
      let width = 50;
      let height = 40;
      let x = dcProtX;
      let y = dcProtY + idx * 75;

      if (node.type === 'DC_DISCONNECT') {
        x = 850;
        y = 170;
        width = 40;
        height = 40;
      }

      layoutNodes.push({
        nodeId: node.id,
        x,
        y,
        width,
        height,
        level: 1,
        ports: {
          'IN': { portId: 'IN', x: x - 15, y: y + height / 2, direction: 'LEFT' },
          'OUT': { portId: 'OUT', x: x + width + 10, y: y + height / 2, direction: 'RIGHT' },
          'PE': { portId: 'PE', x: x + width / 2, y: y + height + 10, direction: 'BOTTOM' },
        },
      });
    });

    // ==========================================
    // 3. POSITION LEVEL 2: INVERTER STATION
    // ==========================================
    const invNodes = nodesByLevel[2];
    invNodes.forEach((node, idx) => {
      const x = 898 + idx * 120;
      const y = 385;
      const width = 85;
      const height = 95;

      layoutNodes.push({
        nodeId: node.id,
        x,
        y,
        width,
        height,
        level: 2,
        ports: {
          'DC+': { portId: 'DC+', x: x - 8, y: y - height / 2, direction: 'TOP' },
          'DC-': { portId: 'DC-', x: x + 8, y: y - height / 2, direction: 'TOP' },
          'IN': { portId: 'IN', x: x, y: y - height / 2, direction: 'TOP' },
          'OUT': { portId: 'OUT', x: x, y: y + height / 2, direction: 'BOTTOM' },
          'AC_L1': { portId: 'AC_L1', x: x - 6, y: y + height / 2, direction: 'BOTTOM' },
          'AC_L2': { portId: 'AC_L2', x: x + 6, y: y + height / 2, direction: 'BOTTOM' },
          'PE': { portId: 'PE', x: x + width / 2 + 10, y: y + 10, direction: 'RIGHT' },
        },
      });
    });

    // ==========================================
    // 4. POSITION LEVEL 3: AC PROTECTIONS (Breakers)
    // ==========================================
    const acProtNodes = nodesByLevel[3];
    let acProtX = 760;
    acProtNodes.forEach((node, idx) => {
      const x = acProtX - idx * 130;
      const y = 510;
      const width = 45;
      const height = 35;

      layoutNodes.push({
        nodeId: node.id,
        x,
        y,
        width,
        height,
        level: 3,
        ports: {
          'IN': { portId: 'IN', x: x + 25, y: y, direction: 'RIGHT' },
          'OUT': { portId: 'OUT', x: x - 25, y: y, direction: 'LEFT' },
          'PE': { portId: 'PE', x: x, y: y + 25, direction: 'BOTTOM' },
        },
      });
    });

    // ==========================================
    // 5. POSITION LEVEL 4: INTERCONNECTION POINT
    // ==========================================
    const interconnX = 660;
    const interconnY = 510;
    const interconnNodes = nodesByLevel[4];

    if (interconnNodes.length > 0) {
      interconnNodes.forEach((node) => {
        layoutNodes.push({
          nodeId: node.id,
          x: interconnX,
          y: interconnY,
          width: 20,
          height: 20,
          level: 4,
          ports: {
            'IN': { portId: 'IN', x: interconnX + 10, y: interconnY, direction: 'RIGHT' },
            'OUT_LOAD': { portId: 'OUT_LOAD', x: interconnX, y: interconnY + 10, direction: 'BOTTOM' },
            'OUT_GRID': { portId: 'OUT_GRID', x: interconnX - 10, y: interconnY, direction: 'LEFT' },
          },
        });
      });
    }

    // ==========================================
    // 6. POSITION LEVEL 5: LOAD CENTER / CARGA
    // ==========================================
    const loadNodes = nodesByLevel[5];
    loadNodes.forEach((node, idx) => {
      const x = 660;
      const y = 710 + idx * 90;
      const width = 90;
      const height = 70;

      layoutNodes.push({
        nodeId: node.id,
        x,
        y,
        width,
        height,
        level: 5,
        ports: {
          'IN': { portId: 'IN', x: x, y: y - height / 2, direction: 'TOP' },
          'PE': { portId: 'PE', x: x + width / 2, y: y, direction: 'RIGHT' },
        },
      });
    });

    // ==========================================
    // 7. POSITION LEVEL 6 & 7: METER & GRID
    // ==========================================
    const meterNodes = nodesByLevel[6];
    const gridNodes = nodesByLevel[7];

    meterNodes.forEach((node) => {
      const x = 475;
      const y = 510;
      layoutNodes.push({
        nodeId: node.id,
        x,
        y,
        width: 45,
        height: 40,
        level: 6,
        ports: {
          'IN': { portId: 'IN', x: x + 25, y: y, direction: 'RIGHT' },
          'OUT': { portId: 'OUT', x: x, y: y + 25, direction: 'BOTTOM' },
          'PE': { portId: 'PE', x: x + 30, y: y, direction: 'RIGHT' },
        },
      });
    });

    gridNodes.forEach((node) => {
      const x = 475;
      const y = 625;
      layoutNodes.push({
        nodeId: node.id,
        x,
        y,
        width: 44,
        height: 44,
        level: 7,
        ports: {
          'IN': { portId: 'IN', x: x, y: y - 22, direction: 'TOP' },
          'PE': { portId: 'PE', x: x, y: y + 22, direction: 'BOTTOM' },
        },
      });
    });

    // Node lookup map
    const nodeMap = new Map<string, LayoutNode>();
    layoutNodes.forEach((n) => nodeMap.set(n.nodeId, n));

    // ==========================================
    // 8. ORTHOGONAL MANHATTAN ROUTING FOR CONNECTIONS
    // ==========================================
    for (const conn of model.connections) {
      const srcNode = nodeMap.get(conn.fromNodeId);
      const tgtNode = nodeMap.get(conn.toNodeId);

      if (!srcNode || !tgtNode) continue;

      const srcPort = srcNode.ports[conn.fromPortId] || Object.values(srcNode.ports)[0];
      const tgtPort = tgtNode.ports[conn.toPortId] || Object.values(tgtNode.ports)[0];

      if (!srcPort || !tgtPort) continue;

      const points: LayoutPathPoint[] = [{ x: srcPort.x, y: srcPort.y }];

      // Pure orthogonal right-angle routing
      if (Math.abs(srcPort.y - tgtPort.y) < 5) {
        // Horizontal straight line
        points.push({ x: tgtPort.x, y: tgtPort.y });
      } else if (Math.abs(srcPort.x - tgtPort.x) < 5) {
        // Vertical straight line
        points.push({ x: tgtPort.x, y: tgtPort.y });
      } else {
        // Step routing with orthogonal elbow
        if (srcPort.direction === 'RIGHT' || srcPort.direction === 'LEFT') {
          const midX = (srcPort.x + tgtPort.x) / 2;
          points.push({ x: midX, y: srcPort.y });
          points.push({ x: midX, y: tgtPort.y });
          points.push({ x: tgtPort.x, y: tgtPort.y });
        } else {
          const midY = (srcPort.y + tgtPort.y) / 2;
          points.push({ x: srcPort.x, y: midY });
          points.push({ x: tgtPort.x, y: midY });
          points.push({ x: tgtPort.x, y: tgtPort.y });
        }
      }

      // Conductor tag position
      let tagPosition = undefined;
      if (conn.conductor && conn.conductor.circuitTag) {
        const midPointIdx = Math.floor(points.length / 2);
        tagPosition = {
          x: (points[0].x + points[points.length - 1].x) / 2,
          y: (points[0].y + points[points.length - 1].y) / 2 - 8,
          tag: conn.conductor.circuitTag,
        };
      }

      layoutWires.push({
        connectionId: conn.id,
        fromNodeId: conn.fromNodeId,
        fromPortId: conn.fromPortId,
        toNodeId: conn.toNodeId,
        toPortId: conn.toPortId,
        domain: conn.domain,
        points,
        conductor: conn.conductor,
        tagPosition,
      });
    }

    // ==========================================
    // 9. GROUNDING BACKBONE NETWORK
    // ==========================================
    const groundingNetwork = {
      busLine: { x1: 305, y1: 65, x2: 740, y2: 65 },
      taps: genNodes.map((n, idx) => ({
        x1: 340 + idx * 44,
        y1: 65,
        x2: 340 + idx * 44,
        y2: 76,
        nodeId: n.id,
      })),
      electrode: { x: 305, y: 65 },
    };

    // ==========================================
    // 10. ANNOTATIONS & INTERCONNECTION CALLOUTS
    // ==========================================
    annotations.push({
      x: interconnX,
      y: interconnY - 30,
      text: 'Punto de interconexión',
      category: 'POINT_OF_INTERCONNECTION',
    });

    return {
      viewBox: { width: canvasWidth, height: canvasHeight },
      nodes: layoutNodes,
      wires: layoutWires,
      groundingNetwork,
      annotations,
      titleBlock: {
        x: 25,
        y: 492,
        width: 250,
        height: 300,
      },
    };
  }
}
