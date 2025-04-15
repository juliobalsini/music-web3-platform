import { Box, Container, Heading, VStack } from "@chakra-ui/react"; import { WalletConnect } from "../components/web3/WalletConnect"; import { Player } from "../components/player/Player"; export default function Home() { return ( <Container maxW="container.xl" py={8}><VStack spacing={8}><Heading>RadiOOn</Heading><WalletConnect /><Player /></VStack></Container> ); }
