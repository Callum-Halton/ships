import { renderConstants } from './renderConstants.mjs';
import { shipModuleSpecs } from './shipModuleSpecs.mjs';

export default class ShipModule {
	constructor(moduleName) {
		this.name = moduleName;
		
		let { maxOutputs, type } = ShipModule.getSpecs(this);
		this.outputs = {};
		for (let networkType in maxOutputs) {
			this.outputs[networkType] = {
				output: 0,
				idealOutput: type === 'converter' ? 0 : maxOutputs[networkType].amount,
				maxOutput: maxOutputs[networkType].amount,
			};
		}
		
		this.reserve = 0;
	}
	
	static getSpecs(module) {
		return shipModuleSpecs[module.name];
	}
	
	static draw(ctx, module, x, y) {
		let { name, outputs } = module;
		let { color, maxOutputs } = ShipModule.getSpecs(module);
		
	  ctx.beginPath();
	  let halfCell = renderConstants.cellSize / 2;
    ctx.arc(x + halfCell, y + halfCell, halfCell - 8, 0, 2 * Math.PI, false);
    let {r, g, b} = color;
    let networkType = Object.keys(outputs)[0];
    let a = Math.abs(outputs[networkType].output / maxOutputs[networkType].amount);
    //console.log(name, Object.keys(outputs)[0], outputs[networkType].output, maxOutputs[networkType].amount);
    a += 0.05;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
    ctx.fill();
	}
}