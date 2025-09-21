// app.js
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Cache para armazenar dados anteriores
let previousData = {};
let currentData = {};

// Configuração das moedas
const currencyConfig = {
    'USDBRL': {
        name: 'Dólar Americano',
        symbol: 'USD',
        icon: 'usd-icon',
        prefix: 'US$'
    },
    'EURBRL': {
        name: 'Euro',
        symbol: 'EUR', 
        icon: 'eur-icon',
        prefix: '€'
    },
    'BTCBRL': {
        name: 'Bitcoin',
        symbol: 'BTC',
        icon: 'btc-icon',
        prefix: '₿'
    }
};

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness check (readiness probe)
app.get("/ready", async (req, res) => {
  try {
    // Testa se consegue acessar a API externa
    const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
      method: 'GET',
      timeout: 5000 // 5 segundos de timeout
    });
    
    if (!response.ok) {
      throw new Error(`API externa retornou status: ${response.status}`);
    }

    res.status(200).json({
      status: 'READY',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      externalAPI: 'OK'
    });
    
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      externalAPI: 'ERROR',
      error: error.message
    });
  }
});

// Função para buscar dados da API
async function fetchCurrencyData() {
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Armazenar dados anteriores
        previousData = { ...currentData };
        currentData = data;
        
        console.log('Cotações atualizadas:', new Date().toLocaleTimeString());
        return data;
    } catch (error) {
        console.error('Erro ao buscar cotações:', error.message);
        throw error;
    }
}

// API endpoint para obter cotações
app.get('/api/currencies', async (req, res) => {
    try {
        const data = await fetchCurrencyData();
        
        // Calcular variações
        const result = {};
        Object.keys(currencyConfig).forEach(code => {
            if (data[code]) {
                const current = parseFloat(data[code].bid);
                const previous = previousData[code] ? parseFloat(previousData[code].bid) : null;
                
                let variation = { value: 0, percentage: 0, type: 'neutral' };
                if (previous) {
                    const diff = current - previous;
                    const percentage = (diff / previous) * 100;
                    variation = {
                        value: diff,
                        percentage: percentage,
                        type: diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral'
                    };
                }
                
                result[code] = {
                    ...data[code],
                    config: currencyConfig[code],
                    variation: variation,
                    timestamp: new Date().toISOString()
                };
            }
        });
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cotações', message: error.message });
    }
});

