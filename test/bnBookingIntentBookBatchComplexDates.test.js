const { expect, use } = require('chai');
const chaiAsPromiesd = require('chai-as-promised');
const bnChai = require('bn-chai');
const { expectEvent, BN } = require('openzeppelin-test-helpers');

const BnBooking = artifacts.require('BnBooking');

use(chaiAsPromiesd);
use(bnChai(BN));

contract('GIVEN someone created a room', function ([, roomOwner, booker]) {
  before(async function () {
    this.price = new BN('10000000000000000');
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN someone tries to book in batch through new year', function () {
    before(async function () {
      this.tx = await this.bnBooking.intentBookingBatch(0, 30, 12, 2020, 2, 1, 2021, {
        from: booker,
        value: this.price.mul(new BN(4)),
      });
    });
    it('THEN the correct events were emitted', async function () {
      expect(this.tx.receipt.logs.length).to.be.equal(4);
      await expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(30),
        month: new BN(12),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
      await expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(31),
        month: new BN(12),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
      await expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(1),
        month: new BN(1),
        year: new BN(2021),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
      return expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(2),
        month: new BN(1),
        year: new BN(2021),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, booker]) {
  before(async function () {
    this.price = new BN('10000000000000000');
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN someone tries to book in batch through a leap day', function () {
    before(async function () {
      this.tx = await this.bnBooking.intentBookingBatch(0, 28, 2, 2020, 2, 3, 2020, {
        from: booker,
        value: this.price.mul(new BN(4)),
      });
    });
    it('THEN the correct events were emitted', async function () {
      expect(this.tx.receipt.logs.length).to.be.equal(4);
      await expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(28),
        month: new BN(2),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
      await expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(29),
        month: new BN(2),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
      await expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(1),
        month: new BN(3),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
      return expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(2),
        month: new BN(3),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, booker]) {
  before(async function () {
    this.price = new BN('10000000000000000');
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN someone tries to book in batch through the end of a month', function () {
    before(async function () {
      this.tx = await this.bnBooking.intentBookingBatch(0, 28, 3, 2020, 2, 4, 2020, {
        from: booker,
        value: this.price.mul(new BN(6)),
      });
    });
    it('THEN the correct events were emitted', async function () {
      expect(this.tx.receipt.logs.length).to.be.equal(6);

      await expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(28),
        month: new BN(3),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
      await expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(29),
        month: new BN(3),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
      await expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(30),
        month: new BN(3),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
      await expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(31),
        month: new BN(3),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
      await expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(1),
        month: new BN(4),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
      return expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(2),
        month: new BN(4),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, booker]) {
  before(async function () {
    this.price = new BN('10000000000000000');
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN someone tries to book a room with a swapped range', function () {
    before(async function () {
      this.tx = await this.bnBooking.intentBookingBatch(0, 28, 3, 2020, 26, 3, 2020, {
        from: booker,
        value: this.price.mul(new BN(4)),
      });
    });
    it('THEN no events were emitted', async function () {
      return expect(this.tx.receipt.logs.length).to.be.equal(0);
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, booker]) {
  before(async function () {
    this.price = new BN('10000000000000000');
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN someone tries to book a room with the same min/max dates', function () {
    before(async function () {
      this.tx = await this.bnBooking.intentBookingBatch(0, 28, 3, 2020, 28, 3, 2020, {
        from: booker,
        value: this.price.mul(new BN(1)),
      });
    });
    it('THEN only one event was emitted', async function () {
      expect(this.tx.receipt.logs.length).to.be.equal(1);
      return expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(28),
        month: new BN(3),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
    });
  });
});
