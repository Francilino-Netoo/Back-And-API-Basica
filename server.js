require("dotenv").config();
const cors = require("cors");
const fileupload = require("express-fileupload");
const mongoose = require("mongoose");
const express = require("express");

const apiRoutes = require("./src/routes");

mongoose.connect(process.env.DATABASE);

mongoose.Promise = global.Promise;
mongoose.connection.on("error", (error) => {
  console.log("Error: ", error.message);
});

const server = express();
server.use(cors());
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(fileupload());

server.use(express.static(__dirname + "/public"));
server.use("/", apiRoutes);

server.get("/ping", (req, res) => {
  res.json(process.env.PORT);
});

server.listen(process.env.PORT, () => {
  console.log(`- Rodando na porta: ${process.env.BASE}`);
});
