var sourceModule = {};
var tools = require('tools');
var mining = require('room_mining');
var mavg = require('moving_avg');

var EMGCY_CTRL_DOWNGRADE = 10000;

var HEAVY_WORKER_ROLE = 'heavy_worker';
var WORKER_ROLE = 'worker';
var WORKER_MODE_SUPPLY = 'supply';
var WORKER_MODE_REPAIR_STUFF = 'repair_stuff';
var WORKER_MODE_UPGRADE_CTRL = 'upgrade_ctrl';
var WORKER_MODE_BUILD = 'construct';
var WORKER_MODE_IDLE = 'idle';
var WORKER_MODE_DYING = 'dying';

var CTRL_LEVEL = 6;

var procedures = {
	supply: supply,
	repair_stuff: repair_stuff,
	upgrade_ctrl: upgrade_ctrl,
	idle: idle,
	construct: construct
};

var repair_walls_max = 2.0e6;
var repair_ramparts_max = 2.0e6;

var repair_comfort = 1e5;

var repair_walls = 6e5;
var repair_ramparts = 6e5;

function f_needs_repair(structure) {
    var decaying = [STRUCTURE_CONTAINER, STRUCTURE_ROAD];
    if (structure.structureType == STRUCTURE_WALL) {
        return Math.max(0, Math.min(repair_walls, structure.hitsMax) - structure.hits);
    } else if (structure.structureType == STRUCTURE_RAMPART) {
        return Math.max(0, Math.min(repair_ramparts, structure.hitsMax) - structure.hits);
    } else if (decaying.indexOf(structure.structureType) >= 0) {
        return Math.max(0, Math.ceil(structure.hitsMax * 0.75) - structure.hits);
    } else {
        return structure.hitsMax - structure.hits;
    }
}

function workerCost (parts) {
    var cost = 0;
    for (var i = 0; i < parts.length; ++i) {
        var p = parts[i];
        if (p == WORK) {
            cost += 100;
        } else if (p == CARRY) {
            cost += 50;
        } else if (p == MOVE) {
            cost += 50;
        }
    }
    return cost;
}

