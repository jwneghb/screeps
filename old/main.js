var creepTypes = require('creep.types');
creepTypes.proto();

var edist = require('energy_distribution');
edist.setup();

var worker = require('new.worker');
var tower = require('new_tower');
var rm = require('room_mining');
var mavg = require('moving_avg');
var tools = require('tools');
var ramparts = require('ramparts');
var claimer = require('claimer');
var colony = require('colony');
var goto = require('goto');
var carriers = require('remote_carriers');

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
    if (!carrier_status.W41N24 && new_mining.fill('W41N24') > 500) {
        var creep = Game.spawns.spawn_01.createCustomCreep(creepTypes.FAST_TRANSPORTER, 1600);
        if (! (creep < 0)) {
            carriers.assign(creep, 'W41N24');
        }
    }

    var work = colony.run(Game.rooms.W42N25);

    goto.run();

    if (! (Memory.cd >= 0)) {
        if (tools.mvalue(Game.rooms.W42N24.find(FIND_MY_CREEPS), {u: (c) => c.ticksToLive}) > 200) {
            if (!Game.spawns.spawn_01.spawning) {
                if (Game.rooms.W42N24.energyAvailable >= 2000) {
                    if (! (Game.spawns.spawn_01.createCustomCreep('MEDIUM_WORKER', Infinity, {goto:{roomName:'W42N25'}}) < 0)) {
                        Memory.cd = 700;
                    }
                }
            }
        }
    } else {
        Memory.cd -= 1;
    }

    if (edist.control(Game.rooms.W42N25) < 1) {
        var creep = Game.spawns.spawn_02.createCustomCreep('MEDIUM_TRANSPORT');
        if (! (creep < 0)) edist.assign(creep, 'W42N25');
    }

    //var prog = mavg.log('ctrl', Game.rooms.W42N24.controller.progress, {subtitle: 'W42N24', ws: 1000, aux: {}, f: (v, a) => {let p = a.p; a.p = v; return v - p || 0;} });

    /*
    var fill = rm.fill(Game.rooms.W42N24);
    var creep_fill = tools.cumulate(Game.rooms.W42N24.find(FIND_MY_CREEPS), {u: (c) => c.carry.energy});

    var delta_fill = mavg.log('delta_fill', fill+creep_fill, {subtitle: 'W42N24', ws: 1000, aux: {}, f: (v, a) => {let p = a.p; a.p = v; return v - p || 0;} });
    var av_fill = mavg.log('fill', fill+creep_fill, {subtitle: 'W42N24', ws: 1000});
    */
    /*if (Game.time % 10 == 0) {
        var rp = Game.rooms.W42N24.controller.progressTotal - Game.rooms.W42N24.controller.progress;
        var eta = Math.ceil(rp / prog);
        var readable = "" + (Math.floor(10 * 3.1 * eta / 3600) / 10) + " hours";
        console.log("[CTRL] At " + (Math.round(prog*100)/100) + "/tick, with " + Math.ceil(rp/100)/10 + "k remaining, eta is " + Math.ceil(eta/100)/10 + "k ticks (" +  readable + ").");
        console.log("Fill: " + Math.round(fill/100)/10 + "k / avg: " + Math.round(av_fill/100)/10 + "k / delta: " + (Math.round(delta_fill*100)/100) + ".");
    }*/
};

