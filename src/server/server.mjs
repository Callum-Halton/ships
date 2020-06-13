
import Ship from '../shared/ship.mjs';
import V2 from '../shared/v2.mjs';
import socket from 'socket.io';
import express from 'express';

const ship = new Ship(new V2(100, 100), 5, 5);

const app = express();
const server = app.listen(3000);
app.use(express.static('public'));
console.log('running');

const io = socket(server);
io.sockets.on('connection', (socket) => {
	console.log(`new connection: ${socket.id}`);
});