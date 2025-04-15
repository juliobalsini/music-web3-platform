# Music Web3 Platform

A decentralized music platform built with React, Chakra UI, and Web3 technologies.

## Features

- Dark theme with orange accents
- Responsive design
- Web3 wallet integration
- Music playback
- NFT minting
- Featured artists and trending songs
- Playlist management

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MetaMask or other Web3 wallet

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/music-web3-platform.git
cd music-web3-platform
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory and add your environment variables:
```env
REACT_APP_INFURA_API_KEY=your_infura_api_key
REACT_APP_CONTRACT_ADDRESS=your_contract_address
```

4. Start the development server:
```bash
npm start
# or
yarn start
```

The application will be available at `http://localhost:3000`.

## Usage

1. Connect your Web3 wallet (MetaMask recommended)
2. Browse featured artists and trending songs
3. Play music tracks
4. Mint NFTs for your favorite songs
5. Create and manage playlists

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── styles/        # Global styles and theme
└── assets/        # Static assets (images, fonts)
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run lint` - Runs ESLint
- `npm run format` - Formats code with Prettier

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Chakra UI](https://chakra-ui.com/)
- [Web3-React](https://github.com/NoahZinsmeister/web3-react)
- [ethers.js](https://docs.ethers.io/) 