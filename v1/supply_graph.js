class MyNode {
    constructor() {
        this.flag = 0;
        this.adjacent_path = [];
    }
}

class SinkNode extends MyNode {
    constructor(id) {
        super();
        this.id = id;
    }

    get deficit() {
        let o = Game.getObjectById(this.id);
        return o.energyCapacity - o.energy;
    }
}

class PathNode extends MyNode {
    constructor() {
        super();
        this.adjacent_sink = [];
    }
}

function forAdjacent(adjacency, graph, x, y, nodefun) {
    adjacency.forEach(function (d) {
        let node = undefined;
        let dir = get_dir(d);
        if (x !== undefined && y !== undefined && graph !== undefined) {
            if (graph[x + dir.dx] !== undefined) {
                node = graph[x + dir.dx][y + dir.dy];
            }
        }
        nodefun(node, dir);
    });
}

const MS = 'SUPGv2';

module.exports = {
    build_graph: build_graph,
    update_graph: updateGraph
};

function get_dir(d) {
    return directions[d - 1];
}

function dir_by_delta(dx, dy) {
    if (dx > 0) {
        if (dy > 0) {
            return BOTTOM_RIGHT;
        } else if (dy < 0) {
            return TOP_RIGHT;
        } else {
            return RIGHT;
        }
    } else if (dx < 0) {
        if (dy > 0) {
            return BOTTOM_LEFT;
        } else if (dy < 0) {
            return TOP_LEFT;
        } else {
            return LEFT;
        }
    } else {
        if (dy > 0) {
            return BOTTOM;
        } else if (dy < 0) {
            return TOP;
        } else {
            return undefined;
        }
    }
}

const directions = [
    {fwd: TOP, rev: BOTTOM, dx: 0, dy: -1},
    {fwd: TOP_RIGHT, rev: BOTTOM_LEFT, dx: 1, dy: -1},
    {fwd: RIGHT, rev: LEFT, dx: 1, dy: 0},
    {fwd: BOTTOM_RIGHT, rev: TOP_LEFT, dx: 1, dy: 1},
    {fwd: BOTTOM, rev: TOP, dx: 0, dy: 1},
    {fwd: BOTTOM_LEFT, rev: TOP_RIGHT, dx: -1, dy: 1},
    {fwd: LEFT, rev: RIGHT, dx: -1, dy: 0},
    {fwd: TOP_LEFT, rev: BOTTOM_RIGHT, dx: -1, dy: -1}
];

const walkable = [STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_RAMPART];

function isSink (s) {
    return s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION;
}

