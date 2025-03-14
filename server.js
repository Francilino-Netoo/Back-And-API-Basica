require("dotenv").config();
const cors = require("cors");
const fileupload = require("express-fileupload");
const mongoose = require("mongoose");
const express = require("express");
const path = require("path");

const apiRoutes = require("./src/routes");

const server = express();

server.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(fileupload());
server.use(express.static(path.join(__dirname, "public")));
server.use("/", apiRoutes);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE, {
      retryWrites: true,
      w: "majority",
    });
    console.log("✅ Conectado ao MongoDB");
  } catch (error) {
    console.error("❌ Erro ao conectar ao MongoDB:", error.message);
    process.exit(1);
  }
};

connectDB();

mongoose.connection.on("error", (error) => {
  console.log("⚠️ Erro de conexão MongoDB:", error.message);
});

server.get("/ping", (req, res) => {
  res.json({ status: "API Online", port: process.env.PORT });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(
    `🚀 Servidor rodando em: ${process.env.BASE || `http://localhost:${PORT}`}`
  );
});
