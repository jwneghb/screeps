module.exports = {
    run: control
};

function control() {
    for (var i in Game.creeps) {
        var creep = Game.creeps[i];
        var goto = creep.memory.goto;
        if (goto) {
            if (creep.room.name == goto.roomName) {
                creep.moveTo(goto.pos.x, goto.pos.y);
            } else {
                creep.moveTo(creep.pos.findClosestByPath(creep.room.findExitTo(goto.pos.roomName)));
            }
        }
    }
}