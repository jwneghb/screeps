var creepTypes = require('creep.types');
creepTypes.proto();

var edist = require('energy_distribution');
edist.setup();

var carriers = require('remote_carriers');
carriers.setup();

var worker = require('new.worker');
var tower = require('new_tower');
var rm = require('room_mining');
var tools = require('tools');
var ramparts = require('ramparts');
var reserver = require('reserver');
var colony = require('colony');
var goto = require('goto');


var new_mining = require('new_mining');

module.exports.loop = function () {

    for (var i in Memory.creeps) {
        if (!Game.creeps[i]) {
            if (Game.flags[Memory.creeps[i].name]) Game.flags[Memory.creeps[i].name].remove();
            delete Memory.creeps[i];
        }
    }

    worker.run(Game.rooms.W42N24, Game.spawns['spawn_01']);

    tower.run(Game.rooms.W42N24);

    rm.control(Game.spawns['spawn_01']);

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

    var minerW41N24_ttl = new_mining.control('W41N24');
    if (minerW41N24_ttl.length > 0) {
        if (minerW41N24_ttl[0] < 180) {
            var creep = Game.spawns.spawn_01.createCustomCreep(creepTypes.FAST_MINER, Infinity);
            if (! (creep < 0)) {
                new_mining.assign(Game.creeps[creep], 'W41N24');
            }
        }
    }

    var carrier_status = carriers.control();
    if ((!carrier_status.W41N24 || carrier_status.W41N24.creeps.length < 3) && new_mining.fill('W41N24') > 500) {
        var creep = Game.spawns.spawn_01.createCustomCreep(creepTypes.FAST_TRANSPORTER);
        if (! (creep < 0)) {
            carriers.assign(creep, 'W41N24');
        }
    }

    var work = colony.run(Game.rooms.W42N25);

    goto.run();

    var work = colony.run(Game.rooms.W42N25);
    if (work < 4 && Game.rooms.W42N25.energyAvailable > 1000) Game.spawns.spawn_02.createCustomCreep('MEDIUM_WORKER');

    if (edist.control(Game.rooms.W42N25) < 3) {
        var creep = Game.spawns.spawn_02.createCustomCreep('MEDIUM_TRANSPORT');
        if (! (creep < 0)) edist.assign(creep, 'W42N25');
    }

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
};

