module.exports = {
    run: run
};

function run() {
    W42N24();
    W42N25();
}

function W42N24() {
    var ramparts = ['5797ba23c4d2412f59f0e925', '57a12b046e25efad5b9dece6', '57ab7c76b211235e0603f62e', '57ac1f9fc2695e80327769f5'];

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

    var other_in_bottom_right = false;

    for (var i = 0; i < creeps.length; ++i) {
        if (creeps[i].owner.username == 'DoctorPC') {
            drpc = true;
        } else {
            other = true;
            if (creeps[i].pos.x >= 41 && creeps[i].pos.y >= 35) other_in_bottom_right = true;
        }
    }

    for (var i = 0; i < ramparts.length; ++i) {
        ramparts[i].setPublic(drpc && !other);
    }

    var bottom_right_rampart = Game.getObjectById('57ab3b9b6231a5892582a572');
    if (drpc && !other_in_bottom_right) bottom_right_rampart.setPublic(true);
}