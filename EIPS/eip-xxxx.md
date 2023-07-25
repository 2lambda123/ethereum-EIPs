---
eip: xxxx
title: Flash Loans
author: Alberto Cuesta Cañada (@alcueca), (@ultrasecreth)
discussions-to: TBA
status: Draft
type: Standards Track
category: ERC
created: 2023-07-25
---

## Simple Summary

This ERC provides standard interfaces and processes for single-asset flash loans.

## Abstract

A flash loan is a smart contract transaction in which a lender smart contract lends assets to a borrower smart contract with the condition that the assets are returned, plus an optional fee, before the end of the transaction. This ERC specifies interfaces for lenders to accept flash loan requests, and for borrowers to take temporary control of the transaction within the lender execution. The process for the safe execution of flash loans is also specified.

## Motivation

Flash loans allow smart contracts to lend an amount of assets without a requirement for collateral, with the condition that they must be returned within the same transaction.

Early adopters of the flash loan pattern have produced different interfaces and different use patterns. The diversification is expected to intensify, and with it the technical debt required to integrate with diverse flash lending patterns.

Some of the high level differences in the approaches across the protocols include:
- Repayment approaches at the end of the transaction, where some pull the principal plus the fee from the loan receiver, and others where the loan receiver needs to manually return the principal and the fee to the lender.
- Some lenders offer the ability to repay the loan using a asset that is different to what was originally borrowed, which can reduce the overall complexity of the flash transaction and gas fees.
- Some lenders offer a single entry point into the protocol regardless of whether you're buying, selling, depositing or chaining them together as a flash loan, whereas other protocols offer discrete entry points.
- Some lenders allow to flash mint any amount of their native asset without charging a fee, effectively allowing flash loans bounded by computational constraints instead of asset ownership constraints.

## Specification

A flash loan integrates two smart contracts using a callback pattern. These are called the `lender` and the `callback receiver` in this EIP.

In the same flash loan, assets are transferred to the `loan receiver` before the callback and expected in the `payment receiver` at the end of the callback. An additional amount of assets, called a `fee`, MIGHT be also required to the present in the `payment receiver` at the end of the callback.

### Lender Specification

A `lender` MUST implement the IERCXXXXFlashLender interface.
```
// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;
import { IERC20 } from "./IERC20.sol";

interface IERC3156PPFlashLender {

    /// @dev The fee to be charged for a given loan.
    /// @param asset The loan currency.
    /// @param amount The amount of assets lent.
    /// @return The amount of `asset` to be charged for the loan, on top of the returned principal. Returns type(uint256).max if the loan is not possible.
    function flashFee(
        IERC20 asset,
        uint256 amount
    ) external view returns (uint256);

    /// @dev Use the aggregator to serve an ERC3156++ flash loan.
    /// @param loanReceiver The address receiving the assets in the flash loan
    /// @param asset The asset to be loaned
    /// @param amount The amount to loaned
    /// @param data The ABI encoded user data
    /// @param callback The address and signature of the callback function
    /// @return result ABI encoded result of the callback
    function flashLoan(
        address loanReceiver,
        IERC20 asset,
        uint256 amount,
        bytes calldata data,
        /// @dev callback. This is a concatenation of (address, bytes4), where the address is the callback receiver, and the bytes4 is the signature of callback function.
        /// @param initiator The address that called this function
        /// @param paymentReceiver The address that needs to receive the amount plus fee at the end of the callback
        /// @param asset The asset to be loaned
        /// @param amount The amount to loaned
        /// @param fee The fee to be paid
        /// @param data The ABI encoded data to be passed to the callback
        /// @return result ABI encoded result of the callback
        function(address, address, IERC20, uint256, uint256, bytes memory) external returns (bytes memory) callback
    ) external returns (bytes memory);
}
```

The `flashFee` function MUST return the fee charged for a loan of `amount` `asset`. If the asset is not supported `flashFee` MUST revert. If the lender doesn't have enough liquidity to loan `amount` the fee returned must be `type(uint256).max`.

