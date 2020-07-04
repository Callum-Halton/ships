
import { Ship, ShipState } from '../shared/ship.mjs';
import Vector2 from '../shared/vector2.mjs';
import socket from 'socket.io';
import express from 'express';

const ship = new Ship(new ShipState(new Vector2(100, 100), 6, 6));

const app = express();
const server = app.listen(8080);
app.use(express.static('public'));
console.log('running');

// go to https://socket.io/docs/emit-cheatsheet/ for info on sendin data via socket.io
const io = socket(server);

io.on('connection', socket => {
	console.log(`new connection: ${socket.id}`);
	socket.emit('goldenShip', ship.state);
	
	socket.on('addModule', data => {
		ship.addModule(data.moduleName, data.cellPos);
	    socket.broadcast.emit('addModule', data);
	});
	
	socket.on('deleteModule', cellPos => {
		ship.deleteModule(cellPos);
		socket.broadcast.emit('deleteModule', cellPos);
	});
	
	socket.on('addConnection', data => {
		ship.addConnection(data.networkType, data.cellPositions);
		socket.broadcast.emit('addConnection', data);
	});
	
	socket.on('deleteConnection', data => {
		ship.deleteConnection(data.networkType, data.cellPositions);
		socket.broadcast.emit('deleteConnection', data);
	});
	
});
