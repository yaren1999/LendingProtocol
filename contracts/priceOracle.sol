// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PriceOracle is Ownable{

     constructor() Ownable(msg.sender) {}

  mapping (address => uint256) prices;
  event PriceUpdated(address indexed token , uint256 price);


  function setPrice (address token, uint256 price ) external onlyOwner {
    require(token != address(0),"Gecersiz token adresi");
    require(price > 0, "Fiyat sifir olamaz!");
    prices[token] = price;

    emit PriceUpdated(token,price);

  }


   function getPrice (address token) external view returns (uint256) {
     require(prices[token] > 0,"Fiyat mevcut degil!");
     return prices[token];

   }
}