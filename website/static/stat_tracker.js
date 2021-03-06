//The stat object to hold everything we are tracking
var stats = {};

//Gets the desired pool stats stored in our cache
var getPoolStats = function(key) {
    return stats['p_' + key];
}

//Gets the desired worker stats stored in our cache
var getWorkerStats = function(address) {
    return stats['w_' + address];
}

//Adds a worker to the stat tracker
var addWorkerToTracker = function(statData, workerData, address, callback) {
    if (stats['w_' + address]) {
        updateWorkerData(statData, workerData, address, callback);
    } else {
        buildWorkerData(statData, workerData, address, callback);
    }
}

//Adds a pool to the stat tracker
var addPoolToTracker = function(poolData, poolName, callback) {
    
    if (stats['p_' + poolName]) {
        updatePoolData(poolData, poolName, callback);
    } else {
        buildPoolData(poolData, poolName, callback);
    }
}

/*
  Updates the stat cache at the given key.
  @param key the stat key to update
  @param value the value to update stat with
  @param index the index in our stat object to set value for
*/
var update = function(key, value, index = 0) {
    var stats = stats[key];
    if (stats) {
        var statsValues = stats.values[index];
        if (statsValues) {
            statsValues.shift();
            statsValues.push(value);
        }
    }
}

//builds the initial stat data object for a worker
var buildWorkerData = function(statData, workerData, address, callback = null) {
    if (!address || !workerData) {
        return;
    }
    var account = {
        paid: workerData.paid,
        balance: workerData.balances,
        hashrate: workerData?.hashrate,
        poolHashrate: workerData?.totalHash*2,
        shares: workerData?.totalShares,
        currRoundShares: 0,
        symbol: '',
        pool: '',
        poolSize: workerData?.workers.length,
        currRoundPoolShares: workerData?.totalShares,
        invalidShares: 0,
        miners: {},
        blocksFound:{},
	trash: 0
    };
    $.getJSON('/api/stats', function(data) {
        for (var p in data.pools) {
            for (var w in data.pools[p].workers) {
                var fullWorkerName = w;
                var worker = getWorkerNameFromAddress(w);
                if (w.split(".")[0] === _miner) {
                    var a = account.miners[w] = (account.miners[worker] || {
                        key: worker,
                        paid: data.pools[p].workers[w].paid,
                        balance: data.pools[p].workers[w].paid,
                        hashrate: data.pools[p].workers[w].hashRate,
                        validShares: data.pools[p].workers[w].shares,
                        currRoundShares: data.pools[p].workers[w].currRoundShares,
                        invalidShares: data.pools[p].workers[w].invalidshares,
                        blocksFound: data.pools[p]?.blocks?.blocksFound[fullWorkerName],
			            trash: 0
                    });
                    account.invalidShares += data.pools[p].workers[w].invalidshares;
                    account.currRoundShares += data.pools[p].workers[w].currRoundShares;
                    account.hashrate += data.pools[p].workers[w].hashrate;
                    if (account.symbol.length < 1) {
                        account.symbol = data.pools[p].symbol;
                        account.poolSize = data.pools[p].workers ? Object.keys(data.pools[p].workers).length : 0;
                        account.pool = p;
                    }
                }
            }
        }
        if (data.pools[account.pool] && data.pools[account.pool].workers) {
            for (var w in data.pools[account.pool].workers) {
                account.poolHashrate += data.pools[account.pool].workers[w].hashrate;
                account.currRoundPoolShares += data.pools[account.pool].workers[w].currRoundShares;
            //    account.blocksFound += data.pools[account.pool].blocksFound[w];
                
            }
        }
        for (var w in workerData.history) {
            var worker = getWorkerNameFromAddress(w);
          //  console.log(data.pools[account.pool]?.blocks?.blocksFound[w])
            var a = account.miners[w] = (account.miners[worker] || {
                key: worker,
                paid: 0,
                balance: 0,
                hashrate: [],
                validShares: 0,
                currRoundShares: 0,
                invalidShares: 0,
                blocksFound: data.pools[account.pool]?.blocks?.blocksFound[w],
		        trash: 0
            });
            for (var wh in workerData.history[w]) {
                a.hashrate.push([workerData.history[w][wh].time * 1000, workerData.history[w][wh].hashrate]);
//                a.hashrate.push([workerData.history[w][wh].time * 1000, workerData.history[w][wh].blocksFound]);
            }
        }
        var key = 'w_' + address;
        stats[key] = account;
        if (callback != null) {
            callback();
        }
    });
}

