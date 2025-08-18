// app.js
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

let lastData = { USDBRL: 0, EURBRL: 0, BTCBRL: 0 };

// rota health check
app.get("/health", (req, res) => {
  res.status(200).send(`
    <div style="
      position: fixed;
      top: 10px;
      left: 10px;
      background: #10b981;
      color: white;
      font-weight: bold;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 1rem;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    ">🟢 OK</div>
  `);
});

app.get("/cotacoes", async (req, res) => {
  try {
    const url =
      "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL";
    const response = await fetch(url);
    const data = await response.json();

    const usd = parseFloat(data?.USDBRL?.bid || 0);
    const eur = parseFloat(data?.EURBRL?.bid || 0);
    const btc = parseFloat(data?.BTCBRL?.bid || 0);

    const result = {
      USD: { value: usd, diff: usd - lastData.USDBRL },
      EUR: { value: eur, diff: eur - lastData.EURBRL },
      BTC: { value: btc, diff: btc - lastData.BTCBRL },
    };

    lastData = { USDBRL: usd, EURBRL: eur, BTCBRL: btc };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao obter cotações." });
  }
});

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Cotações</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f3f4f6;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 50px;
          height: 100vh;
        }
        table {
          border-collapse: collapse;
          background: #fff;
          box-shadow: 0 6px 15px rgba(0,0,0,0.15);
          border-radius: 12px;
          overflow: hidden;
          width: 700px;
          height: 350px;
        }
        th, td {
          padding: 28px 36px;
          text-align: center;
        }
        th {
          background: #2563eb;
          color: #fff;
          font-size: 1.5rem;
        }
        tr:nth-child(even) {
          background: #f9fafb;
        }
        td {
          font-size: 1.3rem;
          color: #111827;
        }
        .up { color: green; }
        .down { color: red; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Moeda</th>
            <th>Valor (BRL)</th>
            <th>Variação</th>
          </tr>
        </thead>
        <tbody id="tabela">
          <tr><td>Dólar (USD)</td><td id="usd">-</td><td id="usd-diff">-</td></tr>
          <tr><td>Euro (EUR)</td><td id="eur">-</td><td id="eur-diff">-</td></tr>
          <tr><td>Bitcoin (BTC)</td><td id="btc">-</td><td id="btc-diff">-</td></tr>
        </tbody>
      </table>

      <script>
        const formatBRL = (num) => {
          return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
        }

        async function atualizar() {
          try {
            const res = await fetch('/cotacoes');
            const data = await res.json();

            ['usd','eur','btc'].forEach(moeda => {
              const valor = data[moeda.toUpperCase()].value;
              const diff = data[moeda.toUpperCase()].diff;

              document.getElementById(moeda).textContent = 'R$ ' + formatBRL(valor);

              const diffCell = document.getElementById(moeda + '-diff');
              if(diff > 0) diffCell.innerHTML = formatBRL(diff) + ' ↑', diffCell.className='up';
              else if(diff < 0) diffCell.innerHTML = formatBRL(diff) + ' ↓', diffCell.className='down';
              else diffCell.innerHTML = '0', diffCell.className='';
            });
          } catch (err) {
            console.error(err);
          }
        }

        atualizar();
        setInterval(atualizar, 30000); // atualiza a cada 30 segundos
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
