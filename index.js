const {poller, logger} = require('./middleware')
const { TIMINGS_DATA_POLLED, MATCH_DATA_POLLED, POLL} = require('./actions')
const { sortByKey, hasActivePhaseEndDatetime } = require('./utils')


class StoreHandler {

    constructor (store) {
        this.middlewares = []
        this.reducers = []
        this.store = {...store, dispatch: this.dispatch.bind(this) }

        this.nextMiddleware = this.nextMiddleware.bind(this)
    }
    
    addMiddlewares (middlewares = []) {
        this.middlewares = middlewares.map((middleware, index) => 
            (store, action) => 
                middleware(store, action, () => this.nextMiddleware(store, action, index)) )
    }

    nextMiddleware (store, action, index) {
        if (this.middlewares[index + 1]) {
            this.middlewares[index + 1](store, action, this.nextMiddleware)
        }
    }

    addReducers (reducers = []) {
        this.reducers = reducers
    }

    dispatch (action) {
        if(this.middlewares.length) {
            this.middlewares[0](this.store, action)
        }

        this.reducers.forEach(reducer => this.store = reducer(this.store, action))
    }
}

const init = async () => {
    const store = { test: '1234', nextPollSeconds: 1, channelsNextPoll: [] }

    storeHandler = new StoreHandler(store)
    storeHandler.addMiddlewares([
        logger,
        poller,
    ])

    storeHandler.addReducers([
        pollerReducer,
    ])
    
    storeHandler.dispatch({type: POLL, payload: null})
}

const pollerReducer = (store = [], action) => {
    const {type, payload} = action
    
    switch(type) {
        case TIMINGS_DATA_POLLED: 
            return {...store, ...reduceTimings(payload)}
        case MATCH_DATA_POLLED: 
            return {...store, matches: reduceMatchData(payload)}
        default: 
            return store
    }
}

const reduceTimings = timingsData => {
    const serverTime = timingsData.server_datetime
    const nextPhaseChangeTimestamp = timingsData.channels
        .sort(sortByKey('active_phase_end_datetime'))[0]['active_phase_end_datetime']

    const nextPollSeconds = nextPhaseChangeTimestamp - serverTime || 1
    const channelsNextPoll = timingsData.channels
        .filter(hasActivePhaseEndDatetime('active_phase_end_datetime', nextPhaseChangeTimestamp))

    return ({
        serverTime,
        nextPhaseChangeTimestamp,
        nextPollSeconds,
        channelsNextPoll,
    })
}

const reduceMatchData = matchesData => {
    const matches = matchesData.map(matchData => matchData['doc'][0].data)

    return matches.map(match => (`${match.teams.home} vs. ${match.teams.away} -> UPDATE`))
}

init()