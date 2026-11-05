// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MusicNFT.sol";

contract MusicMarketplace is ReentrancyGuard, Ownable {
    MusicNFT public musicNFT;

    // Struct to store listing information
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
    }

    // Mapping from token ID to listing
    mapping(uint256 => Listing) public listings;

    // Events
    event MusicListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event MusicUnlisted(
        uint256 indexed tokenId,
        address indexed seller
    );

    event MusicSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );

    constructor(address _musicNFTAddress) {
        musicNFT = MusicNFT(_musicNFTAddress);
    }

    // List a music NFT for sale
    function listMusicNFT(uint256 tokenId, uint256 price) public {
        require(musicNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than 0");
        require(!listings[tokenId].active, "Already listed");

        listings[tokenId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true
        });

        emit MusicListed(tokenId, msg.sender, price);
    }

    // Unlist a music NFT
    function unlistMusicNFT(uint256 tokenId) public {
        require(listings[tokenId].active, "Not listed");
        require(listings[tokenId].seller == msg.sender, "Not the seller");

        delete listings[tokenId];
        emit MusicUnlisted(tokenId, msg.sender);
    }

    // Purchase a listed music NFT
    function purchaseListedMusicNFT(uint256 tokenId) public payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.active, "Not listed");
        require(msg.value >= listing.price, "Insufficient payment");

        // Get music metadata for royalty calculation
        (,,,,,,uint256 originalPrice, address artistAddress, uint256 royaltyPercentage) = 
            musicNFT.getMusicMetadata(tokenId);

        // Calculate payments
        uint256 royaltyAmount = (listing.price * royaltyPercentage) / 100;
        uint256 sellerAmount = listing.price - royaltyAmount;

        // Transfer ownership
        musicNFT.transferFrom(listing.seller, msg.sender, tokenId);

        // Transfer payments
        (bool success1, ) = listing.seller.call{value: sellerAmount}("");
        (bool success2, ) = artistAddress.call{value: royaltyAmount}("");
        require(success1 && success2, "Transfer failed");

        // Remove listing
        delete listings[tokenId];

        emit MusicSold(tokenId, listing.seller, msg.sender, listing.price);
    }

    // Get listing details
    function getListing(uint256 tokenId) public view returns (
        uint256 _tokenId,
        address seller,
        uint256 price,
        bool active
    ) {
        Listing memory listing = listings[tokenId];
        return (
            listing.tokenId,
            listing.seller,
            listing.price,
            listing.active
        );
    }

    // Update listing price
    function updateListingPrice(uint256 tokenId, uint256 newPrice) public {
        require(listings[tokenId].active, "Not listed");
        require(listings[tokenId].seller == msg.sender, "Not the seller");
        require(newPrice > 0, "Price must be greater than 0");

        listings[tokenId].price = newPrice;
        emit MusicListed(tokenId, msg.sender, newPrice);
    }
} 