var distributors = require('energy_distribution');
distributors.setup();

require('mymove')();

var workers = require('xxworker');
var colony = require('colony');
var tower = require('new_tower');
var ramparts = require('ramparts');
var remote = require('remote_operations');

var mining = require('new_mining');
var minerals = require('minerals');

var dox = require('dox');

var spawn_01_can_spawn;
var spawn_02_can_spawn;
var spawn_03_can_spawn;

var miner_body = [
    WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE
]

var dist_body = [
    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,
    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,
    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE
];

var dist_body_large = [
    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,
    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,
    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE,
    CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE
];

var work_body = [
    WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE,
    WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE,
    WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE
];

var remote_carrier = [
    CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE,
    CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE,
    CARRY, MOVE, CARRY, MOVE, CARRY, MOVE
];

var remote_carrier_large = [
    CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE,
    CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE,
    CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE,
    CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE,
    CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE
];

module.exports.loop = function() {
    spawn_01_can_spawn = (Game.spawns.spawn_01.spawning == null);
    spawn_02_can_spawn = (Game.spawns.spawn_02.spawning == null);
    spawn_03_can_spawn = (Game.spawns.spawn_03.spawning == null);

    tower.run(Game.rooms.W42N24);
    tower.run(Game.rooms.W42N25);
    ramparts.run();

    for (var i in Memory.creeps) {
        if (!Game.creeps[i]) {
            delete Memory.creeps[i];
        }
    }

    // WORKERS IN W42N24
    var distributors01 = distributors.control(Game.rooms.W42N24);
    if (distributors01 < 2) spawn_at01(dist_body_large, (name) => distributors.assign(name, 'W42N24'));

    var miners01 = mining.control('W42N24');
    if (miners01.length < 2 || miners01[0] < 40) spawn_at01(miner_body, (name) => mining.assign(Game.creeps[name], 'W42N24'));

    workers.run(Game.rooms.W42N24, spawn_at01);

    // WORKERS IN W42N25
    var distributors02 = distributors.control(Game.rooms.W42N25);
    if (distributors02 < 2) spawn_at02(dist_body_large, (name) => distributors.assign(name, 'W42N25'));

    var miners02 = mining.control('W42N25');
    if (miners02.length < 2 || miners02[0] < 40) spawn_at02(miner_body, (name) => mining.assign(Game.creeps[name], 'W42N25'));

    var workers02 = colony.run(Game.rooms.W42N25);
    if (workers02 < 3) spawn_at02(work_body);

    // MINERALS
    minerals.mine(Game.rooms.W42N24, Game.getObjectById('57b4586769dc27e97a16241b'), spawn_at01);

    // LINK CONTROL
    control_links();

    // REMOTE OPERATIONS
    remote.operate(remote_rooms);

    // WAR
    dox.run();
};

function spawn_at01(body, assignment) {
    if (spawn_01_can_spawn) {
        let name = Game.spawns.spawn_01.createCreep(body);
        if (! (name < 0)) {
            if (assignment) assignment(name);
            spawn_01_can_spawn = false;
        }
    }
}

function spawn_at02(body, assignment) {
    if (spawn_02_can_spawn) {
        let name = Game.spawns.spawn_02.createCreep(body);
        if (! (name < 0)) {
            if (assignment) assignment(name);
            spawn_02_can_spawn = false;
        }
    }
}

function control_links () {
    var src_link0 = Game.getObjectById('57ac3824aa842ca30fca0816');
    var src_link1 = Game.getObjectById('57ac6a7a7212280974c3c793');
    var dst_link = Game.getObjectById('57aac04f4a57a8840300a445');
    var src = null;
    if (dst_link.energy <= dst_link.energyCapacity - 97) {
        if (src_link0.cooldown > 0) {
            if (src_link1.cooldown == 0) src = src_link1;
        } else if (src_link1.cooldown > 0) {
            src = src_link0;
        }
        if (!src) {
            if (src_link0.energy > src_link1.energy) {
                if (src_link0.energy >= 100) src = src_link0;
            } else if (src_link1.energy >= 100) {
                src = src_link1;
            }
        }
        if (src) {
            var n = Math.min(Math.floor((dst_link.energyCapacity - dst_link.energy)/97), Math.floor(src.energy/100));
            src.transferEnergy(dst_link, n * 100);
        }
    }
}

var remote_rooms = [
    {
        name: 'W41N24',
        spawn_callback: spawn_at01,
        scout: {
            body: [MOVE],
            x: 16,
            y: 33
        },
        reserve: {
            body: [CLAIM, CLAIM, MOVE, MOVE]
        },
        mining: {
            container_placement: {
                '577b92fa0f9d51615fa47751': TOP_RIGHT,
                '577b92fa0f9d51615fa47753': TOP_LEFT
            },
            miner_body: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],

            min_fill: 1000,
            home: 'W42N24',
            carriers: 2,
            carrier_body: remote_carrier_large
        }
    },
    {
        name: 'W41N25',
        spawn_callback: spawn_at02,
        scout: {
            body: [MOVE],
            x: 15,
            y: 45
        },
        reserve: {
            body: [CLAIM, CLAIM, MOVE, MOVE]
        },
        mining: {
            container_placement: {
                '577b92fa0f9d51615fa4774e': BOTTOM_RIGHT
            },
            miner_body: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],

            min_fill: 300,
            home: 'W42N25',
            carriers: 2,
            carrier_body: remote_carrier
        }
    },
    {
        name: 'W41N23',
        spawn_callback: spawn_at01,
        scout: {
            body: [MOVE],
            x: 20,
            y: 20
        },
        reserve: {
            body: [CLAIM, CLAIM, MOVE, MOVE]
        }
    }
];
