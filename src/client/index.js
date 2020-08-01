
import Space from '../shared/cell.mjs';
import ShipModule from '../shared/shipModule.mjs';
import Vector2 from '../shared/vector2.mjs';
import { renderConstants } from '../shared/renderConstants.mjs';
import io from 'socket.io-client';
import { Ship } from '../shared/ship.mjs';

let ship = new Ship();

var socket = io();
socket = io.connect('https://e945f1fb94ce4d5cb5f04e3b2cd4fa36.vfs.cloud9.us-east-2.amazonaws.com:8080');

const canvas = document.getElementById('canvas');
canvas.width = 500; canvas.height = 500;
const ctx = canvas.getContext('2d');

socket.on('goldenShip', shipState => {
  ship = new Ship(shipState);
  window.requestAnimationFrame(draw);
});

socket.on('addModule', data => ship.addModule(data.moduleName, data.cellPos));
socket.on('addConnection', data => ship.addConnection(data.networkType, data.cellPositions));
socket.on('deleteModule', cellPos => ship.deleteModule(cellPos));
socket.on('deleteConnection', data => ship.deleteConnection(data.networkType, data.cellPositions));

const actionOptions = document.getElementById('actionOptions');
const partOptions = document.getElementById('partOptions');
let lastClickCellPos = null;
const networkTypes = ['pipe', 'cable', 'duct'];

window.addEventListener("keydown", event => {
  let keyPressed = String.fromCharCode(event.keyCode).toLocaleLowerCase();
  switch(keyPressed) {
    case 'a':
      actionOptions.value = 'add';
      break;
    case 'k':
      actionOptions.value = 'deleteConnection';
      break;
    case 'm':
      actionOptions.value = 'deleteModule';
      break;
    case 'b':
      actionOptions.value = 'debugging';
      break;
    case 'r':
      partOptions.value = 'reactor';
      break;
    case 'e':
      partOptions.value = 'engine';
      break;
    case 'f':
      partOptions.value = 'fuelPlant';
      break;
    case 's':
      partOptions.value = 'solarPanel';
      break;
    case 'c':
      partOptions.value = 'cable';
      break;
    case 'p':
      partOptions.value = 'pipe';
      break;
    case 'd':
      partOptions.value = 'duct';
      break;
    case 'l':
      partOptions.value = 'lifeSupport';
      break;
    case 'v':
      partOptions.value = 'vent';
      break;
    case 't':
      runRefreshTest();
      break;
  }
}, false);

canvas.addEventListener('click', event => { 
  const { clientX, clientY } = event;
  const { left, top } = canvas.getBoundingClientRect();
  const clickPos = new Vector2(clientX - left, clientY - top);
  
  const relPos = Vector2.sub(clickPos, ship.state.pos);
  const cellPos = Vector2.floor(Vector2.scale(relPos, 1/renderConstants.cellSize));
  if (!ship.hasCellAtPos(cellPos)) { return; }

  let isAdd = false;
  const partIsConnection = networkTypes.includes(partOptions.value);
  switch(actionOptions.value) {
    case 'add':
      isAdd = true;
      if (partIsConnection) {
        changeConnection(cellPos, isAdd);
      } else {
        changeModule(cellPos, isAdd);
      }
      break;
    case 'deleteConnection':
      if (partIsConnection) {
        changeConnection(cellPos, isAdd);
      }
      break;
    case 'deleteModule':
      changeModule(cellPos, isAdd);
      break;
    default: // debugging
    console.log(ship.getCell(cellPos).module.outputs);
      /*let { demand, demandLeft, potentialConverterSupply} = ship.getNetwork(partOptions.value, ship.getCell(cellPos).networks[partOptions.value].id);
      console.log(demand, demandLeft, potentialConverterSupply);*/
  }

  
}, false);

