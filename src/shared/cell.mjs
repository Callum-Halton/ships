
import { renderConstants } from './renderConstants.mjs';

export default class Cell {
	constructor(shipModule, pipeDirs) {
		this.shipModule = shipModule;
		this.pipeDirs = [];
		this.pipeNetwork = null;
	}

	draw(ctx, x, y) {
      ctx.fillStyle = 'rgb(255, 255, 255)';
      let { cellSize } = renderConstants;
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = 'rgb(200, 200, 200)';
      ctx.strokeRect(x, y, cellSize, cellSize);
	}
}

//npm run build