The `flashLoan` function MUST execute the callback passed on as an argument.

```
bytes memory result = callback(msg.sender, address(this), asset, amount, _fee, data);
```

The `flashLoan` function MUST transfer `amount` of `asset` to `loan receiver` before executing the callback.

The `flashLoan` function MUST include `msg.sender` as the `initiator` in the callback.

The `flashLoan` function MUST NOT modify the `asset`, `amount` and `data` parameter received, and MUST pass them on to the callback.

The `flashLoan` function MUST include a `fee` argument in the callback with the fee to pay for the loan on top of the principal, ensuring that `fee == flashFee(asset, amount)`.

Before the end of the callback, the `asset` balance of `payment receiver` MUST have increased by `amount + fee` from the amount at the beginning of the callback, or revert if this is not true.

The return of the `flashLoan` function MUST be the same as the return from the callback.

### Receiver Specification

A `callback receiver` of flash loans MUST implement one or more external functions with the following arguments and return value:

```
/// @dev callback. This is a concatenation of (address, bytes4), where the address is the callback receiver, and the bytes4 is the signature of callback function.
/// @param initiator The address that called this function
/// @param paymentReceiver The address that needs to receive the amount plus fee at the end of the callback
/// @param asset The asset to be loaned
/// @param amount The amount to loaned
/// @param fee The fee to be paid
/// @param data The ABI encoded data to be passed to the callback
/// @return result ABI encoded result of the callback
function(address, address, IERC20, uint256, uint256, bytes memory) external returns (bytes memory) callback
```

## Rationale

The interfaces described in this ERC have been chosen as to cover the known flash lending use cases, while allowing for safe and gas efficient implementations.

`flashFee` reverts on unsupported assets, because returning a numerical value would be incorrect.

`flashFee` returns a value that is consistent with an impossible loan when the `lender` doesn't have enough liquidity to serve the loan.

`flashLoan` has been chosen as a function name as descriptive enough, unlikely to clash with other functions in the `lender`, and including both the use cases in which the assets lent are held or minted by the `lender`.

Existing flash lenders all provide flash loans of several asset types from the same contract. Providing a `asset` parameter in both the `flashLoan` and `onFlashLoan` functions matches closely the observed functionality.

A `bytes calldata data` parameter is included for the caller to pass arbitrary information to the `receiver`, without impacting the utility of the `flashLoan` standard.

A `initiator` will often be required in the callback function, which the `lender` knows as `msg.sender`. An alternative implementation which would embed the `initiator` in the `data` parameter by the caller would require an additional mechanism for the receiver to verify its accuracy, and is not advisable.

A `loanReceiver` is taken as a parameter to allow flexibility on the implementation of separate loan initiators, loan receivers, and callback receivers. This parameter is not passed on to the `callback receiver` on the grounds that it will be often the same as `callback receiver` and when not, it can be encoded in the `data` by the `initiator`.

A `payment receiver` allows for the same flexibility on repayments as in borrows. Control flow and asset flow are independent.

The `amount` will be required in the callback function, which the `lender` took as a parameter. An alternative implementation which would embed the `amount` in the `data` parameter by the caller would require an additional mechanism for the receiver to verify its accuracy, and is not advisable.

A `fee` will often be calculated in the callback function, which the callback receiver must be aware of for repayment. Passing the `fee` as a parameter instead of appended to `data` is simple and effective.

Arbitrary callback functions on callback receivers allows to implement different behaviours to flash loans on callback receivers without the need for encoding a function router using the `data` argument.

The `amount + fee` are pushed to the `payment receiver` to allow for the segregation of asset and control flows. While a "pull" architecture is more prevalent, "push" architectures are also common. For those cases where the `lender` can't implement a "push" architecture, a simple wrapper contract can offer an EIP-XXXX external interface, while using liquidity from the `lender` using a "pull" architecture.

## Backwards Compatibility

This EIP is a successor of EIP-3156. While not directly backwards compatible, a wrapper contract offering a EIP-XXXX external interface with liquidity obtained from an EIP-3156 flash `lender` is trivial to implement.

