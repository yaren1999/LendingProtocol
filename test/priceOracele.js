const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("priceOracleTestleri", async function () {

    let MockA, mockA;
    let MockB, mockB;
    let PriceOracle, priceOracle;

    let owner, user, stranger;

    beforeEach(async function () {
        [owner, user, stranger] = await ethers.getSigners();

        MockA = await ethers.getContractFactory("MockTokenA");
        mockA = await MockA.deploy();

        MockB = await ethers.getContractFactory("MockTokenB");
        mockB = await MockB.deploy();

        PriceOracle = await ethers.getContractFactory("PriceOracle");
        priceOracle = await PriceOracle.deploy();
    });

    describe("setPrice Testleri", async function () {

        it("Gecersiz token adresi engellenmeli", async function () {
            await expect(
                priceOracle.setPrice(
                    ethers.ZeroAddress,
                    ethers.parseEther("100")
                )
            ).to.be.revertedWith("Gecersiz token adresi");
        });

        it("Owner olmayan fiyat belirleyememeli", async function(){
            await expect(
                priceOracle.connect(stranger).setPrice(mockA.target,
                     ethers.parseEther("100")
                )
            ).to.be.revertedWithCustomError(priceOracle, "OwnableUnauthorizedAccount");
        });

        it("Fiyat sifir ise engellenmeli", async function () {
            await expect(
                priceOracle.setPrice(mockA.target, 0)
            ).to.be.revertedWith("Fiyat sifir olamaz!");
        });

        it("MockTokenA adresi ve fiyati dogru kaydedilmeli", async function () {
            const oraclePrice = ethers.parseEther("50");

            await priceOracle.setPrice(mockA.target, oraclePrice);

            expect(
                await priceOracle.getPrice(mockA.target)
            ).to.equal(oraclePrice);
        });

        it("Mock B icin fiyat dogru kaydedilmeli", async function () {
           const oraclePrice = ethers.parseEther("75");

           await priceOracle.setPrice(mockB.target, oraclePrice);

           expect(
               await priceOracle.getPrice(mockB.target)
           ).to.equal(oraclePrice);
        });

        

    });

    describe("getPrice Testleri", async function () {

        it("Fiyat belirlenmemis token icin revert edilmeli", async function () {
            await expect(
                priceOracle.getPrice(mockA.target)
            ).to.be.revertedWith("Fiyat mevcut degil!");
        });

        it("Token ve fiyati dogru dondurulmeli", async function () {
            const price = ethers.parseEther("50");

            await priceOracle.setPrice(mockA.target, price);

            expect(
                await priceOracle.getPrice(mockA.target)
            ).to.equal(price);
        });

    });

});