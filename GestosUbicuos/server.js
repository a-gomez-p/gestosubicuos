const express = require('express');
const admin = require('firebase-admin');
const http = require('http');
const socketIo = require('socket.io');
const { exec } = require('child_process');

// Inicializar Firebase Admin
const serviceAccount = require('./firebase-credentials.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tu-proyecto.firebaseio.com'
});

const db = admin.database();
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir archivos estáticos
app.use(express.static('public'));

// Punto de entrada principal
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// API para recibir mensajes directamente
app.get('/mensaje', (req, res) => {
  const mensaje = req.query.texto || 'Mensaje vacío';
  io.emit('nuevoMensaje', mensaje);
  
  // También guardamos en Firebase
  db.ref('messages').push({
    text: mensaje,
    timestamp: admin.database.ServerValue.TIMESTAMP
  });
  
  res.send('Mensaje enviado: ' + mensaje);
});

// Escuchar cambios en Firebase para la lámpara
db.ref('commands/lamp').on('value', (snapshot) => {
  const lampState = snapshot.val();
  console.log('Estado de lámpara: ' + (lampState ? 'ENCENDIDA' : 'APAGADA'));
  
  // Aquí controlamos la lámpara
  if (lampState) {
    // Código para encender la lámpara
    // Si usas una bombilla inteligente, aquí irían las llamadas a su API
    console.log('Encendiendo lámpara...');
    // Por ejemplo, con un script de control de bombillas Philips Hue:
    // exec('python3 control_hue.py on', (error, stdout, stderr) => {...});
  } else {
    // Código para apagar la lámpara
    console.log('Apagando lámpara...');
    // exec('python3 control_hue.py off', (error, stdout, stderr) => {...});
  }
});

// Escuchar cambios en mensajes
db.ref('messages').limitToLast(1).on('child_added', (snapshot) => {
  const message = snapshot.val();
  console.log('Nuevo mensaje: ' + message.text);
  
  // Emitir el mensaje a todos los clientes conectados
  io.emit('nuevoMensaje', message.text);
});

// Websockets para comunicación en tiempo real con el navegador
io.on('connection', (socket) => {
  console.log('Cliente conectado');
  
  // Enviar último mensaje cuando un cliente se conecta
  db.ref('messages').limitToLast(1).once('value', (snapshot) => {
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      socket.emit('nuevoMensaje', message.text);
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});