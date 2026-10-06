import { ElectricalModel, LayoutGraph } from './edlTypes';

/**
 * DXF Exporter (AutoCAD R12 / 2000 Compatible ASCII Format)
 * Exports the compiled electrical model and layout graph directly into CAD layers.
 */
export class DxfExporter {
  public static generateDxf(model: ElectricalModel, layout: LayoutGraph): string {
    const lines: string[] = [];

    // Header section
    lines.push('0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '0', 'ENDSEC');

    // Tables section with standard electrical layers
    lines.push('0', 'SECTION', '2', 'TABLES');
    lines.push('0', 'TABLE', '2', 'LAYER', '70', '7');

    const layers = [
      { name: '0', color: 7 },
      { name: 'E-BORDER', color: 7 },
      { name: 'E-PV-MODULES', color: 4 }, // Cyan
      { name: 'E-SYMBOLS', color: 7 }, // White
      { name: 'E-WIRE-DC', color: 1 }, // Red
      { name: 'E-WIRE-AC', color: 5 }, // Blue
      { name: 'E-GND', color: 3 }, // Green
      { name: 'E-TEXT', color: 7 },
      { name: 'E-TABLE', color: 2 }, // Yellow
    ];

    for (const l of layers) {
      lines.push('0', 'LAYER', '2', l.name, '70', '0', '62', String(l.color), '6', 'CONTINUOUS');
    }
    lines.push('0', 'ENDTAB', '0', 'ENDSEC');

    // Entities section
    lines.push('0', 'SECTION', '2', 'ENTITIES');

    // Helper: Line
    const addLine = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
      // Invert Y because CAD origin is bottom-left
      const cy1 = 820 - y1;
      const cy2 = 820 - y2;
      lines.push('0', 'LINE', '8', layer, '10', x1.toFixed(2), '20', cy1.toFixed(2), '30', '0.0');
      lines.push('11', x2.toFixed(2), '21', cy2.toFixed(2), '31', '0.0');
    };

    // Helper: Rectangle
    const addRect = (x: number, y: number, w: number, h: number, layer: string) => {
      addLine(x, y, x + w, y, layer);
      addLine(x + w, y, x + w, y + h, layer);
      addLine(x + w, y + h, x, y + h, layer);
      addLine(x, y + h, x, y, layer);
    };

    // Helper: Text
    const addText = (x: number, y: number, text: string, height: number, layer: string) => {
      const cy = 820 - y;
      lines.push('0', 'TEXT', '8', layer, '10', x.toFixed(2), '20', cy.toFixed(2), '30', '0.0', '40', height.toFixed(2), '1', text);
    };

    // 1. Drawing Border
    addRect(15, 15, 1210, 790, 'E-BORDER');
    addRect(20, 20, 1200, 780, 'E-BORDER');
    addLine(280, 20, 280, 800, 'E-BORDER');

    // 2. Title Block texts
    addText(35, 45, 'DIAGRAMA UNIFILAR ANSI / IEEE & CFE', 14, 'E-TEXT');
    addText(35, 75, `PROYECTO: ${model.metadata.clientName || model.systemName}`, 9, 'E-TEXT');
    addText(35, 95, `UBICACION: ${model.metadata.projectAddress || 'LOCAL'}`, 7, 'E-TEXT');
    addText(35, 115, `RPU: ${model.metadata.rpu || '148231100137'}`, 8, 'E-TEXT');
    addText(35, 135, `NORMA: ${model.standard}`, 8, 'E-TEXT');

    // 3. Grounding network
    const gnd = layout.groundingNetwork;
    addLine(gnd.busLine.x1, gnd.busLine.y1, gnd.busLine.x2, gnd.busLine.y2, 'E-GND');
    for (const tap of gnd.taps) {
      addLine(tap.x1, tap.y1, tap.x2, tap.y2, 'E-GND');
    }

    // 4. Nodes and symbols
    for (const node of layout.nodes) {
      const el = model.nodes[node.nodeId];
      if (!el) continue;

      if (['PV_MODULE', 'PV_STRING', 'PV_ARRAY'].includes(el.type)) {
        if (node.subElements && node.subElements.length > 0) {
          for (const sub of node.subElements) {
            addRect(sub.x, sub.y, sub.width, sub.height, 'E-PV-MODULES');
            addText(sub.x + 8, sub.y + 25, sub.label, 8, 'E-TEXT');
          }
        } else {
          addRect(node.x, node.y, node.width, node.height, 'E-PV-MODULES');
          addText(node.x + 10, node.y + 25, el.name, 9, 'E-TEXT');
        }
      } else if (el.type === 'INVERTER') {
        addRect(node.x - node.width / 2, node.y - node.height / 2, node.width, node.height, 'E-SYMBOLS');
        addLine(node.x - node.width / 2, node.y + node.height / 2, node.x + node.width / 2, node.y - node.height / 2, 'E-SYMBOLS');
        addText(node.x - 15, node.y - 10, 'INV DC/AC', 8, 'E-TEXT');
        addText(node.x - 20, node.y + 15, `${(el.powerW || 11400) / 1000} kW`, 7, 'E-TEXT');
      } else if (['AC_BREAKER', 'MAIN_BREAKER'].includes(el.type)) {
        addRect(node.x - 15, node.y - 10, 30, 20, 'E-SYMBOLS');
        addText(node.x - 25, node.y - 15, `${el.poles || 2}x${el.currentA || 60}A`, 7, 'E-TEXT');
      } else if (el.type === 'METER') {
        addRect(node.x - 18, node.y - 14, 36, 28, 'E-SYMBOLS');
        addText(node.x - 10, node.y + 4, 'kWh', 8, 'E-TEXT');
      } else {
        addRect(node.x - 15, node.y - 15, 30, 30, 'E-SYMBOLS');
        addText(node.x - 12, node.y, el.id, 6, 'E-TEXT');
      }
    }

    // 5. Wires
    for (const wire of layout.wires) {
      const layer = wire.domain === 'DC' ? 'E-WIRE-DC' : 'E-WIRE-AC';
      for (let i = 0; i < wire.points.length - 1; i++) {
        const p1 = wire.points[i];
        const p2 = wire.points[i + 1];
        addLine(p1.x, p1.y, p2.x, p2.y, layer);
      }
      if (wire.tagPosition && wire.conductor) {
        addText(wire.tagPosition.x, wire.tagPosition.y, `(${wire.conductor.circuitTag})`, 8, 'E-TEXT');
      }
    }

    // End Section & EOF
    lines.push('0', 'ENDSEC', '0', 'EOF');
    return lines.join('\n');
  }
}