//builds the initial stat data object for a pool
var buildPoolData = function(statData, poolName, callback = null) {
    if (!poolName || !statData) {
        return;
    }
    $.getJSON('/api/pool_stats', function(data) {
        var pool = {
            hashrate: [],
            averagedHashrate: [],
            workers: [],
            averagedWorkers: [],
            blocks: [],
	        networkDiff: [],
            averagednetworkDiff: [],
            averagednetworkSols: [],
	        networkSols: []

        };
        var totalHashrate = 0;
        var totalWorkers = 0;
        var totalnetworkSols = 0;
        var totalnetworkDiff = 0;
        var count = 0;

        for (var i = 0; i < statData.length; i++) {
            var time = statData[i].time * 1000;
            if (!statData[i].pools) {
                continue;
            }
            if (poolName in statData[i].pools) {
                var hash = statData[i].pools[poolName].hashrate;
                var workers = statData[i].pools[poolName].workerCount;
		        var networkDiff = statData[i].pools[poolName].networkDiff;
		        var networkSols = statData[i].pools[poolName].networkSols;
                totalHashrate += hash;
                totalWorkers += workers;
                totalnetworkSols += networkSols;
                totalnetworkDiff += networkDiff;
                count++;
                
                var averaged = (totalHashrate > 0 && count > 1) ? totalHashrate / count : hash;
              //  console.log('Tracker.averaged: '+ averaged)
                var averagedWorkers = (totalWorkers > 0 && count > 1) ? totalWorkers / count : workers;

                var averagednetworkSols = (totalnetworkSols > 0 && count > 1) ? totalnetworkSols / count : networkSols;
            //    var averagednetworkDiff = (totalnetworkDiff > 0 && count > 1) ? totalnetworkDiff / count : networkDiff;
                


                pool.hashrate.push([time, hash]);
		        pool.networkSols.push([time, statData[i].pools[poolName].networkSols]);
                pool.averagedHashrate.push([time, averaged]);
                pool.workers.push([time, workers]);
                pool.averagedWorkers.push([time, averagedWorkers]);
                pool.blocks.push([time, statData[i].pools[poolName].blocks.pending])
		        pool.networkDiff.push([time, networkDiff]);
           //     pool.averagednetworkDiff.push([time, averagednetworkDiff]);
              //  pool.averagednetworkSols.push([time, averagednetworkSols]);
            } else {
                pool.hashrate.push([time, 0]);
		        pool.networkSols.push([time, 0]);
                pool.workers.push([time, 0]);
                pool.averagedWorkers.push([time, 0]);
                pool.blocks.push([time, 0]);
		        pool.networkDiff.push([time, 0]);
            //    pool.averagedHashrate.push([time, 0]);
           //     pool.averagednetworkDiff.push([time, 0]);
             //   pool.averagednetworkSols.push([time, 0]);
            }
        }
        
        var key = 'p_' + poolName;
        stats[key] = pool;
        if (callback != null) {
            callback();
        }
    });
}

//updates stat data objects for pools stored within the cache
var updatePoolData = function(statData, poolName, callback = null) {
    
    var pool = stats['p_' + poolName];
    if (pool) {
        var time = statData.time * 1000;
        if (poolName in statData.pools) {
            var hash = statData.pools[poolName].hashrate;
            pool.hashrate.push([time, statData.pools[poolName].hashrate]);
	        pool.networkSols.push([time, statData.pools[poolName].networkSols]);
            pool.networkDiff.push([time, statData.pools[poolName].networkDiff]);
            pool.averagedHashrate.push([time, pool.hashrate.reduce(function(sum, val) {
                return sum[1] + val[1];
            }) / pool.hashrate.length]);
            pool.workers.push([time, statData.pools[poolName].workerCount]);
            pool.blocks.push([time, statData.pools[poolName].blocks.pending]);
        } else {
            pool.hashrate.push([time, 0]);
	        pool.networkSols.push([time, 0]);
            pool.workers.push([time, 0]);
            pool.blocks.push([time, 0]);
	        pool.networkDiff.push([time, 0]);
        }
        if (callback != null) {
            callback(pool);
        }
    } else {
        buildPoolData(statData, poolName, callback);
    }
}

//updates stat data objects for workers stored within the cache
var updateWorkerData = function(statData, workerData, address, callback = null) {
    //TODO
}

function getWorkerNameFromAddress(w) {
    var worker = w;
    if (w.split(".").length > 1) {
        worker = w.split(".")[1];
        if (worker == null || worker.length < 1) {
            worker = "noname";
        }
    } else {
        worker = "noname";
    }
    return worker;
}
