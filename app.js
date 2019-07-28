const https = require('https');
const path = require('path');
const fs = require('fs');
const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const csrf = require('csurf');
const flash = require('connect-flash');
const helmet = require('helmet');
const compression = require('compression');
const User = require('./models/user');
const errorController = require('./controllers/error');

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-ppzsi.mongodb.net/${process.env.MONGO_DEFAULT_NAME}`;
const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions',
});
const fileStorage = multer.diskStorage({
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname);
    },
    destination: (req, file, cb) => {
        cb(null, 'images');
    }
});
const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/png'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const app = express();

const csrfProtection = csrf();

// const privatKey = fs.readFileSync(path.join(__dirname, 'server.key'));
// const certificate = fs.readFileSync(path.join(__dirname, 'server.cert'));

app.set('views', 'views');
app.set('view engine', 'ejs');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });


app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
    session({
        secret: 'my secret',
        resave: false,
        saveUninitialized: false,
        store: store
    })
);
app.use((req, res, next) => {
    if (req.url === "/create-order") {
        next();
    } else {
        csrfProtection(req, res, next);
    }
});
app.use(flash());

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req["csrfToken"] ? req.csrfToken() : "";
    next();
});

app.use((req, res, next) => {
    // throw new Error('Dummy Sync'); //Goes right into error-handling middleware. Without usage of next()
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
        .then(user => {
            if (!user) {
                return next();
            }
            req.user = user;
            next();
        })
        .catch(err => {
            throw new Error(err);
        });
});


app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use((error, req, res, next) => {
    console.log(error);
    res.status(500).render('500', {
        pageTitle: 'Error', path: '/500',
    });
});
// app.get('/500', errorController.get500);
app.use(errorController.get404);

mongoose.connect(MONGODB_URI, { useNewUrlParser: true })
    .then(user => {
        // const server = https.createServer({
        //     key: privatKey,
        //     cert: certificate
        // }, app)
        // server.listen(process.env.PORT || 3000)
        app.listen(process.env.PORT || 3000);
    })
    .catch(err => console.log(err));