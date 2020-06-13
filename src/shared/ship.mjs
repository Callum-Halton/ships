
import Cell from '../shared/cell.mjs';
import { renderConstants } from './renderConstants.mjs';

export default class Ship {
    constructor(pos, w, h) {
        this.pos = pos;
        this.cells = [];
        for (let y = 0; y < h; y++) {
            this.cells.push([]);
            for (let x = 0; x < w; x++) {
                this.cells[y].push(new Cell(null, []));
            }
        }
    }

    draw(ctx) {
        let { x: shipX, y: shipY } = this.pos;
        let y = shipY;
        let { cellSize } = renderConstants;
        let { cells } = this;
        for (let rowInd = 0; rowInd < cells.length; rowInd++) {
            let row = cells[rowInd];
            let x = shipX;
            for (let cell of row) {
                cell.draw(ctx, x, y);
                x += cellSize
            }
            y += cellSize; 
        }
    }
}