module.exports = {
    
    WORKER_ROLE: WORKER_ROLE,
    
    run: function (room, spawn) {
        repair_walls = tools.mvalue(room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_WALL}), {u: (s) => s.hits}) + 500;
        repair_ramparts = tools.mvalue(room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_RAMPART}), {u: (s) => s.hits}) + 500;
        
        repair_walls = Math.min(repair_ramparts, repair_walls, repair_walls_max);
        repair_ramparts = Math.min(repair_ramparts, repair_walls, repair_ramparts_max);
        
    	var workers = room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role == WORKER_ROLE && creep.memory.mode});
    	var heavy_workers = room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role == HEAVY_WORKER_ROLE && creep.memory.mode});
    	
    	var dying_soon = _.filter(workers, (w) => w.ticksToLive < 20).concat(_.filter(heavy_workers, (w) => w.ticksToLive < 20));
    	workers = _.filter(workers, (w) => w.ticksToLive >= 20);
    	heavy_workers = _.filter(heavy_workers, (w) => w.ticksToLive >= 20);
    	
    	for (var i in dying_soon) {
    	    dying_soon[i].memory.mode = WORKER_MODE_DYING;
    	}
    	
    	var damaged_structs = room.find(FIND_STRUCTURES, {filter: (s) => f_needs_repair(s) >= 100});
    	var damaged_below_comfort = _.filter(damaged_structs, (s) => s.hits < repair_comfort);
    	var damaged_above_comfort = _.filter(damaged_structs, (s) => s.hits >= repair_comfort);
    	var damage_total = tools.cumulate(damaged_below_comfort, {u: f_needs_repair}) / 100 + tools.cumulate(damaged_above_comfort, {u: f_needs_repair}) / 1000;

        var towers_that_need_supply = room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_TOWER && s.energy < s.energyCapacity - 100});
    	var tower_supply_total = tools.cumulate(towers_that_need_supply, {u: (s) => s.energyCapacity - s.energy}) / 200;
    	
    	var sites = room.find(FIND_MY_CONSTRUCTION_SITES);
    	var sites_const = tools.cumulate(sites, {u: (s) => s.progressTotal - s.progress}) / 5;
    	var sites_total = tools.cumulate(sites, {u: (s) => s.progressTotal == 1 ? 250 : s.progressTotal - s.progress}) / 5;
        
        var amt_of_work = damage_total + tower_supply_total + sites_total;
    	
    	var avg_work = mavg.log('work', amt_of_work, {subtitle: room.name});
    	
    	var work = Math.min(avg_work, amt_of_work);
    	
    	//console.log(damage_total, tower_supply_total, sites_total);
    	//console.log('work/worker', workers.length ? Math.floor(work / workers.length) : Infinity);
    	
    	if (!spawn.spawning) {
        	if (workers.length < 1 || (workers.length < 5 && Math.floor(work / workers.length) > 75)) {
        	    console.log('work/worker', workers.length ? Math.floor(work / workers.length) : Infinity);
        	    var max_energy = 600;
        	    if (Math.floor(work / Math.max(workers.length, 1)) > 100) {
        	        max_energy = 1000;
        	    }
        	    spawn.createCustomCreep(MEDIUM_WORKER, max_energy, {role: WORKER_ROLE, mode: WORKER_MODE_IDLE});
        	} else if (room.controller.level < CTRL_LEVEL && heavy_workers.length < 1) {
        	    var max_energy = mining.fill(room) > 25e3 ? 400 * 4 : 400 * 3;
        	    spawn.createCustomCreep(HEAVY_WORKER, max_energy, {role: HEAVY_WORKER_ROLE, mode: WORKER_MODE_UPGRADE_CTRL});
        	}
    	}
    	
    	var idle_workers = _.filter(workers, (creep) => creep.memory.mode == WORKER_MODE_IDLE);
    	
    	// emergencies
    	if (room.controller.ticksToDowngrade < EMGCY_CTRL_DOWNGRADE) {
    		var upgraders = _.filter(workers, (creep) => creep.memory.mode == WORKER_MODE_UPGRADE_CTRL);
    		if (upgraders.length == 0) {
    			if (idle_workers.length > 0) {
    				idle_workers.pop().memory.mode = WORKER_MODE_UPGRADE_CTRL;
    			} else {
    				var closest = room.controller.pos.findClosestByPath(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role == WORKER_ROLE && creep.carry.energy > 0});
    					
    				if (!closest) {
    				    closest = room.controller.pos.findClosestByPath(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role == WORKER_ROLE});
    				}
    				
    				if (closest) {
    					closest.memory.previous_mode = closest.memory.mode;
    					closest.memory.mode = WORKER_MODE_UPGRADE_CTRL;
    				} else {
    				    spawn.createCreep([WORK, CARRY, MOVE], undefined, {role: HEAVY_WORKER_ROLE, mode: WORKER_MODE_UPGRADE_CTRL});
    				}
    			}
    		}
    	}
    	
    	for (var i in heavy_workers) {
    	    heavy_workers[i].memory.mode = WORKER_MODE_UPGRADE_CTRL;
    	}
    	
    	if (idle_workers.length > 0) {
    	
        	var priorities = [];
        	
        	var supply_workers = _.filter(workers, (creep) => creep.memory.mode == WORKER_MODE_SUPPLY).length;
        	var repair_workers = _.filter(workers, (creep) => creep.memory.mode == WORKER_MODE_REPAIR_STUFF).length;
        	var builders = _.filter(workers, (creep) => creep.memory.mode == WORKER_MODE_BUILD).length;
        	
        	var spl = tower_supply_total + (room.energyCapacityAvailable - room.energyAvailable) / 200;
        	if (spl > 0) {
        	    if (supply_workers == 0) {
        	        priorities.push(WORKER_MODE_SUPPLY);
        	    } else {
        	        if (spl / supply_workers > 50) {
        	            priorities.push(WORKER_MODE_SUPPLY);
        	        }
        	    }
        	}
        	
        	if (damage_total > 0) {
        	    if (repair_workers == 0) {
        	        priorities.push(WORKER_MODE_REPAIR_STUFF);
        	    } else if (damage_total / repair_workers > 50) {
        	        priorities.push(WORKER_MODE_REPAIR_STUFF);
        	    }
        	}
        	
        	if (sites_const > 0) {
        	    if (builders == 0) {
        	        priorities.push(WORKER_MODE_BUILD)
        	    } else if (sites_const / builders > 50) {
        	        priorities.push(WORKER_MODE_BUILD)
        	    }
        	}
        	
        	if (priorities.length == 0 && spl > 0) priorities.push(WORKER_MODE_SUPPLY);
        	if (priorities.length == 0 && damage_total > 0) priorities.push(WORKER_MODE_REPAIR_STUFF);
        	if (priorities.length == 0 && sites_const > 0) priorities.push(WORKER_MODE_BUILD);
        	if (priorities.length == 0) priorities.push(WORKER_MODE_UPGRADE_CTRL);
        	
            var n = 0;
        	while (idle_workers.length > 0 && priorities.length > 0) {
        	    let worker = idle_workers.pop();
    	    	delete worker.memory.target;
    	    	worker.memory.mode = priorities.shift();
    	    	n++;
        	}
    	}
    	
    	for (var i in workers) {
    	    var creep = workers[i];
    	    if (creep.memory.mode == WORKER_MODE_IDLE) {
    	        idle(creep);
    	    } else {
    	        //creep.say(creep.memory.mode.substr(0, 3));
    	        if (collect(creep)) {
    	            procedures[creep.memory.mode](creep);
    	        }
		    }
    	}
    	
    	for (var i in heavy_workers) {
    	    var creep = heavy_workers[i];
    	    //creep.say(creep.memory.mode.substr(0, 3));
    		if (collect(creep)) {
    			procedures[creep.memory.mode](creep);
    		}
    	}
    	
    	for (var i in dying_soon) {
    	    var creep = dying_soon[i];
    	    creep.say("TTL: " + (creep.ticksToLive-1));
    	    idle(creep);
    	}
    }
};

