const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
// Importamos las rutas
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
const connection = require('./conexion');
const { deleteAccount } = require('./controller/loginController');

const terminosRoutes = require('./routes/terminos');
const acercaRoutes = require('./routes/acerca');
const contactoRoutes = require('./routes/contacto');

const app = express();
const port = 3000;
const bloqueoRoutes = require('./routes/bloqueo');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'secret', // Cambia esta cadena secreta
    resave: false,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    const rutasPublicas = ["/login", "/registro", "/assets", "/images", "/css", "/js", "/register" ];

    if (rutasPublicas.some(ruta => req.path.startsWith(ruta))) {
        return next();
    }

    if (!req.session.userId) {
        console.log("No logueado, redirigiendo a /login");
        return res.redirect("/login");
    }

    next();
});


// Configuración para WebSocket
const WebSocket = require('ws'); // Importar WebSocket
const wss = new WebSocket.Server({ port: 8080 }); // Servidor WebSocket en puerto 8080

// Guardar los sockets de los usuarios conectados
const connectedUsers = {};

wss.on('connection', (ws, req) => {
    console.log('Nuevo cliente conectado');

    ws.on('message', (message) => {
        try {
            const msgData = JSON.parse(message);
            const { emisorId, receptorId, contenido } = msgData;

            if (!emisorId || !receptorId || !contenido) {
                console.error('Datos inválidos:', msgData);
                return ws.send(JSON.stringify({ error: 'Datos inválidos' }));
            }

            console.log('Mensaje recibido:', msgData);

            // Guardar mensaje en la base de datos
            const query = "INSERT INTO mensajes (emisor_id, receptor_id, mensaje) VALUES (?, ?, ?)";
            connection.query(query, [emisorId, receptorId, contenido], (err) => {
                if (err) {
                    console.error('Error al guardar mensaje en la base de datos:', err);
                    return ws.send(JSON.stringify({ error: 'Error al guardar el mensaje' }));
                }

                console.log('Mensaje guardado en la base de datos');

                // Enviar mensaje a ambos usuarios conectados
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

    // Manejar desconexión
    ws.on('close', () => {
        console.log('Cliente desconectado');
    });
});


const fileUpload = require("express-fileupload");
app.use(fileUpload()); // Este middleware debería ser lo primero para manejar archivos
// Ruta para cargar una imagen

// buscar usuarios
const busquedaRoutes = require("./routes/busqueda");
app.use("/", busquedaRoutes);

// Importar ruta de admin
const adminRoutes = require('./routes/admin');

// Configurar express para servir archivos estáticos desde la carpeta 'assets'
app.use('/assets', express.static(__dirname + '/assets'));

// Ruta para mostrar la página de borrar cuenta
app.get('/borrar', (req, res) => {
    console.log("Entrando a la vista borrar");
    if (req.session.userId) {
        res.render('borrar');
    } else {
        res.redirect('/index');
    }
});

// Ruta para borrar cuenta
app.post('/borrar', deleteAccount);

//plantillas
app.set('view engine', 'ejs');
app.set('views', './src/views');

// Routes
app.use('/', loginRoutes);
app.use('/', imageRoutes);
app.use('/', publicacionesRoutes);
app.use('/', perfilRoutes);
app.use('/', followRoutes);
app.use('/', likeRoutes);
app.use('/', seguirRoutes);
app.use('/', guardadoRoutes);
app.use('/', terminosRoutes);
app.use('/', acercaRoutes);
app.use('/', contactoRoutes);
app.use('/', adminRoutes)
app.use('/', bloqueoRoutes);
app.use('/', encuestasRoutes);
app.use('/', chatRoutes);

app.use((req, res, next) => {
    console.log("Sesión activa:", req.session);
    console.log("Usuario autenticado:", req.session.userId);
    next();
});


const comentariosRoutes = require('./routes/comentarios'); // Importa la ruta de comentarios
app.use("/", comentariosRoutes); // Activa la ruta de comentarios

  
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});

