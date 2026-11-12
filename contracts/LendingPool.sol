// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PriceOracle.sol";
import "./InterestRateModel.sol";

contract LendingPool {

    IERC20 public tokenA;
    IERC20 public tokenB;

    uint256 public constant LTV = 70;

    PriceOracle public priceOracle;
    InterestRateModel public interestRateModel;

    mapping(address => mapping(address => uint256)) public deposits;
    mapping(address => mapping(address => uint256)) public collateral;
    mapping(address => mapping(address => uint256)) public debt;
    mapping(address => mapping(address => uint256)) public borrowTimestamp;

    constructor(address _tokenA, address _tokenB, address _priceOracle, address _interestRateModel) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
        priceOracle = PriceOracle(_priceOracle);
        interestRateModel = InterestRateModel(_interestRateModel);
    }

    function deposit(address _token, uint256 _amount) external {
        require(_token == address(tokenA) || _token == address(tokenB), "Desteklenmeyen token");
        require(_amount > 0, "Miktar sifir olamaz");

        deposits[msg.sender][_token] += _amount;

        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
    }

    function withdraw(address _token, uint256 _amount) external {
        require(_token == address(tokenA) || _token == address(tokenB), "Desteklenmeyen token");
        require(_amount > 0, "Miktar sifir olamaz");
        require(deposits[msg.sender][_token] >= _amount, "Yetersiz bakiye");

        deposits[msg.sender][_token] -= _amount;

        IERC20(_token).transfer(msg.sender, _amount);
    }

    function depositCollateral(address _token, uint256 _amount) external {
        require(_token == address(tokenA) || _token == address(tokenB), "Desteklenmeyen token");
        require(_amount > 0, "Miktar sifir olamaz");

        collateral[msg.sender][_token] += _amount;

        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
    }

    function borrow(address _collateralToken, address _borrowToken, uint256 _amount) external returns (uint256) {
        require(_collateralToken == address(tokenA) || _collateralToken == address(tokenB), "Desteklenmeyen teminat tokeni");
        require(_borrowToken == address(tokenA) || _borrowToken == address(tokenB), "Desteklenmeyen borc tokeni");
        require(_amount > 0, "Miktar sifir olamaz");

        uint256 collateralAmount = collateral[msg.sender][_collateralToken];
        uint256 price = priceOracle.getPrice(_collateralToken);
        uint256 collateralValue = collateralAmount * price;

        uint256 maxBorrow = (collateralValue * LTV) / 100;
        require(_amount <= maxBorrow, "LTV sinirini asiyor");

        debt[msg.sender][_borrowToken] += _amount;
        borrowTimestamp[msg.sender][_borrowToken] = block.timestamp;

        IERC20(_borrowToken).transfer(msg.sender, _amount);

        return _amount;
    }

    function repay(address _token) external {
        uint256 principal = debt[msg.sender][_token];
        require(principal > 0, "Borc bulunmuyor");

        uint256 timeElapsed = block.timestamp - borrowTimestamp[msg.sender][_token];
        uint256 totalDebt = interestRateModel.calculateTotalDebt(principal, timeElapsed);

        debt[msg.sender][_token] = 0;

        IERC20(_token).transferFrom(msg.sender, address(this), totalDebt);
    }

    function getHealthFactor(address _user, address _collateralToken, address _debtToken) public view returns (uint256) {
        uint256 collateralAmount = collateral[_user][_collateralToken];
        uint256 price = priceOracle.getPrice(_collateralToken);
        uint256 collateralValue = collateralAmount * price;

        uint256 debtAmount = debt[_user][_debtToken];
        if (debtAmount == 0) {
            return type(uint256).max;   
        }

        uint256 adjustedCollateral = (collateralValue * LTV) / 100;

        return (adjustedCollateral * 1e18) / debtAmount;   
    }

    function liquidate(address _user, address _collateralToken, address _debtToken) external {
        uint256 healthFactor = getHealthFactor(_user, _collateralToken, _debtToken);
        require(healthFactor < 1e18, "Pozisyon saglikli, likidasyon yapilamaz");

        uint256 userDebt = debt[_user][_debtToken];
        require(userDebt > 0, "Borc bulunmuyor");

        uint256 userCollateral = collateral[_user][_collateralToken];

        debt[_user][_debtToken] = 0;
        collateral[_user][_collateralToken] = 0;

        IERC20(_debtToken).transferFrom(msg.sender, address(this), userDebt);
        IERC20(_collateralToken).transfer(msg.sender, userCollateral);
    }
}