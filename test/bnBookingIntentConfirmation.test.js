const { expect, use } = require('chai');
const chaiAsPromiesd = require('chai-as-promised');
const bnChai = require('bn-chai');
const { expectRevert, expectEvent, BN } = require('openzeppelin-test-helpers');

const BnBooking = artifacts.require('BnBooking');

const INTENT_NOT_FOUND = 'Intent not found';

use(chaiAsPromiesd);
use(bnChai(BN));

contract('GIVEN someone created a room', function ([, roomOwner, booker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
    this.feeReceiver = await this.bnBooking.feeReceiver();
  });
  describe('WHEN someone tries to book with just enough value being transfered', function () {
    before(async function () {
      await this.bnBooking.intentBook(0, 1, 1, 2020, {
        from: booker,
        value: new BN(this.price),
      });
      this.previousBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
      this.previousBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
      this.tx = await this.bnBooking.accept(0, booker, 1, 1, 2020, {
        from: roomOwner,
        gasPrice: 0,
      });
      this.finalBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
      this.finalBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
    });
    it('THEN an event was emitted', async function () {
      return expectEvent(this.tx, 'RoomBooked', {
        roomId: new BN(0),
        day: new BN(1),
        month: new BN(1),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
    });

    it('THEN the room owner gets its share', async function () {
      return expect(this.finalBalanceRoomOwner.sub(this.previousBalanceRoomOwner)).to.eq.BN(
        // Assuming 50% fee rate
        new BN(this.price).div(new BN(2))
      );
    });

    it('THEN the fee receiver gets its share', async function () {
      return expect(this.finalBalanceFeeReceiver.sub(this.previousBalanceFeeReceiver)).to.eq.BN(
        // Assuming 50% fee rate
        new BN(this.price).div(new BN(2))
      );
    });

    it('THEN the room is booked', async function () {
      return expect(this.bnBooking.booked(0, 1, 1, 2020)).to.be.eventually.true;
    });

    it('THEN the room is not booked on the next date', async function () {
      return expect(this.bnBooking.booked(0, 2, 1, 2020)).to.be.eventually.false;
    });
    it('THEN the room is available on another date', async function () {
      return expect(
        this.bnBooking.intentBook(0, 3, 1, 2020, {
          from: booker,
          value: new BN(this.price),
        })
      ).to.be.fulfilled;
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, booker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
    this.feeReceiver = await this.bnBooking.feeReceiver();
  });
  describe('WHEN someone tries to book with more than enough value being transfered', function () {
    before(async function () {
      this.previousBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
      this.previousBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
      await this.bnBooking.intentBook(0, 1, 1, 2020, {
        from: booker,
        value: new BN(this.price).mul(new BN(2)),
      });
      this.tx = await this.bnBooking.accept(0, booker, 1, 1, 2020, {
        from: roomOwner,
        gasPrice: 0,
      });
      this.finalBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
      this.finalBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
    });
    it('THEN an event was emitted', async function () {
      return expectEvent(this.tx, 'RoomBooked', {
        roomId: new BN(0),
        day: new BN(1),
        month: new BN(1),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
    });

    it('THEN the room owner gets its share', async function () {
      return expect(this.finalBalanceRoomOwner.sub(this.previousBalanceRoomOwner)).to.eq.BN(
        // Assuming 50% fee rate
        new BN(this.price).div(new BN(2))
      );
    });

    it('THEN the fee receiver gets its share', async function () {
      return expect(this.finalBalanceFeeReceiver.sub(this.previousBalanceFeeReceiver)).to.eq.BN(
        // Assuming 50% fee rate
        new BN(this.price).div(new BN(2))
      );
    });

    it('THEN the room is booked', async function () {
      return expect(this.bnBooking.booked(0, 1, 1, 2020)).to.be.eventually.true;
    });
    it('THEN the room is not booked on the next date', async function () {
      return expect(this.bnBooking.booked(0, 2, 1, 2020)).to.be.eventually.false;
    });
    it('THEN the room is available on another date', async function () {
      return expect(
        this.bnBooking.intentBook(0, 3, 1, 2020, {
          from: booker,
          value: new BN(this.price),
        })
      ).to.be.fulfilled;
    });
  });
});

contract(
  'GIVEN someone created a room and someone creates an intent and the owner later changes its price',
  function ([, roomOwner, booker]) {
    before(async function () {
      this.initPrice = '100000000000000000';
      this.newPrice = '200000000000000000';
      this.bnBooking = await BnBooking.deployed();
      this.feeReceiver = await this.bnBooking.feeReceiver();
      await this.bnBooking.createRoom(this.initPrice, { from: roomOwner });
      await this.bnBooking.intentBook(0, 1, 1, 2020, {
        from: booker,
        value: new BN(this.initPrice),
      });
      await this.bnBooking.changePrice(0, this.newPrice, { from: roomOwner });
    });
    describe('WHEN the owner accepts it', function () {
      before(async function () {
        this.previousBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
        this.previousBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
        this.tx = await this.bnBooking.accept(0, booker, 1, 1, 2020, {
          from: roomOwner,
          gasPrice: 0,
        });
        this.finalBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
        this.finalBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
      });
      it('THEN an event was emitted with the initial price', async function () {
        return expectEvent(this.tx, 'RoomBooked', {
          roomId: new BN(0),
          day: new BN(1),
          month: new BN(1),
          year: new BN(2020),
          booker,
          owner: roomOwner,
          price: new BN(this.initPrice),
        });
      });

      it('THEN the room owner gets its share', async function () {
        return expect(this.finalBalanceRoomOwner.sub(this.previousBalanceRoomOwner)).to.eq.BN(
          // Assuming 50% fee rate
          new BN(this.initPrice).div(new BN(2))
        );
      });

      it('THEN the fee receiver gets its share', async function () {
        return expect(this.finalBalanceFeeReceiver.sub(this.previousBalanceFeeReceiver)).to.eq.BN(
          // Assuming 50% fee rate
          new BN(this.initPrice).div(new BN(2))
        );
      });

      it('THEN the room is booked', async function () {
        return expect(this.bnBooking.booked(0, 1, 1, 2020)).to.be.eventually.true;
      });

      it('THEN the room is not booked on the next date', async function () {
        return expect(this.bnBooking.booked(0, 2, 1, 2020)).to.be.eventually.false;
      });
      it('THEN the room is available on another date', async function () {
        return expect(
          this.bnBooking.intentBook(0, 3, 1, 2020, {
            from: booker,
            value: new BN(this.newPrice),
          })
        ).to.be.fulfilled;
      });
    });
  }
);

contract('GIVEN someone created a room and someone created an intent for two days', function ([
  ,
  roomOwner,
  booker,
]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
    await this.bnBooking.intentBook(0, 1, 1, 2020, {
      from: booker,
      value: new BN(this.price),
    });
    await this.bnBooking.intentBook(0, 2, 1, 2020, {
      from: booker,
      value: new BN(this.price),
    });
    this.feeReceiver = await this.bnBooking.feeReceiver();
  });
  describe('WHEN the owner accepts the two', function () {
    before(async function () {
      this.previousBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
      this.previousBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
      await this.bnBooking.accept(0, booker, 1, 1, 2020, { from: roomOwner, gasPrice: 0 });
      await this.bnBooking.accept(0, booker, 2, 1, 2020, { from: roomOwner, gasPrice: 0 });
      this.finalBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
      this.finalBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
    });

    it('THEN the fee receiver gets both of its share', async function () {
      return expect(this.finalBalanceFeeReceiver.sub(this.previousBalanceFeeReceiver)).to.eq.BN(
        // Assuming 50% fee rate
        new BN(this.price)
      );
    });
    it('THEN the room owner receiver gets both of its share', async function () {
      return expect(this.finalBalanceRoomOwner.sub(this.previousBalanceRoomOwner)).to.eq.BN(
        // Assuming 50% fee rate
        new BN(this.price)
      );
    });
  });
});

contract('GIVEN someone created a room and no one created an intent', async function ([
  ,
  roomOwner,
  randomAddress,
]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN the room owner wants to accept it', function () {
    it('THEN the tx reverts', async function () {
      return expectRevert(
        this.bnBooking.accept(0, randomAddress, 1, 1, 20, { from: roomOwner }),
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
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
    await this.bnBooking.intentBook(0, 1, 1, 2020, {
      from: booker,
      value: new BN(this.price).mul(new BN(2)),
    });
  });
  describe('WHEN the room owner wants to accept it using another address', function () {
    it('THEN the tx reverts', async function () {
      return expectRevert(
        this.bnBooking.accept(0, randomAddress, 1, 1, 20, { from: roomOwner }),
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
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
    await this.bnBooking.intentBook(0, 1, 1, 2020, {
      from: booker,
      value: new BN(this.price).mul(new BN(2)),
    });
  });
  describe('WHEN the room owner accepts it', function () {
    before(async function () {
      await this.bnBooking.accept(0, booker, 1, 1, 2020, { from: roomOwner });
    });
    it('THEN the room owner can not accept it again', async function () {
      return expectRevert(
        this.bnBooking.accept(0, booker, 1, 1, 20, { from: roomOwner }),
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
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
    await this.bnBooking.intentBook(0, 1, 1, 2020, {
      from: booker,
      value: new BN(this.price).mul(new BN(2)),
    });
  });
  describe('WHEN the room owner rejects it', function () {
    before(async function () {
      await this.bnBooking.reject(0, booker, 1, 1, 2020, { from: roomOwner });
    });
    it('THEN the room owner can not accept it', async function () {
      return expectRevert(
        this.bnBooking.accept(0, booker, 1, 1, 20, { from: roomOwner }),
        INTENT_NOT_FOUND
      );
    });
  });
});

contract('GIVEN someone created a room and three users created an intent', async function ([
  ,
  roomOwner,
  firstBooker,
  secondBooker,
  thirdBooker,
]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
    await this.bnBooking.intentBook(0, 1, 1, 2020, {
      from: firstBooker,
      value: new BN(this.price),
    });
    await this.bnBooking.intentBook(0, 1, 1, 2020, {
      from: secondBooker,
      value: new BN(this.price),
    });
    await this.bnBooking.intentBook(0, 1, 1, 2020, {
      from: thirdBooker,
      value: new BN(this.price),
    });
  });
  describe('WHEN the room owner accepts one', function () {
    before(async function () {
      this.previousBalanceSecondBooker = new BN(await web3.eth.getBalance(secondBooker));
      this.previousBalanceThirdBooker = new BN(await web3.eth.getBalance(thirdBooker));
      await this.bnBooking.accept(0, firstBooker, 1, 1, 2020, {
        from: roomOwner,
        gasPrice: 0,
      });
      this.finalBalanceSecondBooker = new BN(await web3.eth.getBalance(secondBooker));
      this.finalBalanceThirdBooker = new BN(await web3.eth.getBalance(thirdBooker));
    });
    it('THEN the room owner can not accept the second', async function () {
      return expectRevert(
        this.bnBooking.accept(0, secondBooker, 1, 1, 20, { from: roomOwner }),
        INTENT_NOT_FOUND
      );
    });

    it('THEN the room owner can not reject the second', async function () {
      return expectRevert(
        this.bnBooking.accept(0, secondBooker, 1, 1, 20, { from: roomOwner }),
        INTENT_NOT_FOUND
      );
    });

    it('THEN the room owner can not accept the third', async function () {
      return expectRevert(
        this.bnBooking.accept(0, thirdBooker, 1, 1, 20, { from: roomOwner }),
        INTENT_NOT_FOUND
      );
    });

    it('THEN the room owner can not reject the third', async function () {
      return expectRevert(
        this.bnBooking.reject(0, thirdBooker, 1, 1, 20, { from: roomOwner }),
        INTENT_NOT_FOUND
      );
    });

    it('THEN the second booker gets its money back', async function () {
      return expect(this.finalBalanceSecondBooker.sub(this.previousBalanceSecondBooker)).to.eq.BN(
        this.price
      );
    });

    it('THEN the third booker gets its money back', async function () {
      return expect(this.finalBalanceThirdBooker.sub(this.previousBalanceThirdBooker)).to.eq.BN(
        this.price
      );
    });
  });
});
