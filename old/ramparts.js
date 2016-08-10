module.exports = {
    run: run
};

function run() {
    W42N24();
    W42N25();
}

function W42N24() {
    var ramparts = ['5797ba23c4d2412f59f0e925', '57a12b046e25efad5b9dece6', '57ab7c76b211235e0603f62e'];

    var creeps = Game.rooms.W42N24.find(FIND_HOSTILE_CREEPS);
    var drpc = false;
    var other = false;
    for (var i = 0; i < creeps.length; ++i) {
        if (creeps[i].owner.username == 'DoctorPC') {
            drpc = true;
        } else {
            other = true;
        }
    }

    for (var i = 0; i < ramparts.length; ++i) {
        Game.getObjectById(ramparts[i]).setPublic(drpc && !other);
    }
}

function W42N25() {
    var ramparts = Game.rooms.W42N25.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_RAMPART});

    var creeps = Game.rooms.W42N25.find(FIND_HOSTILE_CREEPS);
    var drpc = false;
    var other = false;
    for (var i = 0; i < creeps.length; ++i) {
        if (creeps[i].owner.username == 'DoctorPC') {
            drpc = true;
        } else {
            other = true;
        }
    }

    for (var i = 0; i < ramparts.length; ++i) {
        ramparts[i].setPublic(drpc && !other);
    }
}