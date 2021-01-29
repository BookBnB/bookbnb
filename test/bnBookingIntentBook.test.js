const { expect, use } = require('chai');
const chaiAsPromiesd = require('chai-as-promised');
const bnChai = require('bn-chai');
const { expectRevert, expectEvent, BN } = require('openzeppelin-test-helpers');

const BnBooking = artifacts.require('BnBooking');

use(chaiAsPromiesd);
use(bnChai(BN));

const ROOM_NOT_AVAILABLE = 'Room not available';
const PRICE_NOT_REACHED = 'Price not reached';
const MAX_INTENTS_REACHED = 'Max intents reached';
const INTENT_ALREADY_CREATED = 'Intent already created';
const CANNOT_BOOK_YOUR_ROOM = 'Cannot book your own room';

contract('GIVEN someone created a room', function ([, roomOwner, booker]) {
  before(async function () {
    this.price = '10000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN someone tries to book without enough value being transfered', function () {
    it('THEN the tx reverts', async function () {
      return expectRevert(
        this.bnBooking.intentBook(0, 1, 1, 2020, {
          from: booker,
          value: new BN(this.price).sub(new BN(1)),
        }),
        PRICE_NOT_REACHED
      );
    });
  });
});

contract('GIVEN someone created a room and someone booked a date', function ([
  ,
  roomOwner,
  firstBooker,
  secondBooker,
]) {
  before(async function () {
    this.price = '10000000000000000';
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
    this.tx = await this.bnBooking.intentBook(0, 1, 1, 2020, {
      from: firstBooker,
      value: this.price,
    });
    await this.bnBooking.accept(0, firstBooker, 1, 1, 2020, { from: roomOwner });
  });
  describe('WHEN someone tries to book the same date', function () {
    it('THEN the tx reverts', async function () {
      return expectRevert(
        this.bnBooking.intentBook(0, 1, 1, 2020, { from: secondBooker, value: this.price }),
        ROOM_NOT_AVAILABLE
      );
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, booker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN someone creates an intent to book with just enough value being transfered', function () {
    before(async function () {
      this.initialBalanceUser = new BN((await web3.eth.getBalance(booker)).toString());
      this.initialBalanceContract = new BN(
        (await web3.eth.getBalance(this.bnBooking.address)).toString()
      );
      this.tx = await this.bnBooking.intentBook(0, 1, 1, 2020, {
        from: booker,
        value: new BN(this.price),
      });
      this.finalBalanceUser = new BN((await web3.eth.getBalance(booker)).toString());
      this.finalBalanceContract = new BN(
        (await web3.eth.getBalance(this.bnBooking.address)).toString()
      );
    });
    it('THEN an event was emitted', async function () {
      return expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(1),
        month: new BN(1),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
    });
    it('THEN the balance of the user decreased exactly by the price(+the fee paid for the tx)', async function () {
      const gasUsed = new BN(this.tx.receipt.gasUsed);
      const gasPrice = new BN((await web3.eth.getTransaction(this.tx.tx)).gasPrice);
      const feeUsed = gasPrice.mul(gasUsed);
      return expect(this.initialBalanceUser.sub(this.finalBalanceUser.add(feeUsed))).to.eq.BN(
        this.price
      );
    });

    it('THEN the price of the contract increased exactly by the price', async function () {
      return expect(this.finalBalanceContract.sub(this.initialBalanceContract)).to.eq.BN(
        this.price
      );
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
  describe('WHEN someone creates an intent to book with more than enough value being transfered', function () {
    before(async function () {
      this.initialBalanceUser = new BN((await web3.eth.getBalance(booker)).toString());
      this.initialBalanceContract = new BN(
        (await web3.eth.getBalance(this.bnBooking.address)).toString()
      );
      this.previousBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
      this.previousBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
      this.tx = await this.bnBooking.intentBook(0, 1, 1, 2020, {
        from: booker,
        value: new BN(this.price).mul(new BN(2)),
      });
      this.finalBalanceUser = new BN((await web3.eth.getBalance(booker)).toString());
      this.finalBalanceContract = new BN(
        (await web3.eth.getBalance(this.bnBooking.address)).toString()
      );
      this.finalBalanceFeeReceiver = new BN(await web3.eth.getBalance(this.feeReceiver));
      this.finalBalanceRoomOwner = new BN(await web3.eth.getBalance(roomOwner));
    });
    it('THEN an event was emitted', async function () {
      return expectEvent(this.tx, 'BookIntentCreated', {
        roomId: new BN(0),
        day: new BN(1),
        month: new BN(1),
        year: new BN(2020),
        booker,
        owner: roomOwner,
        price: new BN(this.price),
      });
    });
    it('THEN the balance of the user decreased exactly by the price(+the fee paid for the tx)', async function () {
      const gasUsed = new BN(this.tx.receipt.gasUsed);
      const gasPrice = new BN((await web3.eth.getTransaction(this.tx.tx)).gasPrice);
      const feeUsed = gasPrice.mul(gasUsed);
      return expect(this.initialBalanceUser.sub(this.finalBalanceUser.add(feeUsed))).to.eq.BN(
        this.price
      );
    });

    it('THEN the price of the contract increased exactly by the price', async function () {
      return expect(this.finalBalanceContract.sub(this.initialBalanceContract)).to.eq.BN(
        this.price
      );
    });

    it('THEN the room owner still doesnt gets its share', async function () {
      return expect(this.finalBalanceRoomOwner.sub(this.previousBalanceRoomOwner)).to.eq.BN(
        new BN(0)
      );
    });

    it('THEN the fee receiver was not charged yet', async function () {
      return expect(this.finalBalanceFeeReceiver.sub(this.previousBalanceFeeReceiver)).to.eq.BN(
        new BN(0)
      );
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, booker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN someone creates an intent to book', function () {
    before(async function () {
      await this.bnBooking.intentBook(0, 1, 1, 2020, {
        from: booker,
        value: new BN(this.price).mul(new BN(2)),
      });
    });
    it('THEN he cannot create it again', async function () {
      return expectRevert(
        this.bnBooking.intentBook(0, 1, 1, 2020, {
          from: booker,
          value: new BN(this.price).mul(new BN(2)),
        }),
        INTENT_ALREADY_CREATED
      );
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN the owner tries to book one of its rooms', function () {
    it('THEN the tx reverts', async function () {
      before(async function () {
        return expectRevert(
          this.bnBooking.intentBook(0, 1, 1, 2020, {
            from: roomOwner,
            value: new BN(this.price).mul(new BN(2)),
          }),
          CANNOT_BOOK_YOUR_ROOM
        );
      });
    });
  });
});

const MAX_INTENTS = 5;

contract(
  `GIVEN someone created a room and ${MAX_INTENTS} people created an intent to book it`,
  function ([, roomOwner, ...bookers]) {
    before(async function () {
      this.price = '100000000000000000';
      this.bnBooking = await BnBooking.deployed();
      this.bnBooking.createRoom(this.price, { from: roomOwner });
      await Promise.all(
        Object.keys([...Array(MAX_INTENTS)]).map((index) =>
          this.bnBooking.intentBook(0, 1, 1, 2020, {
            from: bookers[index],
            value: new BN(this.price).mul(new BN(2)),
          })
        )
      );
    });
    describe('WHEN another user creates an intent to book', function () {
      it('THEN the tx reverts', async function () {
        return expectRevert(
          this.bnBooking.intentBook(0, 1, 1, 2020, {
            from: bookers[MAX_INTENTS],
            value: new BN(this.price).mul(new BN(2)),
          }),
          MAX_INTENTS_REACHED
        );
      });
    });
  }
);

contract('GIVEN someone created a room', function ([, roomOwner, booker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN someone creates an intent to book a batch of days', function () {
    before(async function () {
      this.initialBalanceUser = new BN((await web3.eth.getBalance(booker)).toString());
      this.initialBalanceContract = new BN(
        (await web3.eth.getBalance(this.bnBooking.address)).toString()
      );
      this.tx = await this.bnBooking.intentBookingBatch(0, 1, 1, 2020, 7, 1, 2020, {
        from: booker,
        value: new BN(this.price).mul(new BN(7)),
      });
      this.finalBalanceUser = new BN((await web3.eth.getBalance(booker)).toString());
      this.finalBalanceContract = new BN(
        (await web3.eth.getBalance(this.bnBooking.address)).toString()
      );
    });
    it('THEN an event for each day was emitted', async function () {
      for (let i = 1; i <= 7; i++) {
        return expectEvent(this.tx, 'BookIntentCreated', {
          roomId: new BN(0),
          day: new BN(i),
          month: new BN(1),
          year: new BN(2020),
          booker,
          owner: roomOwner,
          price: new BN(this.price),
        });
      }
    });
    it('THEN the balance of the user decreased exactly by the price(+the fee paid for the tx)', async function () {
      const gasUsed = new BN(this.tx.receipt.gasUsed);
      const gasPrice = new BN((await web3.eth.getTransaction(this.tx.tx)).gasPrice);
      const feeUsed = gasPrice.mul(gasUsed);

      const acumulatedPrice = new BN(this.price).mul(new BN(7))

      return expect(this.initialBalanceUser.sub(this.finalBalanceUser.add(feeUsed))).to.eq.BN(
        acumulatedPrice
      );
    });

    it('THEN the price of the contract increased exactly by the price', async function () {
      const acumulatedPrice = new BN(this.price).mul(new BN(7))

      return expect(this.finalBalanceContract.sub(this.initialBalanceContract)).to.eq.BN(
        acumulatedPrice
      );
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, firstBooker, secondBooker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN someone creates an intent to book a batch of days', function () {
    before(async function () {
      this.initialBalanceFirstBooker = new BN((await web3.eth.getBalance(firstBooker)).toString());
      this.initialBalanceSecondBooker = new BN((await web3.eth.getBalance(secondBooker)).toString());
      this.initialBalanceContract = new BN(
        (await web3.eth.getBalance(this.bnBooking.address)).toString()
      );

      this.txFirstBook = await this.bnBooking.intentBookingBatch(0, 1, 1, 2020, 7, 1, 2020, {
        from: firstBooker,
        value: new BN(this.price).mul(new BN(7)),
      });
      this.txSecondBook = await this.bnBooking.intentBookingBatch(0, 1, 1, 2020, 7, 1, 2020, {
        from: secondBooker,
        value: new BN(this.price).mul(new BN(7)),
      });

      this.txAccept = await this.bnBooking.acceptBatch(0, firstBooker, 1, 1, 2020, 7, 1, 2020, {
        from: roomOwner
      });

      this.finalBalanceFirstBooker = new BN((await web3.eth.getBalance(firstBooker)).toString());
      this.finalBalanceSecondBooker = new BN((await web3.eth.getBalance(secondBooker)).toString());
      this.finalBalanceContract = new BN(
        (await web3.eth.getBalance(this.bnBooking.address)).toString()
      );
    });
    it('THEN the rejected booker got their money refunded', async function () {
      const gasUsed = new BN(this.txSecondBook.receipt.gasUsed);
      const gasPrice = new BN((await web3.eth.getTransaction(this.txSecondBook.tx)).gasPrice);
      const feeUsed = gasPrice.mul(gasUsed);

      return expect(this.initialBalanceSecondBooker.sub(feeUsed)).to.eq.BN(
        this.finalBalanceSecondBooker
      );
    });
  });
});
