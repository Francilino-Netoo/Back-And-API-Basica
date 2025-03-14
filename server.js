require("dotenv").config();
const cors = require("cors");
const fileupload = require("express-fileupload");
const mongoose = require("mongoose");
const express = require("express");

const apiRoutes = require("./src/routes");

// Conectar ao MongoDB com opções adicionais
mongoose
  .connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: "majority",
  })
  .then(() => console.log("✅ Conectado ao MongoDB"))
  .catch((error) => console.error("❌ Erro ao conectar ao MongoDB:", error));

mongoose.Promise = global.Promise;
mongoose.connection.on("error", (error) => {
  console.log("❌ Erro de conexão:", error.message);
});

const server = express();
server.use(cors());
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(fileupload());

server.use(express.static(__dirname + "/public"));
server.use("/", apiRoutes);

server.get("/ping", (req, res) => {
  res.json({ status: "API Online", port: process.env.PORT });
});

// Verifica se a porta está definida antes de iniciar o servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(
    `🚀 Servidor rodando em: ${process.env.BASE || `http://localhost:${PORT}`}`
  );
});