// Rota principal
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel de Cotações</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
            padding: 20px;
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 300;
            margin-bottom: 10px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .last-update {
            opacity: 0.9;
            font-size: 0.9rem;
        }

        .dashboard {
            display: grid;
            gap: 20px;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        }

        .currency-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .currency-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 45px rgba(0,0,0,0.15);
        }

        .currency-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #00d4ff, #5b86e5);
        }

        .currency-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .currency-name {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .currency-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 14px;
        }

        .usd-icon { background: linear-gradient(45deg, #2E8B57, #32CD32); }
        .eur-icon { background: linear-gradient(45deg, #1E3A8A, #3B82F6); }
        .btc-icon { background: linear-gradient(45deg, #F59E0B, #F97316); }

        .currency-title {
            font-size: 1.3rem;
            font-weight: 600;
            color: #2d3748;
        }

        .currency-subtitle {
            font-size: 0.9rem;
            color: #718096;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10B981;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        .currency-data {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .data-section {
            text-align: center;
        }

        .data-label {
            font-size: 0.85rem;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            font-weight: 500;
        }

        .current-value {
            font-size: 1.8rem;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 5px;
        }

        .variation {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            font-size: 1rem;
            font-weight: 600;
            padding: 8px 16px;
            border-radius: 20px;
            transition: all 0.3s ease;
        }

        .variation.positive {
            background: rgba(16, 185, 129, 0.1);
            color: #059669;
        }

        .variation.negative {
            background: rgba(239, 68, 68, 0.1);
            color: #DC2626;
        }

        .variation.neutral {
            background: rgba(107, 114, 128, 0.1);
            color: #6B7280;
        }

        .arrow {
            font-size: 1.2rem;
        }

        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: #718096;
            font-style: italic;
        }

        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #E2E8F0;
            border-top: 2px solid #3B82F6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error {
            color: #DC2626;
            text-align: center;
            padding: 20px;
            background: rgba(239, 68, 68, 0.1);
            border-radius: 10px;
            border: 1px solid rgba(239, 68, 68, 0.2);
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .dashboard {
                grid-template-columns: 1fr;
            }
            
            .currency-card {
                padding: 20px;
            }
            
            .current-value {
                font-size: 1.5rem;
            }
        }

        .update-animation {
            animation: updateFlash 0.6s ease;
        }

        @keyframes updateFlash {
            0% { background: rgba(59, 130, 246, 0.1); }
            50% { background: rgba(59, 130, 246, 0.2); }
            100% { background: rgba(255, 255, 255, 0.95); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💱 Painel de Cotações</h1>
            <div class="last-update" id="lastUpdate">Carregando...</div>
        </div>

        <div class="dashboard" id="dashboard">
            <div class="loading">
                <div class="spinner"></div>
                Carregando cotações...
            </div>
        </div>
    </div>

    <script>
        let isFirstLoad = true;

        function formatCurrency(value, isBTC = false) {
            if (isBTC) {
                return new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(value);
            }
            
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            }).format(value);
        }

        function createCurrencyCard(code, data) {
            const config = data.config;
            const current = parseFloat(data.bid);
            const variation = data.variation;
            const isBTC = code === 'BTCBRL';
            
            const arrow = variation.type === 'positive' ? '↗' : 
                         variation.type === 'negative' ? '↘' : '→';
            
            const variationText = variation.type === 'neutral' ? 
                'Sem alteração' : 
                \`\${variation.value >= 0 ? '+' : ''}\${formatCurrency(variation.value, isBTC)} (\${variation.percentage >= 0 ? '+' : ''}\${variation.percentage.toFixed(2)}%)\`;

            return \`
                <div class="currency-card \${!isFirstLoad ? 'update-animation' : ''}" data-currency="\${code}">
                    <div class="currency-header">
                        <div class="currency-name">
                            <div class="currency-icon \${config.icon}">\${config.prefix}</div>
                            <div>
                                <div class="currency-title">\${config.name}</div>
                                <div class="currency-subtitle">\${config.symbol}/BRL</div>
                            </div>
                        </div>
                        <div class="status-dot"></div>
                    </div>
                    
                    <div class="currency-data">
                        <div class="data-section">
                            <div class="data-label">Valor Atual</div>
                            <div class="current-value">\${formatCurrency(current, isBTC)}</div>
                        </div>
                        
                        <div class="data-section">
                            <div class="data-label">Variação</div>
                            <div class="variation \${variation.type}">
                                <span class="arrow">\${arrow}</span>
                                <span>\${variationText}</span>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
        }

        function updateLastUpdateTime() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('pt-BR');
            const dateString = now.toLocaleDateString('pt-BR');
            document.getElementById('lastUpdate').textContent = \`Última atualização: \${dateString} às \${timeString}\`;
        }

        async function fetchCurrencyData() {
            try {
                const response = await fetch('/api/currencies');
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                const data = await response.json();
                
                const dashboard = document.getElementById('dashboard');
                const cards = Object.keys(data).map(code => {
                    return createCurrencyCard(code, data[code]);
                }).join('');
                
                dashboard.innerHTML = cards;
                updateLastUpdateTime();
                
                if (isFirstLoad) {
                    isFirstLoad = false;
                }
                
                console.log('Cotações atualizadas:', new Date().toLocaleTimeString());
                
            } catch (error) {
                console.error('Erro ao buscar cotações:', error);
                document.getElementById('dashboard').innerHTML = \`
                    <div class="error">
                        <h3>❌ Erro ao carregar cotações</h3>
                        <p>Não foi possível conectar com o servidor. Tentando novamente em 30 segundos...</p>
                        <p><small>Erro: \${error.message}</small></p>
                    </div>
                \`;
            }
        }

        // Initial load
        fetchCurrencyData();

        // Update every 30 seconds
        setInterval(fetchCurrencyData, 30000);

        // Add some visual feedback when the page loads
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Painel de Cotações iniciado - Atualizações a cada 30 segundos');
        });
    </script>
</body>
</html>
  `);
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Painel de Cotações disponível em http://localhost:${PORT}`);
    
    // Primeira busca de dados
    fetchCurrencyData().catch(console.error);
});

// Atualizar dados a cada 30 segundos
setInterval(() => {
    fetchCurrencyData().catch(console.error);
}, 30000);