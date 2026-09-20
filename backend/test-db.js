const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'admin',
  password: 'admin',
  database: 'assessments',
});

client.connect()
  .then(() => {
    console.log('✅ Conectado correctamente');
    return client.end();
  })
  .catch(err => {
    console.error('❌ Error de conexión:', err.message);
  });