function build_graph(room) {
    var sinks = room.find(FIND_MY_STRUCTURES, {filter: isSink});

    var sink_pos = {};
    var graph = {sinks: {}, paths: {}};
    var votes = {};

    // Step 1: All sinks cast votes for adjacent, walkable, non-sink tiles.
    // Votes for tiles that are non-walkable or occupied by sinks are set to 0.
    for (let i = 0; i < sinks.length; ++i) {
        let sink = sinks[i];
        let x = sink.pos.x;
        let y = sink.pos.y;

        sink_pos[sink.id] = {x: x, y: y};

        if (graph.sinks[x] == undefined) graph.sinks[x] = {};
        graph.sinks[x][y] = new SinkNode(sink.id);

        directions.forEach(function (dir) {
            let px = x + dir.dx;
            let py = y + dir.dy;

            if (graph.sinks[px] !== undefined) {
                if (graph.sinks[px][py] !== undefined) {
                    return;
                }
            }

            if (votes[px] === undefined) votes[px] = {};

            if (votes[px][py] === undefined) {
                let terrain = room.lookForAt(LOOK_TERRAIN, px, py);
                if (terrain == 'plain' || terrain == 'swamp') {
                    let structures = room.lookForAt(LOOK_STRUCTURES, px, py);
                    if (structures.every((s) => walkable.indexOf(s.structureType) >= 0)) {
                        votes[px][py] = 1;
                        return;
                    }
                }
                votes[px][py] = 0;
            } else {
                if (votes[px][py] > 0) votes[px][py] += 1;
            }
        });
    }

    let new_paths = 0;

    // Step 2: Create vertices for tiles that have received at least 3 votes.
    // Establish adjacency for sink-path, and path-path pairs.
    graphLoop(votes, function (n, x, y) {

        // Remove zero vote entries.
        if (n == 0) {
            delete votes[x][y];
            if (Object.keys(votes[x]).length == 0) delete votes[x];
            return;
        }

        if (n < 3) return;

        let node = new PathNode();
        node.flag = 2;

        let accessible = false;

        directions.forEach(function (dir) {
            let px = x + dir.dx;
            let py = y + dir.dy;

            // Mark this tile as accessible if any neighbor tile has a non-zero amount of votes.
            if (!accessible && votes[px] !== undefined && votes[px][py] > 0) accessible = true;

            if (graph.sinks[px] !== undefined) {
                let sink = graph.sinks[px][py];
                if (sink !== undefined) {
                    node.adjacent_sink.push(dir.fwd);
                    return;
                }
            }
            if (graph.paths[px] !== undefined) {
                let path = graph.paths[px][py];
                if (path !== undefined) {
                    node.adjacent_path.push(dir.fwd);
                }
            }
        });

        if (accessible) {

            forAdjacent(node.adjacent_path, graph.paths, x, y, function(path, dir2) {
                path.adjacent_path.push(dir2.rev);
            });
            forAdjacent(node.adjacent_sink, graph.sinks, x, y, function(sink, dir2) {
                sink.adjacent_path.push(dir2.rev);
                delete sink_pos[sink.id];
            });

            if (graph.paths[x] === undefined) graph.paths[x] = {};
            graph.paths[x][y] = node;

            new_paths += 1;

        } else {

            // If the path is inaccessible, delete vote, to avoid rechecking this tile in further steps.
            delete votes[x][y];
        }
    });

    let frontier = [];
    let new_frontier = [];

    // Step 3: Incrementally add paths that are adjacent to sinks that are currently not reachable
    // and are adjacent to paths that are already in the graph.
    while (new_paths > 0) {

        new_frontier.forEach(function(pos) {
            graph.paths[pos.x][pos.y].flag = 2;
        });

        frontier = new_frontier;
        new_frontier = [];
        frontier = [];
        new_paths = 0;

        for (let id in sink_pos) {
            let pos = sink_pos[id];
            let x = pos.x;
            let y = pos.y;
            directions.forEach(function (dir) {
                let px = x + dir.dx;
                let py = y + dir.dy;
                if (votes[px] === undefined || votes[px][py] === undefined) return;
                let node = new PathNode();

                if (frontier.length == 0 || frontier.length > 8) {

                    // Find path vertices in the nodes neighborhood.
                    // If any of them are pre-existing (3 votes or more, as denoted by flag == 2),
                    // This node should be added to the graph (denoted by flag == 1).
                    directions.forEach(function (dir2) {
                        let ppx = px + dir2.dx;
                        let ppy = py + dir2.dy;
                        if (graph.paths[ppx] !== undefined) {
                            let path = graph.paths[ppx][ppy];
                            if (path !== undefined) {
                                node.adjacent_path.push(dir2.fwd);
                                if (path.flag == 2) node.flag = 1;
                            }
                        }
                    });

                } else {

                    frontier.forEach(function (pos) {
                        let dx = pos.x - px;
                        let dy = pos.y - py;
                        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                            let dir = get_dir(dir_by_delta(dx, dy));
                            node.adjacent_path.push(dir.fwd);
                            node.flag = 1;
                        }

                    });
                }

                // Find sink neighbors, establish adjacency with these as well as path neighbors and
                // finally add the node to the graph.
                if (node.flag == 1) {

                    directions.forEach(function (dir3) {
                        let ppx = px + dir3.dx;
                        let ppy = py + dir3.dy;
                        if (graph.sinks[ppx] !== undefined) {
                            let sink = graph.sinks[ppx][ppy];
                            if (sink !== undefined) {
                                node.adjacent_sink.push(dir3.fwd);
                                sink.adjacent_path.push(dir3.rev);
                            }
                        }
                    });

                    forAdjacent(node.adjacent_path, graph.paths, px, py, function(path, dir4) {
                        path.adjacent_path.push(dir4.rev);
                    });

                    if (graph.paths[px] === undefined) graph.paths[px] = {};
                    graph.paths[px][py] = node;
                    delete(sink_pos[id]);

                    new_frontier.push({x: px, y: py});
                    new_paths += 1;
                }
            });
        }
    }

    graphLoop(graph.paths, function(v) {
        v.adjacent_path.sort();
        v.adjacent_sink.sort();
    });

    graphLoop(graph.sinks, function(v) {
        v.adjacent_path.sort();
    });

    if (!Memory[MS]) Memory[MS] = {};
    Memory[MS][room.name] = graph;
}

