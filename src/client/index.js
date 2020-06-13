
import Space from '../shared/cell.mjs';
import ShipModule from '../shared/shipModule.mjs';
import V2 from '../shared/v2.mjs';
import io from 'socket.io-client';
import Ship from '../shared/ship.mjs';

const ship = new Ship(new V2(100, 100), 5, 5);

var socket = io();
socket = io.connect('http://localhost:3000');

const canvas = document.getElementById('canvas');
canvas.width = 500; canvas.height = 500;
const ctx = canvas.getContext('2d');
window.requestAnimationFrame(draw);

canvas.addEventListener('click', () => { 
  console.log('a');
}, false);

function draw() {
  ctx.fillStyle = 'rgb(51, 51, 51)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ship.draw(ctx);
  window.requestAnimationFrame(draw);
}
