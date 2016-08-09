require('creep.types').proto();
var worker = require('new.worker');
var tower = require('new_tower');
var rm = require('room_mining');
var mavg = require('moving_avg');
var tools = require('tools');
var ramparts = require('ramparts');
var claimer = require('claimer');
var colony = require('colony');

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

    var miners_needed = new_mining.control('W42N25');
    if (miners_needed.length > 0) {
        var needed = false;
        for (var i = 0; i < miners_needed.length; ++i) {
            if (miners_needed[i] < 180) {
                needed = true;
            }
        }
        if (needed && false) {
            var creep = Game.spawns.spawn_01.createCustomCreep(creepTypes.FAST_MINER, Infinity);
            if (! (creep < 0)) {
                new_mining.assign(Game.creeps[creep], 'W42N25');
            }
        }
    }

    var work = colony.run(Game.rooms.W42N25);
    console.log(work);

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