function canCollectFrom(structure, amount) {
    if (structure.structureType == STRUCTURE_CONTAINER ||
        (structure.structureType == STRUCTURE_STORAGE && structure.my))
    {
        if (structure.store.energy >= amount) {
            return true;
        }
    }
    return false;
}

function collect(creep) {
    if (creep.memory.isCollecting) {
        if (creep.carry.energy == creep.carryCapacity) {
            creep.memory.isCollecting = false;
        }
    } else {
        if (creep.carry.energy == 0) {
            
            creep.memory.mode = WORKER_MODE_IDLE;
            creep.memory.isCollecting = true;
            
            var structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => canCollectFrom(s, creep.carryCapacity)});
            if (!structure) {
                structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => canCollectFrom(s, creep.carryCapacity / 2)});
            }
            if (!structure) {
                structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => canCollectFrom(s, 50)});
            }
            
            
            if (structure) {
                creep.memory.collectFrom = structure.id;
            } else {
                creep.memory.collectFrom = null;
            }
        }
    }
    
    if (creep.memory.isCollecting) {
        var structure = Game.getObjectById(creep.memory.collectFrom);
        if (structure) {
            if (creep.withdraw(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(structure);
            } else {
                if (creep.carry.energy == creep.carryCapacity || structure.store.energy == 0) {
                    creep.memory.isCollecting = false;
                }
            }
        } else {
            creep.memory.isCollecting = false;
        }
    }
    
    return !creep.memory.isCollecting;
}

function harvestStatus(creep) {
	if (creep.memory.isHarvesting) {
		if(creep.carry.energy == creep.carryCapacity) {
		    if (creep.memory.source) {
		        if (sourceModule.managed(creep.memory.source)) {
		            var wait_at = sourceModule.wait_at(creep.memory.source);
		            if (!creep.pos.inRangeTo(wait_at.x, wait_at.y, 1)) {
		                creep.moveTo(wait_at.x, wait_at.y);
		                return false;
		            } else {
		                sourceModule.release_slot(creep.memory.source, creep.id);
		            }
		        }
		    }
			creep.memory.isHarvesting = false;
			delete creep.memory.source;
		    delete creep.memory.ticket;
		    creep.memory.canHarvest = false;
        }
	} else {
		if(creep.carry.energy == 0) {
			creep.memory.isHarvesting = true;
			creep.memory.target = null;
		}
	}
	
	if (creep.memory.isHarvesting) {
		harvest(creep);
	}
	
	return !creep.memory.isHarvesting;
}

