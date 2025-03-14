require("dotenv").config();
const cors = require("cors");
const fileupload = require("express-fileupload");
const mongoose = require("mongoose");
const express = require("express");
const path = require("path");

const apiRoutes = require("./src/routes");

// Conectar ao MongoDB
mongoose
  .connect(process.env.DATABASE, {
    retryWrites: true,
    w: "majority",
  })
  .then(() => console.log("✅ Conectado ao MongoDB"))
  .catch((error) => console.error("❌ Erro ao conectar ao MongoDB:", error));

mongoose.connection.on("error", (error) => {
  console.log("❌ Erro de conexão:", error.message);
});

const server = express();
server.use(cors());
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(fileupload());

server.use(express.static(path.join(__dirname, "public")));
server.use("/", apiRoutes);

server.get("/ping", (req, res) => {
  res.json({ status: "API Online", port: process.env.PORT });
});

// Inicia o servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(
    `🚀 Servidor rodando em: ${process.env.BASE || `http://localhost:${PORT}`}`
  );
});
