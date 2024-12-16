const http = require('http');
const axios = require('axios');
const path = require("path");
const fs = require('fs');
const express = require("express");
const bodyParser = require("body-parser"); /* To handle post parameters */

require("dotenv").config({ path: path.resolve(__dirname, './.env') })

const uri = process.env.MONGO_CONNECTION_STRING;

/* Our database and collection */
const databaseAndCollection = { db: "CMSC335DB", collection: "genderGuesser" };

/****** DO NOT MODIFY FROM THIS POINT ONE ******/
const { MongoClient, ServerApiVersion } = require('mongodb');

process.stdin.setEncoding("utf8");

// if (process.argv.length != 3) {
//     process.stdout.write(`Usage supermarketServer.js portNumber\n`);
//     process.exit(1);
// }

const portNumber = 5050;
const app = express();

app.listen(portNumber)
console.log(`Web server started and running at http://132.145.210.184/${portNumber}`);
const prompt = `Type stop to shutdown the server: `
process.stdout.write(prompt);
process.stdin.on("readable", function() {

    const dataInput = process.stdin.read();
    if (dataInput !== null) {
        const cmd = dataInput.trim();
        if (cmd == "stop") {
            process.stdout.write(`Shutting down the server\n`);
            process.exit(0);
        }
        else {
            process.stdout.write(`Invalid command: ${cmd}\n`);
        }
        process.stdout.write(prompt);
        process.stdin.resume();
    }
});


/* directory where templates will reside */
app.set("views", path.resolve(__dirname, "templates"));
app.use(express.static(path.join(__dirname, 'css')));

/* view/templating engine */
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (request, response) => {
    response.render("index");
});


app.get("/addName", (request, response) => {
    const variables = {
        port: portNumber
    }
    response.render("addName", variables);
});

app.post("/processName", async (req, res) => {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        let {name, country} = req.body;
        const response = await axios.get(`https://api.genderize.io?name=${name}&country_id=${country}`);
        let guess = response.data;

        let variables = {
            name: name, country: country
        }
        await insertApplication(client, databaseAndCollection, guess);
        res.render("processName", variables);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    async function insertApplication(client, databaseAndCollection, guess) {
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(guess);
    }

});


app.get("/reviewResults", (request, response) => {
    const variables = {
        port: portNumber
    }
    response.render("reviewResults", variables);
});

app.post("/processResults", async (req, res) => {

    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    let variables;
    try {
        await client.connect();

        let { country } = req.body;
        await lookUpEntry(client, databaseAndCollection, country);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    async function lookUpEntry(client, databaseAndCollection, country) {
        let filter = { country_id: country };
        const cursor = await client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .find(filter);
        let result = await cursor.toArray();
        if (result) {
            let table = "";
            result.forEach((entry) => {
                table += `<tr><td>${entry.name}</td><td>${entry.country_id}</td><td>${entry.gender}</td><td>${entry.count}</td><td>${entry.probability}</td></tr>`;
            });
            let variables = {
                table: table
            }
            res.render("processResults", variables);
        } else {
            console.log(`No applicant found with country ${country}`);
        }
    }

});

app.get("/clearNames", (request, response) => {
    const variables = {
        port: portNumber
    }
    response.render("clearNames", variables);
});

app.post("/processClearNames", async (req, res) => {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    try {
        await client.connect();
        const result = await client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .deleteMany({});
        let variables = { count: result.deletedCount };
        res.render("processClearNames", variables);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

