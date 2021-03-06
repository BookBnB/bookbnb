const { expect, use } = require('chai');
const chaiAsPromiesd = require('chai-as-promised');
const bnChai = require('bn-chai');
const { expectRevert, expectEvent, BN } = require('openzeppelin-test-helpers');

const BnBooking = artifacts.require('BnBooking');

const INTENT_NOT_FOUND = 'Intent not found';

use(chaiAsPromiesd);
use(bnChai(BN));

contract('GIVEN someone created a room and someone created an intent batch', function ([
  ,
  roomOwner,
  booker,
]) {
  before(async function () {
    this.price = new BN('100000000000000000');
    this.bnBooking = await BnBooking.deployed();
    this.feeReceiver = await this.bnBooking.feeReceiver();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
    await this.bnBooking.intentBookingBatch(0, 1, 1, 2020, 2, 1, 2020, {
      from: booker,
      value: this.price.mul(new BN(2)),
    });
  });
  describe('WHEN the room owner rejects the intent', function () {
    before(async function () {
      this.previousBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
      this.previousBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
      this.previousBalanceBooker = new BN(await web3.eth.getBalance(booker));
      this.tx = await this.bnBooking.rejectBatch(0, booker, 1, 1, 2020, 2, 1, 2020, {
        from: roomOwner,
        gasPrice: 0,
      });
      this.finalBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
      this.finalBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
      this.finalBalanceBooker = new BN(await web3.eth.getBalance(booker));
    });
    it('THEN two events were emitted', async function () {
      await expectEvent(this.tx, 'BookIntentRejected', {
        roomId: new BN(0),
        day: new BN(1),
        month: new BN(1),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
      return expectEvent(this.tx, 'BookIntentRejected', {
        roomId: new BN(0),
        day: new BN(2),
        month: new BN(1),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
    });

    it('THEN the room owner gets nothing', async function () {
      return expect(this.finalBalanceRoomOwner.sub(this.previousBalanceRoomOwner)).to.eq.BN(
        new BN(0)
      );
    });

    it('THEN the fee receiver gets nothing', async function () {
      return expect(this.finalBalanceFeeReceiver.sub(this.previousBalanceFeeReceiver)).to.eq.BN(
        new BN(0)
      );
    });

    it('THEN the room is not booked', async function () {
      return expect(this.bnBooking.booked(0, 1, 1, 2020)).to.be.eventually.false;
    });
    it('THEN the room is available on that date', async function () {
      return expect(
        this.bnBooking.intentBookingBatch(0, 1, 1, 2020, 2, 1, 2020, {
          from: booker,
          value: this.price.mul(new BN(2)),
        })
      ).to.be.fulfilled;
    });
    it('THEN the booker gets its money back', async function () {
      return expect(this.finalBalanceBooker.sub(this.previousBalanceBooker)).to.eq.BN(
        this.price.mul(new BN(2))
      );
    });
  });
});

contract(
  'GIVEN someone created a room and someone created an intent batch and later the room owner increases the price',
  function ([, roomOwner, booker]) {
    before(async function () {
      this.initPrice = new BN('100000000000000000');
      this.newPrice = new BN('200000000000000000');
      this.bnBooking = await BnBooking.deployed();
      this.feeReceiver = await this.bnBooking.feeReceiver();
      await this.bnBooking.createRoom(this.initPrice, { from: roomOwner });
      await this.bnBooking.intentBookingBatch(0, 1, 1, 2020, 2, 1, 2020, {
        from: booker,
        value: this.initPrice.mul(new BN(2)),
        gasPrice: 0,
      });
      await this.bnBooking.changePrice(0, this.newPrice, { from: roomOwner });
    });
    describe('WHEN the room owner rejects the intent with the initial price', function () {
      before(async function () {
        this.previousBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
        this.previousBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
        this.previousBalanceBooker = new BN(await web3.eth.getBalance(booker));
        this.tx = await this.bnBooking.rejectBatch(0, booker, 1, 1, 2020, 2, 1, 2020, {
          from: roomOwner,
          gasPrice: 0,
        });
        this.finalBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
        this.finalBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
        this.finalBalanceBooker = new BN(await web3.eth.getBalance(booker));
      });
      it('THEN an event was emitted with the initial price', async function () {
        return expectEvent(this.tx, 'BookIntentRejected', {
          roomId: new BN(0),
          day: new BN(1),
          month: new BN(1),
          year: new BN(2020),
          booker,
          owner: roomOwner,
          price: new BN(this.initPrice),
        });
      });

      it('THEN the room owner gets nothing', async function () {
        return expect(this.finalBalanceRoomOwner.sub(this.previousBalanceRoomOwner)).to.eq.BN(
          new BN(this.price).div(new BN(2))
        );
      });

      it('THEN the fee receiver gets nothing', async function () {
        return expect(this.finalBalanceFeeReceiver.sub(this.previousBalanceFeeReceiver)).to.eq.BN(
          new BN(0)
        );
      });

      it('THEN the room is not booked', async function () {
        return expect(this.bnBooking.booked(0, 1, 1, 2020)).to.be.eventually.false;
      });
      it('THEN the room is available on that date', async function () {
        return expect(
          this.bnBooking.intentBookingBatch(0, 1, 1, 2020, 2, 1, 2020, {
            from: booker,
            value: this.newPrice.mul(new BN(2)),
          })
        ).to.be.fulfilled;
      });
      it('THEN the booker gets exactly the sent money back', async function () {
        return expect(this.finalBalanceBooker.sub(this.previousBalanceBooker)).to.eq.BN(
          this.initPrice.mul(new BN(2))
        );
      });
    });
  }
);

contract('GIVEN someone created a room and no one created an intent', async function ([
  ,
  roomOwner,
  randomAddress,
]) {
  before(async function () {
    this.price = new BN('100000000000000000');
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN the room owner wants to rejectBatch it', function () {
    it('THEN the tx reverts', async function () {
      return expectRevert(
        this.bnBooking.rejectBatch(0, randomAddress, 1, 1, 20, 2, 1, 2020, { from: roomOwner }),
        INTENT_NOT_FOUND
      );
    });
  });
});

contract('GIVEN someone created a room and a booker created an intent', async function ([
  ,
  roomOwner,
  booker,
  randomAddress,
]) {
  before(async function () {
    this.price = new BN('100000000000000000');
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
    await this.bnBooking.intentBookingBatch(0, 1, 1, 2020, 2, 1, 2020, {
      from: booker,
      value: new BN(this.price).mul(new BN(2)),
    });
  });
  describe('WHEN the room owner wants to rejectBatch it using another address', function () {
    it('THEN the tx reverts', async function () {
      return expectRevert(
        this.bnBooking.rejectBatch(0, randomAddress, 1, 1, 20, 2, 1, 2020, { from: roomOwner }),
        INTENT_NOT_FOUND
      );
    });
  });
});

contract('GIVEN someone created a room and another user created an intent', async function ([
  ,
  roomOwner,
  booker,
]) {
  before(async function () {
    this.price = new BN('100000000000000000');
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
    await this.bnBooking.intentBookingBatch(0, 1, 1, 2020, 2, 1, 2020, {
      from: booker,
      value: new BN(this.price).mul(new BN(2)),
    });
  });
  describe('WHEN the room owner rejects it once', function () {
    before(async function () {
      await this.bnBooking.rejectBatch(0, booker, 1, 1, 2020, 2, 1, 2020, { from: roomOwner });
    });
    it('THEN the room owner can not rejectBatch it again', async function () {
      return expectRevert(
        this.bnBooking.rejectBatch(0, booker, 1, 1, 20, 2, 1, 2020, { from: roomOwner }),
        INTENT_NOT_FOUND
      );
    });
  });
});

contract('GIVEN someone created a room and another user created an intent', async function ([
  ,
  roomOwner,
  booker,
]) {
  before(async function () {
    this.price = new BN('100000000000000000');
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
    await this.bnBooking.intentBookingBatch(0, 1, 1, 2020, 2, 1, 2020, {
      from: booker,
      value: new BN(this.price).mul(new BN(2)),
    });
  });
  describe('WHEN the room owner accepts it', function () {
    before(async function () {
      await this.bnBooking.acceptBatch(0, booker, 1, 1, 2020, 2, 1, 2020, { from: roomOwner });
    });
    it('THEN the room owner can not rejectBatch it', async function () {
      return expectRevert(
        this.bnBooking.rejectBatch(0, booker, 1, 1, 20, 2, 1, 2020, { from: roomOwner }),
        INTENT_NOT_FOUND
      );
    });
  });
});
