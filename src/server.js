const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const http = require('http');
const WebSocket = require('ws');
const fileUpload = require("express-fileupload");

// Inicializar Express y servidor HTTP
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const connection = require('./conexion');
const { deleteAccount } = require('./controller/loginController');

// Importar rutas
const loginRoutes = require('./routes/login');
const imageRoutes = require('./routes/image');
const encuestasRoutes = require('./routes/encuestas');
const publicacionesRoutes = require('./routes/publicaciones');
const perfilRoutes = require('./routes/perfil');
const followRoutes = require('./routes/follow');
const likeRoutes = require("./routes/like");
const chatRoutes = require("./routes/chat");
const seguirRoutes = require("./routes/seguir");
const guardadoRoutes = require("./routes/elementoguardado");
const bloqueoRoutes = require('./routes/bloqueo');
const terminosRoutes = require('./routes/terminos');
const acercaRoutes = require('./routes/acerca');
const contactoRoutes = require('./routes/contacto');
const busquedaRoutes = require("./routes/busqueda");
const adminRoutes = require('./routes/admin');
const comentariosRoutes = require('./routes/comentarios');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    const rutasPublicas = ["/login", "/registro", "/assets", "/images", "/css", "/js", "/register"];
    if (rutasPublicas.some(ruta => req.path.startsWith(ruta))) return next();
    if (!req.session.userId) {
        console.log("No logueado, redirigiendo a /login");
        return res.redirect("/login");
    }
    next();
});

// Rutas estáticas
app.use('/assets', express.static(__dirname + '/assets'));

// Plantillas
app.set('view engine', 'ejs');
app.set('views', './src/views');

// Rutas principales
app.use("/", busquedaRoutes);
app.use("/", loginRoutes);
app.use("/", imageRoutes);
app.use("/", publicacionesRoutes);
app.use("/", perfilRoutes);
app.use("/", followRoutes);
app.use("/", likeRoutes);
app.use("/", seguirRoutes);
app.use("/", guardadoRoutes);
app.use("/", terminosRoutes);
app.use("/", acercaRoutes);
app.use("/", contactoRoutes);
app.use("/", adminRoutes);
app.use("/", bloqueoRoutes);
app.use("/", encuestasRoutes);
app.use("/", chatRoutes);
app.use("/", comentariosRoutes);

// Rutas específicas
app.get('/borrar', (req, res) => {
    console.log("Entrando a la vista borrar");
    if (req.session.userId) {
        res.render('borrar');
    } else {
        res.redirect('/index');
    }
});

app.post('/borrar', deleteAccount);

// Middleware de depuración
app.use((req, res, next) => {
    console.log("Sesión activa:", req.session);
    console.log("Usuario autenticado:", req.session.userId);
    next();
});

// WebSocket (mismo puerto que Express)
const connectedUsers = {};

wss.on('connection', (ws) => {
    console.log('Nuevo cliente conectado');

    ws.on('message', (message) => {
        try {
            const msgData = JSON.parse(message);
            const { emisorId, receptorId, contenido } = msgData;

            if (!emisorId || !receptorId || !contenido) {
                console.error('Datos inválidos:', msgData);
                return ws.send(JSON.stringify({ error: 'Datos inválidos' }));
            }

            const query = "INSERT INTO mensajes (emisor_id, receptor_id, mensaje) VALUES (?, ?, ?)";
            connection.query(query, [emisorId, receptorId, contenido], (err) => {
                if (err) {
                    console.error('Error al guardar mensaje en la base de datos:', err);
                    return ws.send(JSON.stringify({ error: 'Error al guardar el mensaje' }));
                }

                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            emisorId,
                            receptorId,
                            contenido,
                            timestamp: new Date().toISOString()
                        }));
                    }
                });
            });

        } catch (error) {
            console.error('Error al procesar el mensaje:', error);
            ws.send(JSON.stringify({ error: 'Error al procesar el mensaje' }));
        }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado');
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor Express + WebSocket en puerto ${PORT}`);
});
