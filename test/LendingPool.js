const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendingPool Testleri", function () {
    let MockA, mockA;
    let MockB, mockB;
    let PriceOracle, priceOracle;
    let InterestRateModel, interestRateModel;
    let LendingPool, lendingPool;
    let owner, user, stranger;

    beforeEach(async function () {
        [owner, user, stranger] = await ethers.getSigners();

        MockA = await ethers.getContractFactory("MockTokenA");
        mockA = await MockA.deploy();

        MockB = await ethers.getContractFactory("MockTokenB");
        mockB = await MockB.deploy();

        PriceOracle = await ethers.getContractFactory("PriceOracle");
        priceOracle = await PriceOracle.deploy();

        InterestRateModel = await ethers.getContractFactory("InterestRateModel");
        interestRateModel = await InterestRateModel.deploy();

        LendingPool = await ethers.getContractFactory("LendingPool");
        lendingPool = await LendingPool.deploy(
            mockA.target,
            mockB.target,
            priceOracle.target,
            interestRateModel.target
        );

       
        await mockA.mint(user.address, ethers.parseEther("1000"));
        await mockA.connect(user).approve(lendingPool.target, ethers.MaxUint256);
    });

    describe("deposit Testleri", function () {

        it("Desteklenmeyen token ile deposit yapilamamali", async function () {
            await expect(
                lendingPool.connect(user).deposit(stranger.address, ethers.parseEther("100"))
            ).to.be.revertedWith("Desteklenmeyen token");
        });

        it("Miktar sifir ise revert etmeli", async function () {
            await expect(
                lendingPool.connect(user).deposit(mockA.target, 0)
            ).to.be.revertedWith("Miktar sifir olamaz");
        });

        it("Dogru miktar deposit edilmeli ve mapping guncellenmeli", async function () {
            const amount = ethers.parseEther("100");

            await lendingPool.connect(user).deposit(mockA.target, amount);

            expect(await lendingPool.deposits(user.address, mockA.target)).to.equal(amount);
        });

        it("Token bakiyesi kullanicinin cuzdanindan cikmali", async function () {
            const amount = ethers.parseEther("100");
            const before = await mockA.balanceOf(user.address);

            await lendingPool.connect(user).deposit(mockA.target, amount);

            const after = await mockA.balanceOf(user.address);
            expect(before - after).to.equal(amount);
        });
    });

    describe("withdraw Testleri", function () {

        beforeEach(async function () {
            await lendingPool.connect(user).deposit(mockA.target, ethers.parseEther("500"));
        });

        it("Desteklenmeyen token ile withdraw yapilamamali", async function () {
            await expect(
                lendingPool.connect(user).withdraw(stranger.address, ethers.parseEther("100"))
            ).to.be.revertedWith("Desteklenmeyen token");
        });

        it("Miktar sifir ise revert etmeli", async function () {
            await expect(
                lendingPool.connect(user).withdraw(mockA.target, 0)
            ).to.be.revertedWith("Miktar sifir olamaz");
        });

        it("Yetersiz bakiye ile withdraw yapilamamali", async function () {
            await expect(
                lendingPool.connect(user).withdraw(mockA.target, ethers.parseEther("1000"))
            ).to.be.revertedWith("Yetersiz bakiye");
        });

        it("Dogru miktar withdraw edilmeli ve mapping guncellenmeli", async function () {
            const amount = ethers.parseEther("200");

            await lendingPool.connect(user).withdraw(mockA.target, amount);

            expect(await lendingPool.deposits(user.address, mockA.target)).to.equal(ethers.parseEther("300"));
        });

        it("Token bakiyesi kullaniciya geri donmeli", async function () {
            const amount = ethers.parseEther("200");
            const before = await mockA.balanceOf(user.address);

            await lendingPool.connect(user).withdraw(mockA.target, amount);

            const after = await mockA.balanceOf(user.address);
            expect(after - before).to.equal(amount);
        });
    });

        describe("depositCollateral Testleri", function () {

        it("Desteklenmeyen token ile teminat yatirilamamali", async function () {
            await expect(
                lendingPool.connect(user).depositCollateral(stranger.address, ethers.parseEther("100"))
            ).to.be.revertedWith("Desteklenmeyen token");
        });

        it("Miktar sifir ise revert etmeli", async function () {
            await expect(
                lendingPool.connect(user).depositCollateral(mockB.target, 0)
            ).to.be.revertedWith("Miktar sifir olamaz");
        });

        it("Dogru miktar teminat olarak kaydedilmeli", async function () {
            const amount = ethers.parseEther("100");

            await mockB.mint(user.address, amount);
            await mockB.connect(user).approve(lendingPool.target, ethers.MaxUint256);

            await lendingPool.connect(user).depositCollateral(mockB.target, amount);

            expect(await lendingPool.collateral(user.address, mockB.target)).to.equal(amount);
        });

        it("Token bakiyesi kullanicinin cuzdanindan cikmali", async function () {
            const amount = ethers.parseEther("100");

            await mockB.mint(user.address, amount);
            await mockB.connect(user).approve(lendingPool.target, ethers.MaxUint256);

            const before = await mockB.balanceOf(user.address);
            await lendingPool.connect(user).depositCollateral(mockB.target, amount);
            const after = await mockB.balanceOf(user.address);

            expect(before - after).to.equal(amount);
        });
    });

    describe("borrow Testleri", function () {

        beforeEach(async function () {
            await mockB.mint(user.address, ethers.parseEther("1000"));
            await mockB.connect(user).approve(lendingPool.target, ethers.MaxUint256);
            await lendingPool.connect(user).depositCollateral(mockB.target, ethers.parseEther("1000"));

            await priceOracle.setPrice(mockB.target, 1); 
            await mockA.mint(lendingPool.target, ethers.parseEther("10000"));
        });

        it("Desteklenmeyen teminat tokeni ile borc alinamamali", async function () {
            await expect(
                lendingPool.connect(user).borrow(stranger.address, mockA.target, ethers.parseEther("10"))
            ).to.be.revertedWith("Desteklenmeyen teminat tokeni");
        });

        it("Desteklenmeyen borc tokeni ile borc alinamamali", async function () {
            await expect(
                lendingPool.connect(user).borrow(mockB.target, stranger.address, ethers.parseEther("10"))
            ).to.be.revertedWith("Desteklenmeyen borc tokeni");
        });

        it("Miktar sifir ise revert etmeli", async function () {
            await expect(
                lendingPool.connect(user).borrow(mockB.target, mockA.target, 0)
            ).to.be.revertedWith("Miktar sifir olamaz");
        });

        it("LTV sinirini asan borc talebi revert etmeli", async function () {
            await expect(
                lendingPool.connect(user).borrow(mockB.target, mockA.target, ethers.parseEther("800"))
            ).to.be.revertedWith("LTV sinirini asiyor");
        });

        it("Gecerli borc talebinde debt dogru kaydedilmeli", async function () {
            const borrowAmount = ethers.parseEther("500");

            await lendingPool.connect(user).borrow(mockB.target, mockA.target, borrowAmount);

            expect(await lendingPool.debt(user.address, mockA.target)).to.equal(borrowAmount);
        });

        it("Borc alinan token kullaniciya gitmeli", async function () {
            const borrowAmount = ethers.parseEther("500");
            const before = await mockA.balanceOf(user.address);

            await lendingPool.connect(user).borrow(mockB.target, mockA.target, borrowAmount);

            const after = await mockA.balanceOf(user.address);
            expect(after - before).to.equal(borrowAmount);
        });
    });

        describe("repay Testleri", function () {

        beforeEach(async function () {
            await mockB.mint(user.address, ethers.parseEther("1000"));
            await mockB.connect(user).approve(lendingPool.target, ethers.MaxUint256);
            await lendingPool.connect(user).depositCollateral(mockB.target, ethers.parseEther("1000"));

            await priceOracle.setPrice(mockB.target, 1);

            await mockA.mint(lendingPool.target, ethers.parseEther("10000"));
            await lendingPool.connect(user).borrow(mockB.target, mockA.target, ethers.parseEther("500"));

            await mockA.mint(user.address, ethers.parseEther("100"));
            await mockA.connect(user).approve(lendingPool.target, ethers.MaxUint256);

            await interestRateModel.setInterestRate(5);
        });

        it("Borcu olmayan kullanici repay yapamamali", async function () {
            await expect(
                lendingPool.connect(stranger).repay(mockA.target)
            ).to.be.revertedWith("Borc bulunmuyor");
        });

        it("Repay sonrasi debt sifirlanmali", async function () {
            await lendingPool.connect(user).repay(mockA.target);

            expect(await lendingPool.debt(user.address, mockA.target)).to.equal(0);
        });

        it("Repay sonrasi token pool'a geri donmeli (en az anapara kadar)", async function () {
            const before = await mockA.balanceOf(lendingPool.target);

            await lendingPool.connect(user).repay(mockA.target);

            const after = await mockA.balanceOf(lendingPool.target);
            expect(after).to.be.above(before);
        });

        it("Zaman gectikce odenecek miktar artmali (faiz isliyor)", async function () {
            await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 30]); 
            await ethers.provider.send("evm_mine");

            const beforeBalance = await mockA.balanceOf(user.address);

            await lendingPool.connect(user).repay(mockA.target);

            const afterBalance = await mockA.balanceOf(user.address);
            const paid = beforeBalance - afterBalance;

            
            expect(paid).to.be.above(ethers.parseEther("500"));
        });
    });

    describe("liquidate Testleri", function () {

    beforeEach(async function () {
        await mockB.mint(user.address, ethers.parseEther("1000"));
        await mockB.connect(user).approve(lendingPool.target, ethers.MaxUint256);
        await lendingPool.connect(user).depositCollateral(mockB.target, ethers.parseEther("1000"));

        await priceOracle.setPrice(mockB.target, 100);   

        await mockA.mint(lendingPool.target, ethers.parseEther("50000"));
        await lendingPool.connect(user).borrow(mockB.target, mockA.target, ethers.parseEther("50000"));
        
        await mockA.mint(stranger.address, ethers.parseEther("60000"));
        await mockA.connect(stranger).approve(lendingPool.target, ethers.MaxUint256);
    });

    it("Saglikli pozisyon likide edilememeli", async function () {
        await expect(
            lendingPool.connect(stranger).liquidate(user.address, mockB.target, mockA.target)
        ).to.be.revertedWith("Pozisyon saglikli, likidasyon yapilamaz");
    });

    it("Fiyat dusunce pozisyon likide edilebilir hale gelmeli", async function () {
        await priceOracle.setPrice(mockB.target, 1);   

        await lendingPool.connect(stranger).liquidate(user.address, mockB.target, mockA.target);

        expect(await lendingPool.debt(user.address, mockA.target)).to.equal(0);
    });

    it("Likidasyon sonrasi teminat likidatore gecmeli", async function () {
        await priceOracle.setPrice(mockB.target, 1);

        const before = await mockB.balanceOf(stranger.address);
        await lendingPool.connect(stranger).liquidate(user.address, mockB.target, mockA.target);
        const after = await mockB.balanceOf(stranger.address);

        expect(after - before).to.equal(ethers.parseEther("1000"));
    });
      });
});