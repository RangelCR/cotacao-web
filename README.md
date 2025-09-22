Este projeto demonstra um fluxo CI/CD completo usando GitHub Actions, Docker Hub e Kubernetes.
A aplicação consulta uma api publica de cotação de moedas e grava uma tabela web que exibe em tempo real os valores do Dólar, Euro e Bitcoin em Reais, atualizando a cada 30 segundos.
A pipeline automatiza:
🏗️ Build da imagem da aplicação.
📦 Push da imagem para o Docker Hub.
🚀 Deploy automatizado no cluster Kubernetes, aplicando os manifestos necessários.
Este projeto tem foco didático e foi criado para praticar integração contínua, entrega contínua e deploy em Kubernetes em um ambiente gerenciado.
