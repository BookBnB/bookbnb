const { expect, use } = require('chai');
const chaiAsPromiesd = require('chai-as-promised');
const bnChai = require('bn-chai');
const { expectRevert, expectEvent, BN } = require('openzeppelin-test-helpers');

const BnBooking = artifacts.require('BnBooking');

const INTENT_NOT_FOUND = 'Intent not found';
const ROOM_NOT_CREATED = 'Room has not been created';
const ROOM_REMOVED = 'Room has been removed';
const INVALID_DATE = 'Invalid date';

use(chaiAsPromiesd);
use(bnChai(BN));

async function transactionFee(txObject) {
  const gasUsed = new BN(txObject.receipt.gasUsed);
  const gasPrice = new BN((await web3.eth.getTransaction(txObject.tx)).gasPrice);
  return gasPrice.mul(gasUsed);
}

contract('GIVEN someone created a room', function ([, roomOwner, firstBooker, secondBooker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN two intents for the room are created and one is cancelled by the booker', function () {
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

      this.txCancel = await this.bnBooking.cancelBatch(0, 1, 1, 2020, 7, 1, 2020, {
        from: firstBooker
      });

      this.finalBalanceFirstBooker = new BN((await web3.eth.getBalance(firstBooker)).toString());
      this.finalBalanceSecondBooker = new BN((await web3.eth.getBalance(secondBooker)).toString());
      this.finalBalanceContract = new BN(
        (await web3.eth.getBalance(this.bnBooking.address)).toString()
      );
    });
    it('THEN the cancelled booker got their money refunded', async function () {
      const intentFee = await transactionFee(this.txFirstBook)
      const cancelFee = await transactionFee(this.txCancel)
      const feeUsed = intentFee.add(cancelFee)

      return expect(this.initialBalanceFirstBooker.sub(feeUsed)).to.eq.BN(
        this.finalBalanceFirstBooker
      );
    });
    it('THEN emits a cancel event for each date', async function () {
      for (let i = 1; i <= 7; i++) {
        expectEvent(this.txCancel, 'BookIntentCancelled', {
          roomId: new BN(0),
          day: new BN(i),
          month: new BN(1),
          year: new BN(2020),
          booker: firstBooker,
          owner: roomOwner
        })
      }
    })
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, firstBooker, secondBooker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN an intent is created, then approved, and the booker tries to cancel it', function () {
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
      this.txApprove = await this.bnBooking.acceptBatch(0, firstBooker, 1, 1, 2020, 7, 1, 2020, {
        from: roomOwner
      })
    });
    it('THEN the tx is reverted', async function () {
      return expectRevert(this.bnBooking.cancelBatch(0, 1, 1, 2020, 7, 1, 2020, {
        from: firstBooker
      }), INTENT_NOT_FOUND)
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, firstBooker, secondBooker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN an intent is created, then rejected, and the booker tries to cancel it', function () {
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
      this.txReject = await this.bnBooking.rejectBatch(0, firstBooker, 1, 1, 2020, 7, 1, 2020, {
        from: roomOwner
      })
    });
    it('THEN the tx is reverted', async function () {
      return expectRevert(this.bnBooking.cancelBatch(0, 1, 1, 2020, 7, 1, 2020, {
        from: firstBooker
      }), INTENT_NOT_FOUND)
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, firstBooker, secondBooker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN a booker tries to cancel non existent intents', function () {
    it('THEN the tx is reverted', async function () {
      return expectRevert(this.bnBooking.cancelBatch(0, 1, 1, 2020, 7, 1, 2020, {
        from: firstBooker
      }), INTENT_NOT_FOUND)
    });
  });
});

contract('GIVEN no rooms were created', function ([, roomOwner, firstBooker, secondBooker]) {
  before(async function () {
    this.bnBooking = await BnBooking.deployed();
  });
  describe('WHEN a booker tries to cancel an intent for a non existent room', function () {
    it('THEN the tx is reverted', async function () {
      return expectRevert(this.bnBooking.cancelBatch(0, 1, 1, 2020, 7, 1, 2020, {
        from: firstBooker
      }), ROOM_NOT_CREATED)
    });
  });
});

