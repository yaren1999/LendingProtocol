const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InterestRateModel Testleri", function () {

    let InterestRateModel, interestRateModel;
    let owner, stranger;

    beforeEach(async function () {
        [owner, user, stranger] = await ethers.getSigners();

        InterestRateModel = await ethers.getContractFactory("InterestRateModel");
        interestRateModel = await InterestRateModel.deploy();
    });

    function calculateExpectedDebt(principal, rate, timeElapsed, secondsPerYear) {
      const interest = (principal * BigInt(rate) * BigInt(timeElapsed)) / (100n * secondsPerYear);
      return principal + interest;
    }

    describe("setInterestRate Testleri", function () {

        it("Oran yuzde yuzun ustune cikarsa revert etmeli", async function () {
            await expect(
                interestRateModel.setInterestRate(101)
            ).to.be.revertedWith("Oran yuzde yuzun ustunde olamaz");
        });

        it("Owner olmayan oran belirleyemez", async function () {
            await expect(
                interestRateModel.connect(stranger).setInterestRate(5)
            ).to.be.revertedWithCustomError(interestRateModel, "OwnableUnauthorizedAccount");
        });

        it("Faiz orani dogru kaydedilmeli", async function () {
            await interestRateModel.setInterestRate(5);

            expect(await interestRateModel.getInterestRate()).to.equal(5);
        });
    });

    describe("getInterestRate Testleri", function () {

        it("Faiz orani dogru dondurulmeli", async function () {
            await interestRateModel.setInterestRate(7);

            expect(await interestRateModel.getInterestRate()).to.equal(7);
        });
    });

    describe("calculateTotalDebt Testleri", function () {
        
        it("Toplam borc dogru hesaplanmali",async function(){

            const rate = 5;
            await interestRateModel.setInterestRate(rate);

            const secondsPeryear = await interestRateModel.SECONDS_PER_YEAR();
            const principal = ethers.parseEther("100");
            const timeElapsed= 60 * 60 * 24 * 30;

            const expected = calculateExpectedDebt(
                principal,
                rate,
                timeElapsed,
                secondsPeryear
            );

           const actual = await interestRateModel.calculateTotalDebt(
              principal,
              timeElapsed
            );

            expect(actual).to.equal(expected);
        });

        it("timeElapsed sifir ise borc degismemeli", async function () {
            const rate = 5;
            await interestRateModel.setInterestRate(rate);

            const principal = ethers.parseEther("100");
            const timeElapsed = 0;   

            const actual = await interestRateModel.calculateTotalDebt(principal, timeElapsed);

            expect(actual).to.equal(principal);   
        });

        it("interestRate sifir ise borc degismemeli", async function () {
            const rate = 0;   
            await interestRateModel.setInterestRate(rate);

            const principal = ethers.parseEther("100");
            const timeElapsed = 60 * 60 * 24 * 30;

            const actual = await interestRateModel.calculateTotalDebt(principal, timeElapsed);

            expect(actual).to.equal(principal);   
        });
    });
});