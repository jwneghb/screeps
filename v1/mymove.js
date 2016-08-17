module.exports = function () {
    Creep.prototype.myMoveTo = function (x, y, roomName) {
        if (x === undefined) return ERR_INVALID_TARGET;

        var target = {x: x, y: y, roomName: roomName};
        if (y === undefined && roomName === undefined) {
            if (x.hasOwnProperty('pos')) {
                target.x = x.pos.x;
                target.y = x.pos.y;
                target.roomName = x.pos.roomName;
            } else if (x.hasOwnProperty('x') && x.hasOwnProperty('y') && x.hasOwnProperty('roomName')) {
                target.x = x.x;
                target.y = x.y;
                target.roomName = x.roomName;
            }
        } else {
            if (y === undefined) return ERR_INVALID_TARGET;
            if (roomName === undefined) target.roomName = this.room.name;
        }

        var targetPos = new RoomPosition(target.x, target.y, target.roomName);
        var reuse = Math.floor(Math.random()*5) + 3;

        if (this.moveTo(targetPos, {reusePath: reuse}));
    }
};