contract('GIVEN a room was created and removed', function ([, roomOwner, firstBooker, secondBooker]) {
  before(async function () {
    this.price = '10000000000000000';
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
    await this.bnBooking.removeRoom(0, { from: roomOwner });
  });
  describe('WHEN a booker tries to cancel an intent for a removed room', function () {
    it('THEN the tx is reverted', async function () {
      return expectRevert(this.bnBooking.cancelBatch(0, 1, 1, 2020, 7, 1, 2020, {
        from: firstBooker
      }), ROOM_REMOVED)
    });
  });
});

contract('GIVEN a room was created', function ([, roomOwner, firstBooker, secondBooker]) {
  before(async function () {
    this.price = '10000000000000000';
    this.bnBooking = await BnBooking.deployed();
    await this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN a booker tries to cancel an intent for invalid dates', function () {
    it('THEN the tx is reverted', async function () {
      return expectRevert(this.bnBooking.cancelBatch(0, 32, 1, 2020, 35, 1, 2020, {
        from: firstBooker
      }), INVALID_DATE)
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, firstBooker, secondBooker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN an intent is created, then cancelled, and the owner tries to approve it', function () {
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
      this.txCancel = this.bnBooking.cancelBatch(0, 1, 1, 2020, 7, 1, 2020, {
        from: firstBooker
      })
    });
    it('THEN the tx is reverted', async function () {
      return expectRevert(this.bnBooking.acceptBatch(0, firstBooker, 1, 1, 2020, 7, 1, 2020, {
        from: roomOwner
      }), INTENT_NOT_FOUND)
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, firstBooker, secondBooker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN an intent is created, then cancelled, and the owner tries to reject it', function () {
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
      this.txCancel = this.bnBooking.cancelBatch(0, 1, 1, 2020, 7, 1, 2020, {
        from: firstBooker
      })
    });
    it('THEN the tx is reverted', async function () {
      return expectRevert(this.bnBooking.rejectBatch(0, firstBooker, 1, 1, 2020, 7, 1, 2020, {
        from: roomOwner
      }), INTENT_NOT_FOUND)
    });
  });
});

contract('GIVEN someone created a room', function ([, roomOwner, firstBooker, secondBooker]) {
  before(async function () {
    this.price = '100000000000000000';
    this.bnBooking = await BnBooking.deployed();
    this.bnBooking.createRoom(this.price, { from: roomOwner });
  });
  describe('WHEN two intents for the room are created, one is cancelled by the booker and the other is accepted by the owner', function () {
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

      this.txCancel = await this.bnBooking.cancelBatch(0, 1, 1, 2020, 7, 1, 2020, {
        from: firstBooker
      });
      this.txAccept = await this.bnBooking.acceptBatch(0, secondBooker, 1, 1, 2020, 7, 1, 2020, {
        from: roomOwner
      });

      this.finalBalanceFirstBooker = new BN((await web3.eth.getBalance(firstBooker)).toString());
      this.finalBalanceSecondBooker = new BN((await web3.eth.getBalance(secondBooker)).toString());
      this.finalBalanceContract = new BN(
        (await web3.eth.getBalance(this.bnBooking.address)).toString()
      );
    });
    it('THEN the cancelled booker got their money refunded', async function () {
      const intentFee = await transactionFee(this.txFirstBook)
      const cancelFee = await transactionFee(this.txCancel)
      const feeUsed = intentFee.add(cancelFee)

      return expect(this.initialBalanceFirstBooker.sub(feeUsed)).to.eq.BN(
        this.finalBalanceFirstBooker
      );
    });
    it('THEN emits a booked room event for each date', async function () {
      for (let i = 1; i <= 7; i++) {
        expectEvent(this.txAccept, 'RoomBooked', {
          roomId: new BN(0),
          day: new BN(i),
          month: new BN(1),
          year: new BN(2020),
          booker: secondBooker,
          owner: roomOwner,
          price: new BN(this.price),
        })
      }
    })
  });
});
