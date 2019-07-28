const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let _db;

const mongoConnect = (callback) => {
    MongoClient.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-ppzsi.mongodb.net/${process.env.MONGO_DEFAULT_NAME}`)
        .then(client => {
            _db = client.db();
            callback();
        })
        .catch(err => {
            console.log(object);
            throw err;
        });
};

const getDB = () => {
    if (_db) {
        return _db;
    }
    throw "No DB Found!";
}

exports.mongoConnect = mongoConnect;
exports.getDB = getDB;
