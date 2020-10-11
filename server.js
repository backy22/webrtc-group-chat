require('dotenv').config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);
const path = require('path');

let users = {};
let socketToRoom = {};
let socketToName = [];

io.on('connection', socket => {
    socket.on("join room", roomID => {
        if (users[roomID]) {
            const length = users[roomID].length;
            if (length > 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);

        socket.emit("all users", usersInThisRoom);
    });

    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    socket.on("sending msg", payload => {
        console.log('sending msg', payload, socket.id);
        io.emit('receiving msg', { senderID: payload.senderID, text: payload.text });
    });

    socket.on("set myname", payload => {
        socketToName.push({peerID: payload.senderID, name: payload.name})
        io.emit('receiving names', socketToName);
    });

    socket.on('hangup', socketId => {
        console.log('hangup')
        const roomID = socketToRoom[socketId];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socketId);
            users[roomID] = room;
        }
        socket.broadcast.emit('user left', socketId);
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
        socket.broadcast.emit('user left', socket.id);
    });

});

//server.listen(process.env.PORT || 8000, () => console.log('server is running on port 8000'));

if (process.env.PROD) {
    app.use(express.static(path.join(__dirname, './client/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, './client/build/index.html'));
    });
}
const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`server is running on port ${port}`));