function source_eval(creep, source) {
    var factor = 0;
    if (sourceModule.managed(source.id)) {
        factor = sourceModule.eta(source.id, creep.carryCapacity - creep.carry.energy);
    } else {
        factor = 30;
    }
    factor += creep.pos.findPathTo(source).length;
    return factor;
}

function harvest(creep) {
    if (creep.memory.canHarvest) {
        creep.harvest(Game.getObjectById(creep.memory.source));
    } else {
        if (creep.memory.source) {
            if (sourceModule.managed(creep.memory.source)) {
                if (creep.memory.ticket) {
                    //creep.say(creep.memory.ticket.spot);
                    if (creep.memory.ticket.spot == 0) {
                        if (creep.pos.inRangeTo(creep.memory.ticket.x, creep.memory.ticket.y, 0)) {
                            creep.memory.canHarvest = true;
                        } else {
                            if (creep.moveTo(creep.memory.ticket.x, creep.memory.ticket.y) == ERR_NO_PATH) {
                                //creep.say('no path');
                                if (Math.abs(creep.pos.x - creep.memory.ticket.x) <= 1 && Math.abs(creep.pos.y - creep.memory.ticket.y) <= 1) {
                                    var blocker = creep.room.lookForAt('creep', creep.memory.ticket.x, creep.memory.ticket.y);
                                    if (blocker && blocker.length > 0) {
                                        //console.log('blocked by', blocker[0].name);
                                    }
                                }
                            }
                        }
                    } else {
                        creep.moveTo(creep.memory.ticket.x, creep.memory.ticket.y);
                        creep.memory.ticket = sourceModule.request_slot(creep.memory.source, creep.id);
                    }
                } else {
                    var wait_at = sourceModule.wait_at(creep.memory.source);
                    if (creep.pos.inRangeTo(wait_at.x, wait_at.y, 1)) {
                        creep.memory.ticket = sourceModule.request_slot(creep.memory.source, creep.id);
                        if (creep.memory.ticket) {
                            harvest(creep);
                        }
                    } else {
                        creep.moveTo(wait_at.x, wait_at.y);
                    }
                }
            } else {
                var s = Game.getObjectById(creep.memory.source);
                if (creep.harvest(s) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(s);
                }
            }
        } else {
            delete creep.memory.ticket;
            
            // TEMPORARY
            //creep.memory.source = '577b92ec0f9d51615fa47608';
            //harvest(creep);
            //return;
            // /TEMPORARY
            
            if (creep.memory.mode == WORKER_MODE_UPGRADE_CTRL) {
                
                var src = creep.room.controller.pos.findClosestByPath(FIND_SOURCES);
                if (src) {
                    creep.memory.source = src.id;
                    harvest(creep);
                    return;
                }
                
            }
            
            var sources = creep.room.find(FIND_SOURCES);
            if (sources.length > 0) {
            	var s = [];
            	for (var i = 0; i < sources.length; ++i) {
            	    s.push(source_eval(creep, sources[i]));
            	}
            	
            	creep.memory.source = sources[s.indexOf(Math.min(...s))].id;
            	harvest(creep);
            }
        }
    }
}

function selectRandomId(list) {
	if (list.length > 0) {
		return list[Math.floor(Math.random() * list.length)].id;
	} else {
		return null;
	}
}

