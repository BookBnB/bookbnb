const { expect, use } = require('chai');
const chaiAsPromiesd = require('chai-as-promised');
const bnChai = require('bn-chai');
const { expectRevert, BN } = require('openzeppelin-test-helpers');

const BnBooking = artifacts.require('BnBooking');

use(chaiAsPromiesd);
use(bnChai(BN));

const NOT_OWNER = 'caller is not the owner';

contract('GIVEN the contract is deployed', function ([owner, normalUser]) {
  before(async function () {
    this.bnBooking = await BnBooking.deployed();
  });
  describe('WHEN a normal user wants to change the fee receiver', function () {
    it('THEN the tx reverts', async function () {
      return expectRevert(this.bnBooking.setFeeReceiver(owner, { from: normalUser }), NOT_OWNER);
    });
  });
  describe('WHEN a normal user wants to change the fee rate ', function () {
    it('THEN the tx reverts', async function () {
      return expectRevert(this.bnBooking.setFeeRate('10000', { from: normalUser }), NOT_OWNER);
    });
  });
});

contract('GIVEN the contract has changed the receiver and the feeRate', function ([
  owner,
  normalUser,
  booker,
]) {
  before(async function () {
    this.bnBooking = await BnBooking.deployed();
    this.price = '100000000000000';
    await this.bnBooking.createRoom(this.price, { from: owner });
    await this.bnBooking.setFeeRate('1000000000000000000', { from: owner }); // 100%
    await this.bnBooking.setFeeReceiver(normalUser, { from: owner });
  });
  describe('WHEN a user books a room', function () {
    before(async function () {
      await this.bnBooking.intentBook(0, 1, 1, 2020, { from: booker, value: this.price });
      this.previousBalanceNormalUser = new BN(await web3.eth.getBalance(normalUser));
      this.previousBalanceOwner = new BN(await web3.eth.getBalance(owner));
      await this.bnBooking.accept(0, booker, 1, 1, 2020, { from: owner, gasPrice: 0 });
      this.afterBalanceNormalUser = new BN(await web3.eth.getBalance(normalUser));
      this.afterBalanceOwner = new BN(await web3.eth.getBalance(owner));
    });
    it('THEN the new receiver receives the new fee', async function () {
      return expect(this.afterBalanceNormalUser.sub(this.previousBalanceNormalUser)).to.eq.BN(
        this.price
      );
    });
    it('THEN the owner receives the rest', async function () {
      return expect(this.afterBalanceOwner.sub(this.previousBalanceOwner)).to.eq.BN(0);
    });
  });
});
