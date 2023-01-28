// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.0;

import "./ERC6150.sol";
import "./interfaces/IERC6150Enumerable.sol";

abstract contract ERC6150Enumerable is ERC6150, IERC6150Enumerable {
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(IERC165, ERC6150) returns (bool) {
        return
            interfaceId == type(IERC6150Enumerable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function childrenCountOf(
        uint256 parentId
    ) external view virtual override returns (uint256) {
        return childrenOf(parentId).length;
    }

    function childOfParentByIndex(
        uint256 parentId,
        uint256 index
    ) external view virtual override returns (uint256) {
        uint256[] memory children = childrenOf(parentId);
        return children[index];
    }

    function indexInChildrenEnumeration(
        uint256 parentId,
        uint256 tokenId
    ) external view virtual override returns (uint256) {
        require(parentOf(tokenId) == parentId, "wrong parent");
        return _getIndexInChildrenArray(tokenId);
    }
}
