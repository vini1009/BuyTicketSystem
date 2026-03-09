# Usa o Node versão 20 (versão leve)
FROM node:20-alpine

# Define a pasta de trabalho lá dentro
WORKDIR /app

# Copia os arquivos de dependência e instala
COPY package*.json ./
RUN npm install

# Copia o seu index.js
COPY . .

# Expõe a porta 3000
EXPOSE 3000

# Comando para iniciar
CMD ["node", "index.js"]