function graphLoop(graph, nodefun) {
    for (let sx in graph) {
        let x = parseInt(sx);
        for (let sy in graph[sx]) {
            let y = parseInt(sy);
            let v = graph[sx][sy];
            if (nodefun(v, x, y) === 0) return;
        }
    }
}

function updateGraph (room) {
    if (!Memory[MS]) return;
    if (!Memory[MS][room.name]) return;

    var graph = Memory[MS][room.name];

    // Flag usage:
    // Paths: 13 bits total
    // bit 0...3 : {
    //     before tree creation:
    //         bit 0...2 : number of sinks in need of energy.
    //         bit     3 : essential path (adjacent sink is only reachable via this path)
    //     after tree creation:
    //         bit 0...3 : parent direction (1 - 8) or 0 for no parent
    // }
    // bit     4 : visited during tree creation
    // bit 5..12 : children (e.g. flag & (1 << (TOP + 4)) > 0 means child in TOP direction exists)

    // Sinks: 4 bit total
    // bit 0...3 : direction of path, initially 0

    // Clear the lowest 13 bits of the path flags.
    graphLoop(graph.paths, function (v) {
        v.flag &= 0xffffe000;
    });

    // Clear the lowest 4 bits of the sink flags.
    graphLoop(graph.sinks, function (v) {
        v.flag &= 0xfffffff0;
    });

    let sink_pos = {};
    let paths = [];

    // Step 1: All sinks that have a deficit vote for all adjacent paths.
    // If a sink that has only one adjacent path the 'essential' flag of that path is set.
    // Upon receiving the first vote, the paths' position is added to the 'paths' list.
    room.find(FIND_MY_STRUCTURES, {filter: (s) => isSink(s) && s.energy < s.energyCapacity}).forEach(function (s) {
        let x = s.pos.x;
        let y = s.pos.y;
        sink_pos[s.id] = {x: x, y: y};
        let v = graph.sinks[x][y];
        let essential = v.adjacent_path.length == 1;
        v.adjacent_path.forEach(function (d) {
            let dir = get_dir(d);
            let px = x + dir.dx, py = y + dir.dy;
            let path = graph.paths[px][py];
            if ((path.flag & 0xf) == 0) paths.push({x: px, y: py});
            path.flag += 1;
            if (essential) path.flag |= 0x10;
        });
    });

    graph.roots = [];
    let get_value = function(path) {
        return graph.paths[path.x][path.y].flag & 0x1f;
    };

    while (paths.length > 0) {

        let max = 0, k = 0, idx = -1;
        for (let i = 0; i < paths.length; ++i) {
            let cur = get_value(paths[k]);
            if (cur & 0x10 == 0) {
                if (idx < 0 || cur > max) {
                    idx = k;
                    max = cur;
                }
                k ++;
            } else {
                paths.splice(k, 1);
            }
        }

        if (idx >= 0) {
            let flag = paths.splice(idx, 1)[0];
            if (createTree(graph, flag.x, flag.y, null)) {
                graph.roots.push({x: flag.x, y: flag.y});
            }
        }
    }

    Memory[MS][room.name] = graph;
}

function createTree(graph, x, y, p) {
    let non_empty = false;
    let node = graph.paths[x][y];
    if ((node.flag & 0x10) == 0 && (node.flag & 0b111) > 0) {

        // clear flag and set visited bit to true
        node.flag &= 0xffffe000;
        node.flag |= 0x10;

        if (p != null) {
            node.flag |= p;
        }

        non_empty = true;
        forAdjacent(node.adjacent_sink, graph.sinks, x, y, function (sink, dir) {
            if ((sink.flag & 0xf) == 0 && sink.deficit > 0) {
                sink.flag |= dir.rev;
                forAdjacent(sink.adjacent_path, graph.paths, x + dir.dx, y + dir.dy, function (path) {
                    if ((path.flag & 0x10) == 0) path.flag -= 1;
                });
            }
        });
        forAdjacent(node.adjacent_path, graph.paths, x, y, function (path, dir) {
            if(createTree(graph, x + dir.dx, y + dir.dy, dir.rev)) {
                node.flag |= (1 << (dir.fwd + 4));
            }
        });
    }
    return non_empty;
}