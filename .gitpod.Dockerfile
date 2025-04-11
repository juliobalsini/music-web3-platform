FROM gitpod/workspace-full:latest

# Install Node.js
USER root
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Install Hardhat and other global packages
RUN npm install -g hardhat @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers@^5.7.2

# Install MetaMask and other browser extensions
RUN mkdir -p /home/gitpod/.config/google-chrome/Default/Extensions \
    && chown -R gitpod:gitpod /home/gitpod/.config

# Set up workspace
USER gitpod
WORKDIR /workspace

# Install project dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose ports
EXPOSE 3000 8545 