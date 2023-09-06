// SPDX-License-Identifier: CC0-1.0

pragma solidity 0.8.9;

import { IERC7432 } from "./interfaces/IERC7432.sol";

contract ERC7432 is IERC7432 {
    
    // grantor => grantee => tokenAddress => tokenId => role => struct(expirationDate, data)
    mapping(address => mapping(address => mapping(address => mapping(uint256 => mapping(bytes32 => RoleData)))))
        public roleAssignments;

    // grantor => tokenAddress => tokenId => role => grantee
    mapping(address => mapping(address => mapping(uint256 => mapping(bytes32 => address)))) public lastRoleAssignment;

    modifier validExpirationDate(uint64 _expirationDate) {
        require(_expirationDate > block.timestamp, "ERC7432: expiration date must be in the future");
        _;
    }

    function grantRole(
        bytes32 _role,
        address _tokenAddress,
        uint256 _tokenId,
        address _grantee,
        uint64 _expirationDate,
        bytes calldata _data
    ) external validExpirationDate(_expirationDate) {
        roleAssignments[msg.sender][_grantee][_tokenAddress][_tokenId][_role] = RoleData(_expirationDate, _data);
        lastRoleAssignment[msg.sender][_tokenAddress][_tokenId][_role] = _grantee;
        emit RoleGranted(_role, _tokenAddress, _tokenId, _grantee, _expirationDate, _data);
    }

    function revokeRole(bytes32 _role, address _tokenAddress, uint256 _tokenId, address _grantee) external {
        delete roleAssignments[msg.sender][_grantee][_tokenAddress][_tokenId][_role];
        delete lastRoleAssignment[msg.sender][_tokenAddress][_tokenId][_role];
        emit RoleRevoked(_role, _tokenAddress, _tokenId, _grantee);
    }

    function hasRole(
        bytes32 _role,
        address _tokenAddress,
        uint256 _tokenId,
        address _grantor,
        address _grantee
    ) external view returns (bool) {
        return roleAssignments[_grantor][_grantee][_tokenAddress][_tokenId][_role].expirationDate > block.timestamp;
    }

    function hasUniqueRole(
        bytes32 _role,
        address _tokenAddress,
        uint256 _tokenId,
        address _grantor,
        address _grantee
    ) external view returns (bool) {
        bool isValid = roleAssignments[_grantor][_grantee][_tokenAddress][_tokenId][_role].expirationDate >
            block.timestamp;

        return isValid && lastRoleAssignment[_grantor][_tokenAddress][_tokenId][_role] == _grantee;
    }

    function roleData(
        bytes32 _role,
        address _tokenAddress,
        uint256 _tokenId,
        address _grantor,
        address _grantee
    ) external view returns (bytes memory data_) {
        RoleData memory _roleData = roleAssignments[_grantor][_grantee][_tokenAddress][_tokenId][_role];
        return (_roleData.data);
    }

     function roleExpirationDate(
        bytes32 _role,
        address _tokenAddress,
        uint256 _tokenId,
        address _grantor,
        address _grantee
    ) external view returns (uint64 expirationDate_){
        RoleData memory _roleData = roleAssignments[_grantor][_grantee][_tokenAddress][_tokenId][_role];
        return (_roleData.expirationDate);
    }

    function supportsInterface(bytes4 interfaceId) external view virtual override returns (bool) {
        return interfaceId == type(IERC7432).interfaceId;
    }

    function grantRoleFrom(
        bytes32 _role,
        address _tokenAddress,
        uint256 _tokenId,
        address _grantor,
        address _grantee,
        uint64 _expirationDate,
        bytes calldata _data
    ) external override validExpirationDate(_expirationDate) {
        require(tokenApprovals[_grantor][_tokenAddress][_tokenId][msg.sender] || operatorApprovals[_grantor][_tokenAddress][msg.sender], "RolesRegistry: sender must be approved");

        roleAssignments[_grantor][_grantee][_tokenAddress][_tokenId][_role] = RoleData(_expirationDate, _data);
        lastRoleAssignment[_grantor][_tokenAddress][_tokenId][_role] = _grantee;
        emit RoleGranted(_grantor, _role, _tokenAddress, _tokenId, _grantee, _expirationDate, _data); // TODO: We should change event to receive grantor as parameter
    }

    function revokeRoleFrom(
        bytes32 _role,
        address _tokenAddress,
        uint256 _tokenId,
        address _grantor,
        address _grantee
    ) external override {
        require(tokenApprovals[_grantor][_tokenAddress][_tokenId][msg.sender] || operatorApprovals[_grantor][_tokenAddress][msg.sender], "RolesRegistry: sender must be approved");
        
        delete roleAssignments[_grantor][_grantee][_tokenAddress][_tokenId][_role];
        delete lastRoleAssignment[_grantor][_tokenAddress][_tokenId][_role];
        emit RoleRevoked(_grantor, _role, _tokenAddress, _tokenId, _grantee); // TODO: We should change event to receive grantor as parameter
    }

    function setRoleApprovalForAll(
        address _operator,
        address _tokenAddress,
        bool _isApproved
    ) external override {
        operatorApprovals[msg.sender][_tokenAddress][_operator] = _isApproved;
        emit RoleApprovalForAll(msg.sender, _tokenAddress, _operator, _isApproved);
    }

    function approveRole(
        address _tokenAddress,
        uint256 _tokenId,
        address _operator,
        bool _approved
    ) external override {
        tokenApprovals[msg.sender][_tokenAddress][_tokenId][_operator] = _approved;
        emit RoleApproval(msg.sender, _tokenAddress, _tokenId, _operator, _approved);
    }

    function getApprovedRole(
        address _grantor,
        address _tokenAddress,
        uint256 _tokenId,
        address _operator
    ) external view override returns (bool) {
        return tokenApprovals[_grantor][_tokenAddress][_tokenId][_operator];
    }

    function isRoleApprovedForAll(
        address _grantor,
        address _operator,
        address _tokenAddress
    ) external view override returns (bool) {
        return operatorApprovals[_grantor][_tokenAddress][_operator];
    }
}
