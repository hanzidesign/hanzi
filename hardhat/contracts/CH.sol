// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";
import "operator-filter-registry/src/DefaultOperatorFilterer.sol";

contract CH is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, PullPayment, DefaultOperatorFilterer {
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _tokenIdCounter;

    string public baseTokenURI;

    constructor() ERC721("ChineseNFT", "CH") {
        baseTokenURI = "ipfs://";
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function safeMint(address recipient, string memory uri) public returns (uint256) {
        require(bytes(uri).length > 0, "CH: uri is not valid");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, uri);

        return tokenId;
    }

    function setApprovalForAll(
        address operator,
        bool approved
    ) public override(ERC721, IERC721) onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAll(operator, approved);
    }

    function approve(
        address operator,
        uint256 tokenId
    ) public override(ERC721, IERC721) onlyAllowedOperatorApproval(operator) {
        super.approve(operator, tokenId);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721, IERC721) onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721, IERC721) onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override(ERC721, IERC721) onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /// @dev Returns an URI for a given token ID
    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    /// @dev Sets the base token URI prefix
    function setBaseTokenURI(string memory _baseTokenURI) public onlyOwner {
        baseTokenURI = _baseTokenURI;
    }

    /// @dev Overridden in order to make it an onlyOwner function
    function withdrawPayments(address payable payee) public override onlyOwner {
        super.withdrawPayments(payee);
    }

    /// @dev Sets the token URI
    function setTokenURI(uint256[] memory tokenIds, string memory uri) public onlyOwner {
        for (uint i = 0; i < tokenIds.length; i++) {
            _setTokenURI(tokenIds[i], uri);
        }
    }

    /// @dev Burns invalid tokens
    function burnTokens(uint256[] memory tokenIds) public onlyOwner {
        for (uint i = 0; i < tokenIds.length; i++) {
            _burn(tokenIds[i]);
        }
    }
}
