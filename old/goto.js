module.exports = {
    run: control
};

function control() {
    for (var i in Game.creeps) {
        var creep = Game.creeps[i];
        var goto = creep.memory.goto;
        if (!creep.spawning && goto) {
            if (creep.pos.inRangeTo(goto, 1)) {
                delete creep.memory.goto;
            } else if (creep.room.name == goto.roomName) {
                creep.moveTo(goto.x, goto.y);
            } else {
                creep.moveTo(creep.pos.findClosestByPath(creep.room.findExitTo(goto.roomName)));
            }

        }
    }
}