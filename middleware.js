const fetch = require('node-fetch')
const { TIMINGS_DATA_POLLED, MATCH_DATA_POLLED, POLL } = require('./actions')
const { hasPhase, wait } = require('./utils')

let countTimingsPoll = 0
let firstServertime
let serverTimestamp

exports.logger = (store, action, next) => {
    next()
    if(action.type === TIMINGS_DATA_POLLED) {
        serverTimestamp = action.payload.server_datetime

        if (countTimingsPoll === 0) {
            firstServertime = serverTimestamp
        } 

        ++countTimingsPoll

        console.log('avg. poll: ', ((serverTimestamp - firstServertime) / countTimingsPoll ).toFixed(2) , ' count:', countTimingsPoll,' time:',new Date(serverTimestamp * 1000 ).toLocaleString())
    }
    // console.log(JSON.stringify(action, null, 2))
}

exports.poller = (store, action, next) => {
    
    next()
    if(action.type !== POLL) {
        return
    }
    
    
    wait(store.nextPollSeconds * 1000).then(_ => {
        pollTimings(store.dispatch)
        
        pollMatchData(store.channelsNextPoll.filter( hasPhase(6) ), store.dispatch)
        
        store.dispatch({type: POLL, payload: null})
    })
}

const pollTimings = async (dispatch) => {
    const timings = await fetch('https://betradar.com/vti/mobile/timings').then(req => req.json())
    dispatch({type: TIMINGS_DATA_POLLED, payload: timings})
}

const pollMatchData = async (channels, dispatch) => {
    if(channels.length === 0 ) {
        return
    }

    const matchesData = await Promise.all(
        channels.map(
            channel => 
            fetch(`https://vgls.betradar.com/vto/feeds/?/srvgdemonstratorvti/en/Europe:Berlin/gismo/vti_match_detailsextended/${channel['match_id'] }`)
                .then(req => req.json())
            ))
    
    dispatch({type: MATCH_DATA_POLLED, payload: matchesData})
}