function changeConnection(cellPos, isAdd) {
  if (lastClickCellPos) {
    let data = {
      networkType: partOptions.value,
      cellPositions: [ lastClickCellPos, cellPos ],
    };
    
    if (isAdd) {
      let valid = ship.addConnection(data.networkType, data.cellPositions);
      if (valid) { socket.emit('addConnection', data); }
    } else {
      let valid = ship.deleteConnection(data.networkType, data.cellPositions);
      if (valid) { socket.emit('deleteConnection', data); }
    }
    
    setLocalCellHighlight(lastClickCellPos, false);
    lastClickCellPos = null;
  } else {
    setLocalCellHighlight(cellPos, true);
    lastClickCellPos = cellPos;
  }
}

function changeModule(cellPos, isAdd) {
  if (lastClickCellPos) {
    setLocalCellHighlight(lastClickCellPos, false);
    lastClickCellPos = null;
  }
  
  if (isAdd) { 
    let data = { moduleName: partOptions.value, cellPos: cellPos };
    let valid = ship.addModule(data.moduleName, cellPos);
    if (valid) { socket.emit('addModule', data); }
  } else {
    let valid = ship.deleteModule(cellPos);
    if (valid) { socket.emit('deleteModule', cellPos); } 
  }
}



function setLocalCellHighlight(cellPos, val) {
  ship.getCell(cellPos).highlighted = val;
}


function draw() {
  ctx.fillStyle = 'rgb(51, 51, 51)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ship.draw(ctx);
  window.requestAnimationFrame(draw);
}

function runRefreshTest() {
  ship.addModule('fuelPlant',  new Vector2(0,0));
  ship.addModule('reactor',    new Vector2(1,0));
  ship.addModule('engine',     new Vector2(2,0));
  ship.addConnection('pipe',  [new Vector2(0,0), new Vector2(1,0)]);
  ship.addConnection('cable',  [new Vector2(1,0), new Vector2(2,0)]);
  /*
  ship.addModule('fuelPlant',  new Vector2(0,0));
  ship.addModule('reactor',    new Vector2(1,0));
  ship.addModule('reactor',    new Vector2(1,1));
  ship.addConnection('pipe',  [new Vector2(0,0), new Vector2(1,0)]);
  ship.addConnection('pipe',  [new Vector2(0,1), new Vector2(1,1)]);
  ship.addConnection('pipe',  [new Vector2(0,0), new Vector2(0,1)]);
  ship.addConnection('cable', [new Vector2(1,0), new Vector2(2,0)]);
  ship.addConnection('cable', [new Vector2(1,1), new Vector2(2,1)]);
  ship.addModule('engine',     new Vector2(2,0));
  ship.addModule('engine',     new Vector2(2,1));
  */ 
  
  /*
  ship.addModule('fuelPlant',   new Vector2(0,0));
  ship.addModule('fuelPlant',   new Vector2(0,1));
  ship.addModule('reactor',     new Vector2(1,0));
  ship.addModule('reactor',     new Vector2(1,1));
  ship.addModule('lifeSupport', new Vector2(2,0));
  ship.addModule('lifeSupport', new Vector2(2,1));
  ship.addModule('lifeSupport', new Vector2(2,2));
  ship.addModule('vent',        new Vector2(3,0));
  ship.addModule('vent',        new Vector2(3,1));
  ship.addModule('vent',        new Vector2(3,2));
  
  ship.addConnection('pipe', [new Vector2(0,0), new Vector2(1,0)]); //n0
  ship.addConnection('pipe', [new Vector2(0,0), new Vector2(0,1)]);
  ship.addConnection('pipe', [new Vector2(0,1), new Vector2(1,1)]);
  ship.addConnection('cable', [new Vector2(1,0), new Vector2(2,0)]);
  ship.addConnection('cable', [new Vector2(1,1), new Vector2(2,1)]);
  ship.addConnection('cable', [new Vector2(2,1), new Vector2(2,2)]);
  ship.addConnection('duct', [new Vector2(2,0), new Vector2(3,0)]);
  ship.addConnection('duct', [new Vector2(3,0), new Vector2(3,1)]);
  ship.addConnection('duct', [new Vector2(2,1), new Vector2(3,1)]);
  ship.addConnection('duct', [new Vector2(2,2), new Vector2(3,2)]);
  */
}