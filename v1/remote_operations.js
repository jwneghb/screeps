var scouts = require('scouts');
var reservers = require('reservers');
var mining = require('new_mining');
var intel = require('intel');
var carriers = require('remote_carriers');
carriers.setup();

module.exports = {
    operate: remote_operations
};

function remote_operations (room_data) {
    var carrier_status = carriers.control();

    for (let i = 0; i < room_data.length; ++i) {
        operate(room_data[i], carrier_status[room_data[i].name]);
    }
}

function exempt_hostiles (creep, room_name) {
    return creep.owner.username == 'DoctorPC';
}

function operate (room_data, carrier_status) {

    var room = Game.rooms[room_data.name];
    var scout_ttl = scouts.control(room_data.name);
    if (room_data.reserve) var reserver_ttl = reservers.control(room_data.name);
    if (room_data.mining) var miner_ttl = mining.control(room_data.name);

    if (!room) {
        // ----- NO VISIBILITY -----

        // Do not keep spawning scouts into invaders / others
        var past_data = intel.get(room_data.name);
        if (past_data && past_data.creeps) {
            if (past_data.creeps.length > 0 && past_data.creeps.every((c) => c.owner == 'Invader')) {
                if (past_data.creeps[0].ttl - 20 + past_data.time > Game.time) {
                    return;
                }
            } else if (past_data.creeps.length > 0 && past_data.time + 200 > Game.time) {
                return;
            }
        }

        // ++ SCOUTING
        if (scout_ttl <= (room_data.scout.ttl || 0)) {
            // TODO: create & assign scout
            console.log(room_data.name + " - scout needed");
            room_data.spawn_callback(room_data.scout.body,
                (name) => scouts.assign(name, new RoomPosition(room_data.scout.x, room_data.scout.y, room_data.name)));
            return;
        }

    } else {
        // ----- HAVE VISIBILITY -----
        intel.gather(room);

        if (room.find(FIND_HOSTILE_CREEPS, {filter: (c) => !exempt_hostiles(c, room_data.name)}).length == 0) {
            // ----- NO HOSTILES -----

            // ++ RESERVING
            if (room_data.reserve) {
                var controller = room.controller;
                reservers.set_pos(controller.pos);
                if (!controller.reservation || controller.reservation.username != 'Jawnee' || controller.reservation.ticksToEnd < 4000) {
                    if (reserver_ttl == 0) {
                        // TODO: create & assign reserver
                        console.log(room_data.name + " - reserver needed");
                        room_data.spawn_callback(room_data.reserve.body, (name) => reservers.assign(name, room_data.name));
                        return;
                    }
                }
            }

            // ++ MINING
            if (room_data.mining) {
                if (!miner_ttl) {
                    mining.init(room, room_data.mining.container_placement);
                } else {
                    if (miner_ttl[0] <= (room_data.mining.miner_ttl || 0)) {
                        // TODO: create and assign miner
                        console.log(room_data.name + " - miner needed");
                        room_data.spawn_callback(room_data.mining.miner_body, (name) => mining.assign(Game.creeps[name], room_data.name));
                        return;
                    }

                    if (mining.fill(room_data.name) > room_data.mining.min_fill &&
                        (!carrier_status || carrier_status.creeps.length < room_data.mining.carriers)) {
                        // TODO: create and assign carrier
                        console.log(room_data.name + " - carrier needed");
                        room_data.spawn_callback(room_data.mining.carrier_body, (name) => carriers.assign(name, room_data.name, room_data.mining.home));
                        return;
                    }
                }
            }
        } else {
            console.log(room_data.name + " - hostiles detected");

        }
    }
}