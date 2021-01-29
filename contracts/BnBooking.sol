pragma solidity 0.6.12;

import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract BnBookingEvents {
    event RoomBooked(
        uint256 indexed roomId,
        address indexed booker,
        address indexed owner,
        uint256 price,
        uint256 day,
        uint256 month,
        uint256 year
    );
    event PaymentSent(address indexed paymentReceiver, uint256 price);
    event RoomCreated(address indexed owner, uint256 indexed roomId, uint256 price);
    event RoomRemoved(address indexed owner, uint256 indexed roomId);
    event PriceChanged(address indexed owner, uint256 indexed roomId, uint256 newPrice);
    event BookIntentCreated(
        uint256 indexed roomId,
        address indexed booker,
        address indexed owner,
        uint256 price,
        uint256 day,
        uint256 month,
        uint256 year
    );
    event BookIntentRejected(
        uint256 indexed roomId,
        address indexed booker,
        address indexed owner,
        uint256 price,
        uint256 day,
        uint256 month,
        uint256 year
    );
    event BookIntentCancelled(
        uint256 indexed roomId,
        address indexed booker,
        address indexed owner,
        uint256 day,
        uint256 month,
        uint256 year
    );
}

contract BnBooking is Ownable, BnBookingEvents {
    using SafeMath for uint256;

    struct Room {
        uint256 roomId;
        address owner;
        uint256 price;
    }

    struct BookingIntent {
        uint256 price;
        uint256 positionBooker;
    }

    // bookings: roomId -> hash(date) -> booker
    mapping (uint256 => mapping (bytes32 => address)) internal bookings;

    // bookingIntents: roomId -> hash(date) -> possibleBooker -> bookingIntent
    mapping (uint256 => mapping (bytes32 => mapping (address => BookingIntent))) internal bookingIntents;

    mapping (uint256 => mapping (bytes32 => address[])) internal possibleBookers;

    Room[] public rooms;

    uint256 public nextRoomId = 0;

    uint256 public feeRate;

    address payable public feeReceiver;

    uint256 public constant FEE_RATE_PRECISION = 10 ** 18;

    uint256 public constant MAX_INTENTS = 5;

    constructor(uint256 _feeRate, address payable _feeReceiver) public {
        feeRate = _feeRate;
        feeReceiver = _feeReceiver;
    }

    modifier validDate(uint256 day, uint256 month, uint256 year) {
        require(isValidDate(day, month, year), "Invalid date"); //TODO
        _;
    }

    modifier roomExists(uint256 roomId) {
        require(roomId < nextRoomId, "Room has not been created");
        require(rooms[roomId].owner != address(0), "Room has been removed");
        _;
    }

    function createRoom(uint256 price) public {
        require(price > 0, "Price cant be zero");
        uint256 roomId = nextRoomId++;
        rooms.push(Room({
            roomId: roomId,
            price: price,
            owner: msg.sender
        }));
        emit RoomCreated(msg.sender, roomId, price);
    }

    function setFeeRate(uint256 newFeeRate) public onlyOwner {
        feeRate = newFeeRate;
    }

    function setFeeReceiver(address payable newFeeReceiver) public onlyOwner {
        feeReceiver = newFeeReceiver;
    }

    function booked(uint256 roomId, uint256 day, uint256 month, uint256 year) public view validDate(day, month, year) returns(bool){
        return bookings[roomId][getDateId(day, month, year)] != address(0);
    }

    function intentBook(uint256 roomId, uint256 day, uint256 month, uint256 year) public payable {
        _intentBook(roomId, day, month, year);

        Room storage room = rooms[roomId];
        require(msg.value >= room.price, "Price not reached");
        msg.sender.transfer(msg.value.sub(room.price));
    }



    function intentBookingBatch(
        uint256 roomId,
        uint256 initialDay,
        uint256 initialMonth,
        uint256 initialYear,
        uint256 lastDay,
        uint256 lastMonth,
        uint256 lastYear
    ) public payable {
        uint256 day = initialDay;
        uint256 month = initialMonth;
        uint256 year = initialYear;

        Room storage room = rooms[roomId];

        uint256 accumulatedCost = 0;


        while (lessOrEqualDate(day, month, year, lastDay, lastMonth, lastYear)) {
            _intentBook(roomId, day, month, year);
            (day, month, year) = incrementDate(day, month, year);
            accumulatedCost = accumulatedCost.add(room.price);
        }

        require(msg.value >= accumulatedCost, "Price not reached");
        msg.sender.transfer(msg.value.sub(accumulatedCost));
    }


    function reject(
        uint256 roomId,
        address payable booker,
        uint256 day,
        uint256 month,
        uint256 year
    ) public {
        _reject(roomId, booker, day, month, year);
    }

    function rejectBatch(
        uint256 roomId,
        address payable booker,
        uint256 initialDay,
        uint256 initialMonth,
        uint256 initialYear,
        uint256 lastDay,
        uint256 lastMonth,
        uint256 lastYear
    ) public payable {
        uint256 day = initialDay;
        uint256 month = initialMonth;
        uint256 year = initialYear;
        while (lessOrEqualDate(day, month, year, lastDay, lastMonth, lastYear)) {
            _reject(roomId, booker, day, month, year);
            (day, month, year) = incrementDate(day, month, year);
        }
    }

    function accept(
        uint256 roomId,
        address booker,
        uint256 day,
        uint256 month,
        uint256 year
    ) public {
        address[] storage intenters = possibleBookers[roomId][getDateId(day, month, year)];
        uint256 numberIntenters = intenters.length;
        for (uint256 i = 0; i < numberIntenters; i++) {
            if (intenters[i] != booker)
                _repayAndRemove(roomId, payable(intenters[i]), day, month, year);
        }
        _accept(roomId, booker, day, month, year);
    }

    function acceptBatch(
        uint256 roomId,
        address booker,
        uint256 initialDay,
        uint256 initialMonth,
        uint256 initialYear,
        uint256 lastDay,
        uint256 lastMonth,
        uint256 lastYear
    ) public payable {
        uint256 day = initialDay;
        uint256 month = initialMonth;
        uint256 year = initialYear;
        while (lessOrEqualDate(day, month, year, lastDay, lastMonth, lastYear)) {
            _accept(roomId, booker, day, month, year);
            (day, month, year) = incrementDate(day, month, year);
        }
    }

    function cancelBatch(
        uint256 roomId,
        uint256 initialDay,
        uint256 initialMonth,
        uint256 initialYear,
        uint256 lastDay,
        uint256 lastMonth,
        uint256 lastYear
    ) public {
        uint256 day = initialDay;
        uint256 month = initialMonth;
        uint256 year = initialYear;
        while (lessOrEqualDate(day, month, year, lastDay, lastMonth, lastYear)) {
            _cancel(roomId, day, month, year);
            (day, month, year) = incrementDate(day, month, year);
        }
    }

    function _cancel(
        uint256 roomId,
        uint256 day,
        uint256 month,
        uint256 year
    ) internal 
        validDate(day, month, year)
        roomExists(roomId)
    {
        Room storage room = rooms[roomId];
        BookingIntent storage intent = bookingIntents[roomId][getDateId(day, month, year)][msg.sender];
        require(intent.price != 0, "Intent not found");
        emit BookIntentCancelled(
            roomId,
            msg.sender,
            room.owner,
            day,
            month,
            year
        );
        sendPayment(msg.sender, intent.price);
        delete bookingIntents[roomId][getDateId(day, month, year)][msg.sender];
        moveLastPossibleBooker(roomId, intent.positionBooker, day, month, year);
    }

    function removeRoom(uint256 roomId) public roomExists(roomId) {
        Room storage toRemove = rooms[roomId];
        require(toRemove.owner == msg.sender || owner() == msg.sender, "Not owner");
        delete(rooms[roomId]);
        emit RoomRemoved(msg.sender, roomId);
    }

    function changePrice(uint256 roomId, uint256 newPrice) public roomExists(roomId) {
        Room storage toChange = rooms[roomId];
        require(toChange.owner == msg.sender, "Not owner");
        toChange.price = newPrice;
        emit PriceChanged(msg.sender, roomId, newPrice);
    }

    function lessOrEqualDate(
        uint256 firstDay,
        uint256 firstMonth,
        uint256 firstYear,
        uint256 secondDay,
        uint256 secondMonth,
        uint256 secondYear
    ) internal pure returns (bool) {
        return firstYear < secondYear ||
        (firstYear == secondYear && firstMonth < secondMonth) ||
        (firstYear == secondYear && firstMonth == secondMonth && firstDay <= secondDay);
    }


    function _intentBook(
        uint256 roomId,
        uint256 day,
        uint256 month,
        uint256 year
    ) internal
        validDate(day, month, year)
        roomExists(roomId) {
        Room storage room = rooms[roomId];
        require(!booked(roomId, day, month, year), "Room not available");
        require(bookingIntents[roomId][getDateId(day, month, year)][msg.sender].price == 0, "Intent already created");
        require(room.owner != msg.sender, "Cannot book your own room");


        require(possibleBookers[roomId][getDateId(day, month, year)].length < MAX_INTENTS, "Max intents reached");
        possibleBookers[roomId][getDateId(day, month, year)].push(msg.sender);
        bookingIntents[roomId][getDateId(day, month, year)][msg.sender] = BookingIntent({
            price: room.price,
            positionBooker: possibleBookers[roomId][getDateId(day, month, year)].length - 1
        });

        emit BookIntentCreated(
            roomId,
            msg.sender,
            room.owner,
            room.price,
            day,
            month,
            year
        );
    }

    function _accept(
        uint256 roomId,
        address booker,
        uint256 day,
        uint256 month,
        uint256 year
    ) internal
        validDate(day, month, year)
        roomExists(roomId) {
        Room storage room = rooms[roomId];
        require(room.owner == msg.sender, "Not owner");
        BookingIntent storage intent = bookingIntents[roomId][getDateId(day, month, year)][booker];
        require(intent.price != 0, "Intent not found");
        require(!booked(roomId, day, month, year), "Room already booked");
        splitPayment(msg.sender, intent.price);

        bookings[roomId][getDateId(day, month, year)] = booker;
        emit RoomBooked(
            roomId,
            booker,
            msg.sender,
            intent.price,
            day,
            month,
            year
        );
        delete bookingIntents[roomId][getDateId(day, month, year)][booker];
        delete possibleBookers[roomId][getDateId(day, month, year)];
    }

    function _reject(
        uint256 roomId,
        address payable booker,
        uint256 day,
        uint256 month,
        uint256 year
    ) internal
        validDate(day, month, year)
        roomExists(roomId) {
        Room storage room = rooms[roomId];
        require(room.owner == msg.sender, "Not owner");
        BookingIntent storage intent = bookingIntents[roomId][getDateId(day, month, year)][booker];
        require(intent.price != 0, "Intent not found");
        emit BookIntentRejected(
            roomId,
            booker,
            msg.sender,
            intent.price,
            day,
            month,
            year
        );
        sendPayment(booker, intent.price);
        delete bookingIntents[roomId][getDateId(day, month, year)][booker];
        moveLastPossibleBooker(roomId, intent.positionBooker, day, month, year);
    }

    function incrementDate(uint256 day, uint256 month, uint256 year) internal pure returns (uint256, uint256, uint256) {
        if (isValidDate(day + 1, month, year)) return (day + 1, month, year);
        if (isValidDate(1, month + 1, year)) return (1, month + 1, year);
        return (1, 1, year + 1);
    }

    function moveLastPossibleBooker(uint256 roomId, uint256 newBookerPostion, uint256 day, uint256 month, uint256 year) internal {
        address movedBooker = possibleBookers[roomId][getDateId(day, month, year)][newBookerPostion];
        possibleBookers[roomId][getDateId(day, month, year)].pop();
        bookingIntents[roomId][getDateId(day, month, year)][movedBooker].positionBooker = newBookerPostion;
    }

    function splitPayment(address payable paymentReceiver, uint256 totalPayment) internal {
        uint256 fees = totalPayment.mul(feeRate).div(FEE_RATE_PRECISION);
        sendPayment(feeReceiver, fees);
        sendPayment(paymentReceiver, totalPayment.sub(fees));
    }

    function sendPayment(address payable receiver, uint256 payment) internal {
        receiver.transfer(payment);
        emit PaymentSent(msg.sender, payment);

    }

    function _repayAndRemove(uint256 roomId, address payable booker, uint256 day, uint256 month, uint256 year) internal {
        BookingIntent storage intent = bookingIntents[roomId][getDateId(day, month, year)][booker];
        sendPayment(booker, intent.price);
        delete bookingIntents[roomId][getDateId(day, month, year)][booker];
    }
    function getDateId(uint256 day, uint256 month, uint256 year) internal pure returns(bytes32){
        return keccak256(abi.encodePacked(day, month, year));
    }

    function isValidDate(uint256 day, uint256 month, uint256 year) internal pure returns(bool) {
        if (month < 1 || month > 12) return false;
        bool dayIsPositive = day > 0;
        bool leapYear = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
        bool doesntExceedFebruary = (day <= 28) || (leapYear && day <= 29);
        bool isLongMonth = month == 1 ||
            month == 3 ||
            month == 5 ||
            month == 6 ||
            month == 8 ||
            month == 10 ||
            month == 12;
        bool isShortMonth = !isLongMonth && month != 2;
        bool doesntExceedMonth = day <= 30 && isShortMonth || day <= 31 && isLongMonth || doesntExceedFebruary && month == 2;
        return dayIsPositive && doesntExceedMonth;
    }

}