module.exports = {
    set_tank: set_tank,
    set_worker: set_worker,
    add_healer: add_healer,
    commence: commence,
    run: entire_attack,
    worker_body: [TOUGH, TOUGH, MOVE,

        WORK, WORK, WORK, WORK, WORK,

        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE,

        WORK, WORK, WORK, WORK, WORK,
        WORK, WORK, WORK, WORK, WORK,
        WORK, WORK, WORK, WORK, WORK,
        WORK, WORK, WORK, WORK, WORK,
        WORK, WORK, WORK, WORK, WORK
    ],
    healer_body: [
        TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,

        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE,

        HEAL, HEAL, HEAL, HEAL, HEAL,
        HEAL, HEAL, HEAL, HEAL, HEAL,
        HEAL, HEAL, HEAL, HEAL, HEAL,
        HEAL, HEAL
    ],
    tank_body: [
        TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
        TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
        TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
        TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
        TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,

        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE,
        MOVE, MOVE, MOVE, MOVE, MOVE
    ]
};

function set_tank (name) {
    Memory.dox.tank = name;
}

function set_worker (name) {
    Memory.dox.worker = name;
}

function add_healer (name) {
    Memory.dox.healers.push(name);
}

function commence () {
    Memory.dox.commence = true;
}

function entire_attack() {
    if (!Memory.dox) Memory.dox = {staged: false, tank: null, worker: null, healers: [], commence: false};

    let t = Game.creeps[Memory.dox.tank];
    let w = Game.creeps[Memory.dox.worker];
    let h = [];
    for (var i = 0; i < Memory.dox.healers.length; ++i) {
        var healer = Game.getObjectById(Memory.dox.healers[i]);
        if (healer) h.push(healer);
    }

    if (!Memory.dox.staged) {
        staging(t, w, h);
    } else if (Memory.dox.commence) {
        attack(t, w, h);
    }
}

function staging (tank, worker, healers) {
    if (tank) tank.moveTo(new RoomPosition(24, 2, "W41N26"));
    if (worker) worker.moveTo(new RoomPosition(23, 2, "W41N26"));
    for (var i = 0; i < healers.length; ++i) {
        healers[i].moveTo(new RoomPosition(worker.pos.x - 1 + (i % 3), worker.pos.y + 1 + (i / 3), "W41N26"));
    }

    if (tank == null || worker == null || healers.length < 6) return;
    if (!tank.pos.inRangeTo(new RoomPosition(24, 2, "W41N26"), 0)) return;
    if (!worker.pos.inRangeTo(new RoomPosition(23, 2, "W41N26"), 0)) return;
    for (var i = 0; i < healers.length; ++i) {
        if (!healers[i].pos.inRangeTo(new RoomPosition(worker.pos.x - 1 + (i % 3), worker.pos.y + 1 + (i / 3), "W41N26"), 0)) {
            return;
        }
    }

    console.log("STAGING COMPLETE");
    Memory.dox.staged = true;
}

function attack (tank, worker, healers) {
    if (!tower1(tank, worker, healers)) {
        if (!tower2(tank, worker, healers)) {
            var spwn = Game.getObjectById('578bbe663fd9069e6b57e555');
            if (spwn) {
                if (worker.dismantle(spwn) == ERR_NOT_IN_RANGE) {
                    worker.moveTo(spwn, {reusePath: 0});
                }
            }
        }
    }
    for (var i = 0; i < healers.length; ++i) {
        heal(healers[i]);
    }
}

function tower1 (tank, worker, healers) {
    var t1 = Game.getObjectById('57929e6c111fe3532e6e6770');
    if (!t1) return false;

    var wall1 = Game.getObjectById('578d7f77d21fa30462008fcf');
    var wall2 = Game.getObjectById('578bf44bc44ebd8231a911a7');

    var wall = wall1 ? wall1 : wall2;

    if (wall) {
        tank.moveTo(new RoomPosition(wall.pos.x + 2, wall.pos.y + 1, "W41N27"), {reusePath: 0});

        worker.moveTo(new RoomPosition(wall.pos.x, wall.pos.y + 1, "W41N27"), {reusePath: 0});
        worker.dismantle(wall);
        for (var i = 0; i < healers.length; ++i) {
            healers[i].moveTo(new RoomPosition(worker.pos.x - 1 + (i % 3), worker.pos.y + 1 + (i / 3), "W41N27"), {reusePath: 0});
        }
    } else {
        worker.moveTo(new RoomPosition(19, 34, "W41N27"));
        worker.dismantle(t1);
        if (healers.length > 0) healers[0].moveTo(new RoomPosition(18, 34, "W41N27"), {reusePath: 0});
        if (healers.length > 1) healers[1].moveTo(new RoomPosition(18, 35, "W41N27"), {reusePath: 0});
        if (healers.length > 2) healers[2].moveTo(new RoomPosition(19, 35, "W41N27"), {reusePath: 0});
        if (healers.length > 3) healers[3].moveTo(new RoomPosition(17, 35, "W41N27"), {reusePath: 0});
        if (healers.length > 4) healers[4].moveTo(new RoomPosition(17, 36, "W41N27"), {reusePath: 0});
        if (healers.length > 5) healers[5].moveTo(new RoomPosition(19, 36, "W41N27"), {reusePath: 0});
        if (healers.length > 6) healers[5].moveTo(new RoomPosition(18, 36, "W41N27"), {reusePath: 0});
    }

    return true;
}

function tower2 (worker, healers) {
    var t2 = Game.getObjectById('578ce3dbb16d16a23919a35d');
    if (!t2) return false;

    worker.moveTo(new RoomPosition(18, 7, "W41N27"));
    worker.dismantle(t2);
    if (healers.length > 0) healers[0].moveTo(new RoomPosition(17, 6, "W41N27"), {reusePath: 0});
    if (healers.length > 1) healers[1].moveTo(new RoomPosition(19, 7, "W41N27"), {reusePath: 0});
    if (healers.length > 2) healers[2].moveTo(new RoomPosition(19, 8, "W41N27"), {reusePath: 0});
    if (healers.length > 3) healers[3].moveTo(new RoomPosition(17, 5, "W41N27"), {reusePath: 0});
    if (healers.length > 4) healers[4].moveTo(new RoomPosition(18, 5, "W41N27"), {reusePath: 0});
    if (healers.length > 5) healers[5].moveTo(new RoomPosition(20, 7, "W41N27"), {reusePath: 0});
    if (healers.length > 6) healers[5].moveTo(new RoomPosition(19, 5, "W41N27"), {reusePath: 0});

    return true;
}

function heal (healer) {
    let close = healer.pos.findInRange(FIND_MY_CREEPS, 3, {filter: (c) => c.hits < c.hitsMax});
    if (close.length > 0) {
        let lowest = close[0];
        for (let i = 1; i < close.length; ++i) {
            if (lowest.hits > close[i].hits) lowest = close[i];
        }

        if (healer.heal(lowest) == ERR_NOT_IN_RANGE) {
            healer.rangedHeal(lowest);
        }
    } else {
        healer.heal(healer);
    }
}