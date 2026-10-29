import { connectDatabase, db, mongoClient } from "../server/db";
try {
  await connectDatabase();
  console.log(`MongoDB conectado. Banco: ${db.databaseName}. Índices verificados.`);
} catch {
  console.error("Falha ao conectar ao MongoDB. Verifique MONGODB_URI, credenciais e a lista de IPs permitidos no Atlas.");
  process.exitCode = 1;
} finally {
  await mongoClient.close();
}
