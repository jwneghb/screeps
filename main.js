require('creep.types').proto();
var worker = require('new.worker');
var tower = require('tower');
var rm = require('room_mining');
var mavg = require('moving_avg');
var tools = require('tools');

module.exports.loop = function () {

    for (var i in Memory.creeps) {
        if (!Game.creeps[i]) {
            if (Game.flags[Memory.creeps[i].name]) Game.flags[Memory.creeps[i].name].remove();
            delete Memory.creeps[i];
        }
    }

    worker.run(Game.rooms.W42N24, Game.spawns['spawn_01']);

    var towers = Game.rooms.W42N24.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_TOWER});
    for (var i in towers) {
        tower.run(towers[i]);
    }

    rm.control(Game.spawns['spawn_01']);

    var prog = mavg.log('ctrl', Game.rooms.W42N24.controller.progress, {subtitle: 'W42N24', ws: 1000, aux: {}, f: (v, a) => {let p = a.p; a.p = v; return v - p || 0;} });

    var fill = rm.fill(Game.rooms.W42N24);
    var creep_fill = tools.cumulate(Game.rooms.W42N24.find(FIND_MY_CREEPS), {u: (c) => c.carry.energy});

    var delta_fill = mavg.log('delta_fill', fill+creep_fill, {subtitle: 'W42N24', ws: 1000, aux: {}, f: (v, a) => {let p = a.p; a.p = v; return v - p || 0;} });
    var av_fill = mavg.log('fill', fill+creep_fill, {subtitle: 'W42N24', ws: 1000});
    if (Game.time % 10 == 0) {
        var rp = Game.rooms.W42N24.controller.progressTotal - Game.rooms.W42N24.controller.progress;
        var eta = Math.ceil(rp / prog);
        var readable = "" + (Math.floor(10 * 3.1 * eta / 3600) / 10) + " hours";
        console.log("[CTRL] At " + (Math.round(prog*100)/100) + "/tick, with " + Math.ceil(rp/100)/10 + "k remaining, eta is " + Math.ceil(eta/100)/10 + "k ticks (" +  readable + ").");
        console.log("Fill: " + Math.round(fill/100)/10 + "k / avg: " + Math.round(av_fill/100)/10 + "k / delta: " + (Math.round(delta_fill*100)/100) + ".");
    }
};

