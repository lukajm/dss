const {Client} = require('pg')
// Connection to database (postgreSQL)
const client = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "password123",
    database: "postgres"
})

module.exports = client;