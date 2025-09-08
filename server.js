const dotenv = require('dotenv');
dotenv.config({path:'./config.env'});

process.on('uncaughtException', (err) => {
    console.log(err.name, err.message);
    console.log('Unhandled exceptoin occurred! App is shutting down');
    process.exit(1)
})


const mongoose = require('mongoose')
const app = require('./app');


mongoose.connect(process.env.REMOTE_DB_CONN_STR, {
}).then(() => {
    console.log("Remote server connection has been established");
}).catch(err => {
    console.log(err.name, err.message);
    console.log('Unhandled rejection occurred! App is shutting down');
    process.exit(1)
})


const port = process.env.PORT || 3000
const server = app.listen(port, () => {
    console.log('The server has started!')
})


process.on('unhandledRejection', (err) => {
    console.log(err.name, err.message);
    console.log('Unhandled rejection occurred! App is shutting down');

    server.close(() => {
        process.exit(1)
    })
})