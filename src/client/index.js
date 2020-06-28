
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
socket.on('deleteConnection', data => ship.deleteConnection(data.networkType, data.cellPositions));

const actionOptions = document.getElementById('actionOptions');
const partOptions = document.getElementById('partOptions');
let lastClickCellPos = null;
const networkTypes = ['pipe', 'cable'];

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
    default: // debug
      console.log(ship.getCell(cellPos).networks.cable.dirs);
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
  
  let data = {
    moduleName: partOptions.value,
    cellPos: cellPos
  };
  
  if (isAdd) { 
    let valid = ship.addModule(data.moduleName, data.cellPos);
    if (valid) { socket.emit('addModule', data); }
  } else {
    let valid = ship.deleteModule( data.cellPos );
    if (valid) { socket.emit('deleteModule', data); } 
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
