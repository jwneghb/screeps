var scouts = require('scouts');
var reservers = require('reservers');
var mining = require('new_mining');
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
        console.log('[' + room_data.name + '] No visibility');

        // ++ SCOUTING
        if (scout_ttl <= (room_data.scout.ttl || 0)) {
            // TODO: create & assign scout
            room_data.spawn_callback(room_data.scout.body,
                (name) => scouts.assign(name, new RoomPosition(room_data.scout.x, room_data.scout.y, room_data.name)));
            return;
        }

    } else {
        // ----- HAVE VISIBILITY -----

        if (room.find(FIND_HOSTILE_CREEPS, {filter: (c) => !exempt_hostiles(c, room_data.name)}).length == 0) {
            // ----- NO HOSTILES -----

            // ++ RESERVING
            if (room_data.reserve) {
                var controller = room.controller;
                if (!controller.reservation || controller.reservation.username != 'Jawnee' || controller.reservation.ticksToEnd < 4000) {
                    if (reserver_ttl == 0) {
                        // TODO: create & assign reserver
                        room_data.spawn_callback(room_data.reserve.body, (name) => reservers.assign(name, room_data.name));
                        console.log('[' + room_data.name + '] Reserver Needed');
                        return;
                    }
                }
            }

            // ++ MINING
            if (room_data.mining) {
                if (miner_ttl.length < room_data.mining.miners ||
                    miner_ttl.length == room_data.mining.miners && miner_ttl[0] <= (room_data.mining.miner_ttl || 0))
                {
                    // TODO: create and assign miner
                    room_data.spawn_callback(room_data.mining.miner_body, (name) => mining.assign(Game.creeps[name], room_data.name));
                    console.log('[' + room_data.name + '] Miner Needed');
                    return;
                }

                if (mining.fill(room_data.name) > room_data.mining.min_fill &&
                    (!carrier_status || carrier_status.creeps.length < room_data.mining.carriers))
                {
                    // TODO: create and assign carrier
                    room_data.spawn_callback(room_data.mining.carrier_body, (name) => carriers.assign(name, room_data.name, room_data.mining.home));
                    console.log('[' + room_data.name + '] Carrier Needed');
                    return;
                }

            }

        } else {
            console.log('[' + room_data.name + '] Hostiles detected!');
        }
    }
}