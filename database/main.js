const mongoose = require('mongoose');

async function connectToDB(url){
    await mongoose.connect(url, {
        dbName: "Challenge1_Backend",
    });
    console.log("Connected to the database");
}

module.exports = connectToDB;