## Implementation

TBA


## Security Considerations


### Verification of callback arguments

The arguments of the flash loan callbacks are expected to reflect the conditions of the flash loan, but cannot be trusted unconditionally. They can be divided in two groups, that require different checks before they can be trusted to be genuine.

0. No arguments can be assumed to be genuine without some kind of verification. `initiator`, `asset` and `amount` refer to a past transaction that might not have happened if the caller of the callback decides to lie. `fee` might be false or calculated incorrectly. `data` might have been manipulated by the caller.
1. To trust that the value of `initiator`, `asset`, `amount` and `fee` are genuine a reasonable pattern is to verify that the callback caller is in a whitelist of verified flash lenders. Since often the caller of `flashLoan` will also be receiving the callback this will be trivial. In all other cases flash lenders will need to be approved if the arguments in the callback are to be trusted.
2. To trust that the value of `data` is genuine, in addition to the check in point 1, it is recommended to verify that the `initiator` belongs to a group of trusted addresses. Trusting the `lender` and the `initiator` is enough to trust that the contents of `data` are genuine.

### Flash lending security considerations

#### Automatic approvals
The safest approach is to implement an approval for `amount+fee` before the `flashLoan` is executed.    

Any `receiver` that repays the `amount` and `fee` received as arguments needs to include in the callback a mechanism to verify that the initiator and `lender` are trusted.

Alternatively, the callback receiver can implement permissioned functions that set state variables indicating that a flash loan has been initiated and what to expect as `amount` and `fee`.

Alternatively, the callback receiver can verify that `amount` was received by the `loanReceiver` and use its own heuristics to determine if a `fee` is fair and the loan repaid, or the transaction reverted.

### Flash minting external security considerations

The typical quantum of assets involved in flash mint transactions will give rise to new innovative attack vectors.

#### Example 1 - interest rate attack
If there exists a lending protocol that offers stable interests rates, but it does not have floor/ceiling rate limits and it does not rebalance the fixed rate based on flash-induced liquidity changes, then it could be susceptible to the following scenario:

FreeLoanAttack.sol
1. Flash mint 1 quintillion STAB
2. Deposit the 1 quintillion STAB + $1.5 million worth of ETH collateral
3. The quantum of your total deposit now pushes the stable interest rate down to 0.00001% stable interest rate
4. Borrow 1 million STAB on 0.00001% stable interest rate based on the 1.5M ETH collateral
5. Withdraw and burn the 1 quint STAB to close the original flash mint
6. You now have a 1 million STAB loan that is practically interest free for perpetuity ($0.10 / year in interest)

The key takeaway being the obvious need to implement a flat floor/ceiling rate limit and to rebalance the rate based on short term liquidity changes.

#### Example 2 - arithmetic overflow and underflow
If the flash mint provider does not place any limits on the amount of flash mintable assets in a transaction, then anyone can flash mint 2^256-1 amount of assets. 

The protocols on the receiving end of the flash mints will need to ensure their contracts can handle this, either by using a compiler that embeds overflow protection in the smart contract bytecode, or by setting explicit checks.

### Flash minting internal security considerations
    
The coupling of flash minting with business specific features in the same platform can easily lead to unintended consequences.

#### Example - Treasury draining
Assume a smart contract that flash lends its native asset. The same smart contract borrows from a third party when users burn the native asset. This pattern would be used to aggregate in the smart contract the collateralized debt of several users into a single account in the third party. The flash mint could be used to cause the `lender` to borrow to its limit, and then pushing interest rates in the underlying `lender`, liquidate the flash `lender`:
1. Flash mint from `lender` a very large amount of FOO.
2. Redeem FOO for BAR, causing `lender` to borrow from `underwriter` all the way to its borrowing limit.
3. Trigger a debt rate increase in `underwriter`, making `lender` undercollateralized.
4. Liquidate the `lender` for profit.

## Copyright
Copyright and related rights waived via [CC0](../LICENSE.md).