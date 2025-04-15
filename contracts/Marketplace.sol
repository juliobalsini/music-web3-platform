// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MusicNFT.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    struct Listing {
        uint256 price;
        address seller;
        bool active;
    }

    MusicNFT public musicNFT;
    uint256 public platformFee; // in basis points (1% = 100)
    address public platformFeeRecipient;

    mapping(uint256 => Listing) public listings;
    mapping(address => uint256) public artistRoyalties;

    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    event PlatformFeeUpdated(uint256 newFee);
    event PlatformFeeRecipientUpdated(address newRecipient);

    constructor(address _musicNFT) Ownable(msg.sender) {
        musicNFT = MusicNFT(_musicNFT);
        platformFee = 250; // 2.5%
        platformFeeRecipient = msg.sender;
    }

    function listNFT(uint256 tokenId, uint256 price) external {
        require(musicNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than 0");
        require(!listings[tokenId].active, "Already listed");

        listings[tokenId] = Listing({
            price: price,
            seller: msg.sender,
            active: true
        });

        emit NFTListed(tokenId, msg.sender, price);
    }

    function buyNFT(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.active, "Not for sale");
        require(msg.value >= listing.price, "Insufficient payment");

        uint256 platformFeeAmount = (listing.price * platformFee) / 10000;
        uint256 sellerAmount = listing.price - platformFeeAmount;

        // Transfer NFT
        musicNFT.transferFrom(listing.seller, msg.sender, tokenId);

        // Transfer payments
        (bool success1, ) = listing.seller.call{value: sellerAmount}("");
        (bool success2, ) = platformFeeRecipient.call{value: platformFeeAmount}("");
        require(success1 && success2, "Transfer failed");

        // Update listing
        listings[tokenId].active = false;

        emit NFTSold(tokenId, listing.seller, msg.sender, listing.price);
    }

    function cancelListing(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not the seller");
        require(listings[tokenId].active, "Not listed");

        listings[tokenId].active = false;
        emit ListingCancelled(tokenId, msg.sender);
    }

    function setPlatformFee(uint256 _platformFee) external onlyOwner {
        require(_platformFee <= 1000, "Fee too high"); // Max 10%
        platformFee = _platformFee;
        emit PlatformFeeUpdated(_platformFee);
    }

    function setPlatformFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid address");
        platformFeeRecipient = _recipient;
        emit PlatformFeeRecipientUpdated(_recipient);
    }

    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return listings[tokenId];
    }
} 