var creepTypes = require('creep.types');
creepTypes.proto();

var edist = require('energy_distribution');
edist.setup();

var carriers = require('remote_carriers');
carriers.setup();

var worker = require('new.worker');
var tower = require('new_tower');
var tools = require('tools');
var ramparts = require('ramparts');
var reserver = require('reserver');
var colony = require('colony');
var goto = require('goto');
var new_mining = require('new_mining');

var remops = require('remote_operations');

module.exports.loop = function () {

    for (var i in Memory.creeps) {
        if (!Game.creeps[i]) {
            if (Game.flags[Memory.creeps[i].name]) Game.flags[Memory.creeps[i].name].remove();
            delete Memory.creeps[i];
        }
    }

    worker.run(Game.rooms.W42N24, Game.spawns['spawn_01']);

    tower.run(Game.rooms.W42N24);
    tower.run(Game.rooms.W42N25);

    ramparts.run();

    var minerW42N25_ttl = new_mining.control('W42N25');
    if (minerW42N25_ttl.length > 0) {
        if (minerW42N25_ttl[0] < 40) {
            var creep = Game.spawns.spawn_02.createCustomCreep(creepTypes.HEAVY_MINER_C, Infinity);
            if (! (creep < 0)) {
                new_mining.assign(Game.creeps[creep], 'W42N25');
            }
        }
    }

    var minerW42N24_ttl = new_mining.control('W42N24');
    if (minerW42N24_ttl.length > 0) {
        if (minerW42N24_ttl[0] < 40) {
            var creep = Game.spawns.spawn_01.createCustomCreep(creepTypes.HEAVY_MINER_C, Infinity);
            if (! (creep < 0)) {
                new_mining.assign(Game.creeps[creep], 'W42N24');
            }
        }
    }

    if (edist.control(Game.rooms.W42N24) < 2) {
        var creep = Game.spawns.spawn_01.createCustomCreep('MEDIUM_TRANSPORT', 1200);
        if (! (creep < 0)) edist.assign(creep, 'W42N24');
    }

    // --- W41N24 ---

    var minerW41N24_ttl = new_mining.control('W41N24');
    var carrier_status = carriers.control();

    if (minerW41N24_ttl.length > 0) {
        if (minerW41N24_ttl[0] < 180) {
            var creep = Game.spawns.spawn_01.createCustomCreep(creepTypes.FAST_MINER, Infinity);
            if (!(creep < 0)) {
                new_mining.assign(Game.creeps[creep], 'W41N24');
            }
        }
    }

    if ((!carrier_status.W41N24 || carrier_status.W41N24.creeps.length < 3) && new_mining.fill('W41N24') > 500) {
        var creep = Game.spawns.spawn_01.createCustomCreep(creepTypes.FAST_TRANSPORTER);
        if (!(creep < 0)) {
            carriers.assign(creep, 'W41N24');
        }
    }

    // --- /W41N24 ---

    goto.run();

    // --- W42N25

    var work = colony.run(Game.rooms.W42N25);
    if (work < 4 && Game.rooms.W42N25.energyAvailable > 1000) Game.spawns.spawn_02.createCustomCreep('MEDIUM_WORKER', 1600, {role: 'worker'});

    if (edist.control(Game.rooms.W42N25) < 3) {
        var creep = Game.spawns.spawn_02.createCustomCreep('MEDIUM_TRANSPORT');
        if (! (creep < 0)) edist.assign(creep, 'W42N25');
    }

    // --- /W42N25 ---

    // --- W41N25 ---

    var minerW41N25_ttl = new_mining.control('W41N25');

    if (minerW41N25_ttl.length > 0) {
        if (minerW41N25_ttl[0] < 50) {
            var creep = Game.spawns.spawn_02.createCustomCreep(creepTypes.FAST_MINER);
            if (!(creep < 0)) {
                new_mining.assign(Game.creeps[creep], 'W41N25');
            }
        }
    }

    if ((!carrier_status.W41N25 || carrier_status.W41N25.creeps.length < 2) && new_mining.fill('W41N25') > 300) {
        var creep = Game.spawns.spawn_02.createCustomCreep(creepTypes.FAST_TRANSPORTER);
        if (!(creep < 0)) {
            carriers.assign(creep, 'W41N25');
        }
    }

    // --- /W41N25 ---

    var reserved_rooms = ['W41N24', 'W41N25'];
    var reserver_spawns = {W41N24: {spawn: Game.spawns.spawn_01, busy: false}, W41N25: {spawn: Game.spawns.spawn_02, busy: false}};
    for (var i = 0; i < reserved_rooms.length; ++i) {
        var room = Game.rooms[reserved_rooms[i]];
        if (room) {
            if (!Memory.reservations) Memory.reservations = {};
            var t = 0;
            if (room.controller.reservation) t = room.controller.reservation.ticksToEnd;
            Memory.reservations[reserved_rooms[i]] = t;
        } else {
            if (!Memory.reservations[reserved_rooms[i]]) {
                Memory.reservations[reserved_rooms[i]] = 0;
            } else {
                if (Memory.reservations[reserved_rooms[i]] > 0) {
                    Memory.reservations[reserved_rooms[i]] -= 1;
                }
            }
        }
    }
    var res = reserver.run(reserved_rooms);
    var sub4k, sub2k;
    if (res.length > 0) {
        for (var i = 0; i < res.length; ++i) {
            if (Memory.reservations[res[i]] < 4000) {
                if (!reserver_spawns[res[i]].busy) {
                    if (!reserver_spawns[res[i]].spawn.spawning) {
                        reserver_spawns[res[i]].spawn.createCustomCreep(creepTypes.SMALL_RESERVER, Infinity, reserver.mem(res[i]));
                    }
                    reserver_spawns[res[i]].busy = true;
                }
            }
        }
    }

    // LINK CONTROL
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

    var spwn = function (b, cb) {
        var n  =Game.spawns.spawn_02.createCreep(b);
        if(! (n < 0)) cb(n);
    }

    var rdata = [
        {
            name: 'W42N26',
            spawn_callback: spwn,
            scout: {
                body: [MOVE],
                x:30,
                y:43
            },
            reserve: {
                body: [CLAIM, CLAIM, MOVE, MOVE]
            }
        }
    ];

    remops.operate(rdata);

};

