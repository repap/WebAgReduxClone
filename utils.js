exports.sortByKey = key => (a, b) => a[key] - b[key]

exports.filterByKeyAndValue = (key, value) => e => e[key] === value

exports.hasPhase = phaseId => obj => obj['phase'] === phaseId 

exports.hasActivePhaseEndDatetime = 
    timestamp => obj => obj['active_phase_end_datetime'] === timestamp 

exports.wait = duration => new Promise((resolve, reject) => setTimeout(resolve, duration))