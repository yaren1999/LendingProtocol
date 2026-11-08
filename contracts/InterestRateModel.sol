// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract InterestRateModel is Ownable {

    uint256 public interestRate;   

    uint256 public constant SECONDS_PER_YEAR = 31536000;

    event InterestRateUpdated(uint256 rate);

    constructor() Ownable(msg.sender) {}

    function setInterestRate(uint256 rate) external onlyOwner {
        require(rate <= 100, "Oran yuzde yuzun ustunde olamaz");
        interestRate = rate;
        emit InterestRateUpdated(rate);
    }

    function getInterestRate() external view returns (uint256) {
        return interestRate;
    }

    function calculateTotalDebt(uint256 principal, uint256 timeElapsed) external view returns (uint256) {
        uint256 interest = (principal * interestRate * timeElapsed) / (100 * SECONDS_PER_YEAR);
        return principal + interest;
    }
}