function supply(creep) {
	var supplyable = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_CONTAINER];
	
	if (!creep.memory.target) {
	    creep.memory.target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES,
			{filter: (s) =>  supplyable.indexOf(s.structureType) >= 0 && s.energy < s.energyCapacity});
		
		/*	
	    var targets = creep.room.find(FIND_MY_STRUCTURES,
			{filter: (s) =>  supplyable.indexOf(s.structureType) >= 0 && s.energy < s.energyCapacity});
		creep.memory.target = selectRandomId(targets);
		*/
	}
	
	if (!creep.memory.target) {
		creep.memory.mode = WORKER_MODE_IDLE;
	} else {
		var structure = Game.getObjectById(creep.memory.target);
		if (structure) {
			if (structure.energy == structure.energyCapacity) {
				creep.memory.target = null;
				creep.memory.mode = WORKER_MODE_IDLE;
			} else if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
				creep.moveTo(structure);
			}
		} else {
			var targets = creep.room.find(FIND_MY_STRUCTURES,
			    {filter: (s) =>  supplyable.indexOf(s.structureType) >= 0 && s.energy < s.energyCapacity});
		    creep.memory.target = selectRandomId(targets);
		    if (creep.memory.target) {
			    supply(creep)
		    }
		}
	}
}

function repair_stuff(creep) {
    if (!creep.memory.target || !(creep.memory.ticks > 0)) {
        var target = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => f_needs_repair(s) >= 100});
		if (target) {
		    creep.memory.target = target.id;
		    creep.memory.ticks = 10;
		} else {
		    creep.memory.target = null;
		    creep.memory.ticks = 0;
		}
    }
    
    if (creep.memory.target) {
        var target = Game.getObjectById(creep.memory.target);
        if (target) {
            if (target.hits <= target.hitsMax - 100) {
                if(creep.pos.inRangeTo(target, 2)) {
        	        creep.repair(target);
        	        creep.memory.ticks -= 1;
        	    } else {
        	        creep.moveTo(target);
        	    }
        	    return;
            }
        }
    }
    creep.memory.mode = WORKER_MODE_IDLE;
    creep.memory.target = null;
    creep.memory.ticks = 0;
}

function upgrade_ctrl(creep) {
    if (! (creep.memory.ticks > 0)) {
        creep.memory.ticks = 10;
    }
    
	ctrl = creep.room.controller;
	if (ctrl) {
		if (ctrl.level < CTRL_LEVEL || ctrl.ticksToDowngrade < EMGCY_CTRL_DOWNGRADE) {
		    if (creep.room.name == 'W42N24') {
		        if (creep.pos.inRangeTo(11, 22, 1)) {
		            creep.upgradeController(ctrl);
		            
		            creep.memory.ticks -= 1;
			        if (! (creep.memory.ticks > 0)) {
			            creep.memory.mode = WORKER_MODE_IDLE;
			        }
			        
		        } else {
		            creep.moveTo(11, 22);
		        }
		    } else {
			    if (creep.upgradeController(ctrl) == ERR_NOT_IN_RANGE) {
				    creep.move(ctrl);
			    } else {
			        
			        creep.memory.ticks -= 1;
			        if (! (creep.memory.ticks > 0)) {
			            creep.memory.mode = WORKER_MODE_IDLE;
			        }
			        
			    }
		    }
		} else {
			if (creep.memory.previous_mode) {
				creep.memory.mode = creep.memory.previous_mode;
				delete creep.memory.previous_mode;
			} else {
				creep.memory.mode = WORKER_MODE_IDLE;
			}
		}
	}
}

function construct(creep) {
	if (!creep.memory.target) {
	    var target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
	    if (target) {
		    creep.memory.target = target.id;
	    } else {
	        creep.memory.target = null;
	    }
	}
	
	if (!creep.memory.target) {
		creep.memory.mode = WORKER_MODE_IDLE;
	} else {
		var site = Game.getObjectById(creep.memory.target);
		if (site) {
		    var e = creep.build(site);
			if (e == ERR_NOT_IN_RANGE) {
				creep.moveTo(site);
			} else if (e == ERR_INVALID_TARGET) {
			    creep.memory.target = null;
			}
		} else {
			var targets = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
			creep.memory.target = selectRandomId(targets);
		}
	}
}

function my_min(list, project) {
    if (list.length == 0) {
        return undefined;
    }
    var min = list[0];
    for (var i = 1; i < list.length; ++i) {
        if (project(min) > project(list[i])) min = list[i];
    }
    return min;
}

function idle(creep) {
    if (creep.carry.energy > 0) {
        var s = creep.room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_STORAGE});
        if (s.length > 0) {
            if (creep.transfer(s[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(s[0]);
            }
        }
    } else {
        creep.moveTo(4, 35);
    }
}