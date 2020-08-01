
import { renderConstants } from './renderConstants.mjs';
import ShipModule from './shipModule.mjs';
import Vector2 from './vector2.mjs';

/*function square(ctx, ) {
  
}*/

const nColors = {
  n0: 'rgb(255, 0, 0)',
  n1: 'rgb(0, 255, 0)',
  n2: 'rgb(0, 0, 255)',
  n3: 'rgb(255, 255, 0)',
  n4: 'rgb(0, 255, 255)',
  n5: 'rgb(255, 0, 255)',
};

class CellNetworkInfo {
  constructor() {
    this.dirs = [];
    this.id = null;
  }
}

export default class Cell {
	constructor(module, pipeDirs) {
		this.highlighted = false;
		this.searched = false;
		this.module = module;
		this.networks = {
		  pipe: new CellNetworkInfo(),
		  cable: new CellNetworkInfo(),
		  duct: new CellNetworkInfo(),
		};
	}

	static draw(ctx, cell, x, y) {
	    let { networks, highlighted } = cell;
	    let { cellSize, pipeWidth } = renderConstants;
	    
      ctx.fillStyle = highlighted ? 'rgb(255, 255, 200)' 
                    //: networks.cable.id ? nColors[networks.cable.id]
                    : 'rgb(255, 255, 255)';
      ctx.fillRect(x, y, cellSize, cellSize);
      
      let centerOffset = (cellSize - pipeWidth) / 2;
      let pipeLength = (cellSize + pipeWidth) / 2;
      ctx.fillStyle = 'rgb(0, 0, 0)';
      
      let connectionOffset = pipeWidth;
      for (let networkType of ['cable', 'pipe', 'duct']) {
        if (networkType === 'pipe') {
          connectionOffset = -pipeWidth;
          ctx.fillStyle = 'rgb(200, 200, 200)';
        } else if (networkType === 'duct') {
          connectionOffset = 0;
          ctx.fillStyle = 'rgb(100, 150, 100)';
        }
        for (let dir of networks[networkType].dirs) {
          if ( Vector2.areEqual(dir, Vector2.right) ) {
            ctx.fillRect(x + centerOffset + connectionOffset, y + centerOffset + connectionOffset, pipeLength - connectionOffset, pipeWidth);
          } else if ( Vector2.areEqual(dir, Vector2.down) ) {
            ctx.fillRect(x + centerOffset + connectionOffset, y + centerOffset + connectionOffset, pipeWidth, pipeLength - connectionOffset);
          } else if ( Vector2.areEqual(dir, Vector2.left) ) {
            ctx.fillRect(x, y + centerOffset + connectionOffset, pipeLength + connectionOffset, pipeWidth);
          } else { 
            ctx.fillRect(x + centerOffset + connectionOffset, y, pipeWidth, pipeLength + connectionOffset);
          }
        }
      }


      if (cell.module !== null) {
    	  ShipModule.draw(ctx, cell.module, x, y);
      }
      
      ctx.strokeStyle = 'rgb(200, 200, 200)';
      ctx.strokeRect(x, y, cellSize, cellSize);
	}
}

//npm run build